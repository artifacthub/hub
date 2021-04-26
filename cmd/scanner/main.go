package main

import (
	"context"
	"os"
	"os/exec"
	"os/signal"
	"sync"
	"syscall"

	"github.com/artifacthub/hub/internal/authz"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/pkg"
	"github.com/artifacthub/hub/internal/repo"
	"github.com/artifacthub/hub/internal/scanner"
	"github.com/artifacthub/hub/internal/util"
	"github.com/rs/zerolog/log"
)

func main() {
	// Setup configuration and logger
	cfg, err := util.SetupConfig("scanner")
	if err != nil {
		log.Fatal().Err(err).Msg("configuration setup failed")
	}
	fields := map[string]interface{}{"cmd": "scanner"}
	if err := util.SetupLogger(cfg, fields); err != nil {
		log.Fatal().Err(err).Msg("logger setup failed")
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
	hc := util.SetupHTTPClient(cfg.GetBool("restrictedHTTPClient"))
	rm := repo.NewManager(cfg, db, az, hc)
	pm := pkg.NewManager(db)
	ec := repo.NewErrorsCollector(rm, repo.Scanner)

	// Scan pending snapshots
	trivyURL := cfg.GetString("scanner.trivyURL")
	if trivyURL == "" {
		log.Fatal().Err(err).Msg("trivy url not set")
	}
	trivyScanner := &scanner.TrivyScanner{
		Ctx: ctx,
		Cfg: cfg,
		URL: trivyURL,
	}
	snapshots, err := pm.GetSnapshotsToScan(ctx)
	if err != nil {
		log.Fatal().Err(err).Msg("error getting snapshots to scan")
	}
	cfg.SetDefault("scanner.concurrency", 1)
	limiter := make(chan struct{}, cfg.GetInt("scanner.concurrency"))
	var wg sync.WaitGroup
L:
	for _, s := range snapshots {
		select {
		case <-ctx.Done():
			break L
		default:
		}

		limiter <- struct{}{}
		wg.Add(1)
		go func(snapshot *hub.SnapshotToScan) {
			defer wg.Done()

			logger := log.With().Str("pkg", snapshot.PackageID).Str("version", snapshot.Version).Logger()
			logger.Info().Msg("scanning snapshot")
			report, err := scanner.ScanSnapshot(ctx, trivyScanner, snapshot, ec)
			if err != nil {
				logger.Error().Err(err).Send()
			}
			if err := pm.UpdateSnapshotSecurityReport(ctx, report); err != nil {
				logger.Error().Err(err).Send()
			}

			<-limiter
		}(s)
	}
	wg.Wait()
	ec.Flush()
	log.Info().Msg("scanner finished")
}
