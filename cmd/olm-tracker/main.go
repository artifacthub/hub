package main

import (
	"context"
	"os"
	"os/signal"
	"sync"
	"syscall"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/pkg"
	"github.com/artifacthub/hub/internal/repo"
	"github.com/artifacthub/hub/internal/tracker"
	"github.com/artifacthub/hub/internal/util"
	"github.com/rs/zerolog/log"
	"golang.org/x/time/rate"
)

func main() {
	// Setup configuration and logger
	cfg, err := util.SetupConfig("olm-tracker")
	if err != nil {
		log.Fatal().Err(err).Msg("configuration setup failed")
	}
	fields := map[string]interface{}{
		"cmd": "olm-tracker",
	}
	if err := util.SetupLogger(cfg, fields); err != nil {
		log.Fatal().Err(err).Msg("logger setup failed")
	}

	// Shutdown gracefully when SIGINT or SIGTERM signal is received
	log.Info().Int("pid", os.Getpid()).Msg("olm tracker started")
	ctx, cancel := context.WithCancel(context.Background())
	shutdown := make(chan os.Signal, 1)
	signal.Notify(shutdown, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-shutdown
		cancel()
		log.Info().Msg("olm tracker shutting down..")
	}()

	// Setup internal services required
	db, err := util.SetupDB(cfg)
	if err != nil {
		log.Fatal().Err(err).Msg("database setup failed")
	}
	rm := repo.NewManager(db)
	pm := pkg.NewManager(db)
	is, err := util.SetupImageStore(cfg, db)
	if err != nil {
		log.Fatal().Err(err).Msg("image store setup failed")
	}

	// Track registered OLM repositories
	repos, err := tracker.GetRepositories(cfg, rm, hub.OLM)
	if err != nil {
		log.Fatal().Err(err).Send()
	}
	ec := tracker.NewDBErrorsCollector(ctx, rm, repos)
	concurrency := cfg.GetInt("tracker.concurrency")
	limiter := rate.NewLimiter(rate.Limit(concurrency), concurrency)
	var wg sync.WaitGroup
	for _, r := range repos {
		_ = limiter.Wait(ctx)
		wg.Add(1)
		w := NewTracker(ctx, cfg, r, rm, pm, is, ec)
		go func(r *hub.Repository) {
			if err := w.Track(&wg); err != nil {
				ec.Append(r.RepositoryID, err)
				w.Logger.Err(err).Send()
			}
		}(r)
	}
	wg.Wait()
	ec.Flush()
	log.Info().Msg("olm tracker finished")
}
