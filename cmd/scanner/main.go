package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"os/signal"
	"strings"
	"sync"
	"syscall"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/pkg"
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

	// Setup services
	db, err := util.SetupDB(cfg)
	if err != nil {
		log.Fatal().Err(err).Msg("database setup failed")
	}
	pm := pkg.NewManager(db)
	if _, err := exec.LookPath("trivy"); err != nil {
		log.Fatal().Err(err).Msg("trivy not found")
	}

	// Scan pending snapshots
	trivyURL := cfg.GetString("scanner.trivyURL")
	if trivyURL == "" {
		log.Fatal().Err(err).Msg("trivy url not set")
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
		go func(s *hub.SnapshotToScan) {
			defer wg.Done()

			logger := log.With().Str("pkg", s.PackageID).Str("version", s.Version).Logger()
			logger.Info().Msg("scanning snapshot")
			report, err := scanSnapshot(ctx, s, trivyURL)
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
	log.Info().Msg("scanner finished")
}

// scanSnapshot scans the provided package's snapshot for security
// vulnerabilities returning a report with the results.
func scanSnapshot(ctx context.Context, s *hub.SnapshotToScan, trivyURL string) (*hub.SnapshotSecurityReport, error) {
	full := make(map[string][]interface{})

	for _, image := range s.ContainersImages {
		parts := strings.Split(image.Image, ":")
		if len(parts) == 1 || parts[1] == "latest" {
			continue
		}

		cmd := exec.CommandContext(ctx, "trivy", "client", "--quiet", "--remote", trivyURL, "-f", "json", image.Image) // #nosec
		var stdout, stderr bytes.Buffer
		cmd.Stdout = &stdout
		cmd.Stderr = &stderr
		if err := cmd.Run(); err != nil {
			if strings.Contains(stderr.String(), "Cannot connect to the Docker daemon") {
				continue
			}
			return nil, fmt.Errorf("error running trivy on image %s: %w: %s", image.Image, err, stderr.String())
		}
		var imageFullReport []interface{}
		if err := json.Unmarshal(stdout.Bytes(), &imageFullReport); err != nil {
			return nil, fmt.Errorf("error unmarshalling image %s full report: %w", image.Image, err)
		}
		if imageFullReport != nil {
			full[image.Image] = imageFullReport
		}
	}
	var summary *hub.SecurityReportSummary
	if len(full) > 0 {
		summary = generateSummary(full)
	}

	return &hub.SnapshotSecurityReport{
		PackageID: s.PackageID,
		Version:   s.Version,
		Full:      full,
		Summary:   summary,
	}, nil
}

// generateSummary generates a summary of the security report from the full
// report
func generateSummary(full map[string][]interface{}) *hub.SecurityReportSummary {
	summary := &hub.SecurityReportSummary{}
	for _, targets := range full {
		for _, entry := range targets {
			var target *Target
			entryJSON, err := json.Marshal(entry)
			if err != nil {
				continue
			}
			if err := json.Unmarshal(entryJSON, &target); err != nil {
				continue
			}
			for _, vulnerability := range target.Vulnerabilities {
				switch vulnerability.Severity {
				case "CRITICAL":
					summary.Critical++
				case "HIGH":
					summary.High++
				case "MEDIUM":
					summary.Medium++
				case "LOW":
					summary.Low++
				case "UNKNOWN":
					summary.Unknown++
				}
			}
		}
	}
	return summary
}

// Target represents a target in a security report.
type Target struct {
	Vulnerabilities []*Vulnerability `json:"Vulnerabilities"`
}

// Vulnerability represents a vulnerability in a security report target.
type Vulnerability struct {
	Severity string `json:"Severity"`
}
