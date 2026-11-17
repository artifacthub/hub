package main

import (
	"context"
	"errors"
	"os"
	"os/exec"
	"os/signal"
	"runtime/debug"
	"sync"
	"syscall"

	"github.com/artifacthub/hub/internal/authz"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/pkg"
	"github.com/artifacthub/hub/internal/repo"
	"github.com/artifacthub/hub/internal/scanner"
	"github.com/artifacthub/hub/internal/util"
	"github.com/rs/zerolog/log"
	"github.com/spf13/viper"
)

func main() {
	// Setup configuration and logger
	cfg, err := util.SetupConfig("scanner")
	if err != nil {
		log.Fatal().Err(err).Msg("configuration setup failed")
	}
	setCfgDefaults(cfg)
	fields := map[string]interface{}{"cmd": "scanner"}
	if err := util.SetupLogger(cfg, fields); err != nil {
		log.Fatal().Err(err).Msg("logger setup failed")
	}

	// Apply the address restrictions to the default transports, if enabled
	if err := util.SetupDefaultTransports(cfg.GetBool("restrictedHTTPClient")); err != nil {
		log.Fatal().Err(err).Msg("default transports setup failed")
	}

	// Shutdown gracefully when SIGINT or SIGTERM signal is received
	log.Info().Int("pid", os.Getpid()).Msg("scanner started")
	ctx, cancel := context.WithCancel(context.Background())
	shutdown := make(chan os.Signal, 1)
	signal.Notify(shutdown, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-shutdown
		cancel()
		log.Info().Msg("scanner shutting down..")
	}()

	// Check required external tools are available
	if _, err := exec.LookPath("trivy"); err != nil {
		log.Fatal().Err(err).Msg("trivy not found")
	}

	// Setup services
	db, err := util.SetupDB(cfg)
	if err != nil {
		log.Fatal().Err(err).Msg("database setup failed")
	}
	az, err := authz.NewAuthorizer(db)
	if err != nil {
		log.Fatal().Err(err).Msg("authorizer setup failed")
	}
	hc := util.SetupHTTPClient(cfg.GetBool("restrictedHTTPClient"), util.HTTPClientDefaultTimeout)
	rm := repo.NewManager(cfg, db, az, hc)
	pm := pkg.NewManager(db)
	ec := repo.NewErrorsCollector(rm, repo.Scanner)
	s := scanner.New(ctx, cfg, ec)

	// Scan pending snapshots
	snapshots, err := pm.GetSnapshotsToScan(ctx)
	if err != nil {
		log.Fatal().Err(err).Msg("error getting snapshots to scan")
	}
	if len(snapshots) > 0 {
		// Nothing is scanned if the scanner cannot be prepared, the snapshots
		// remain due for next run
		if err := s.Prepare(); err != nil && !errors.Is(err, scanner.ErrScanCanceled) {
			log.Fatal().Err(err).Msg("error preparing scanner")
		}
	}
	limiter := make(chan struct{}, cfg.GetInt("scanner.concurrency"))
	var wg sync.WaitGroup
L:
	for _, sn := range snapshots {
		select {
		case <-ctx.Done():
			break L
		default:
		}

		limiter <- struct{}{}
		wg.Add(1)
		go func(snapshot *hub.SnapshotToScan) {
			defer wg.Done()
			defer func() { <-limiter }()

			logger := log.With().Str("pkg", snapshot.PackageID).Str("version", snapshot.Version).Logger()
			logger.Info().Msg("scanning snapshot")

			defer func() {
				if r := recover(); r != nil {
					logger.Error().Bytes("stacktrace", debug.Stack()).Interface("recover", r).Send()
				}
			}()

			report, err := s.Scan(snapshot)
			if scanner.IsPending(err) {
				// Keep the existing report, the snapshot remains due for next run
				logger.Warn().Err(err).Send()
				return
			}
			if err != nil {
				// Keep the existing report, as a stale report is better than
				// none and replacing it would make the next successful scan
				// alert again about known vulnerabilities. The snapshot is
				// scanned again following the usual schedule.
				logger.Error().Err(err).Send()
				if err := pm.RegisterSnapshotSecurityScanFailure(ctx, snapshot.PackageID, snapshot.Version); err != nil {
					logger.Error().Err(err).Msg("error registering snapshot security scan failure")
				}
				return
			}
			if err := pm.UpdateSnapshotSecurityReport(ctx, report); err != nil {
				logger.Error().Err(err).Msg("error updating snapshot security report")
			}
		}(sn)
	}
	wg.Wait()
	ec.Flush()
	if err := s.Close(); err != nil {
		log.Error().Err(err).Msg("error closing scanner")
	}
	log.Info().Msg("scanner finished")
}

// setCfgDefaults sets the default values for some configuration options.
func setCfgDefaults(cfg *viper.Viper) {
	cfg.SetDefault("scanner.concurrency", 1)
	cfg.SetDefault("scanner.maxImageSize", int64(4<<30))
	cfg.SetDefault("scanner.trivyURL", "http://localhost:8081")
}
