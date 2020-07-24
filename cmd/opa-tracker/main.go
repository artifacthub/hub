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
)

func main() {
	// Setup configuration and logger
	cfg, err := util.SetupConfig("opa-tracker")
	if err != nil {
		log.Fatal().Err(err).Msg("configuration setup failed")
	}
	fields := map[string]interface{}{
		"cmd": "opa-tracker",
	}
	if err := util.SetupLogger(cfg, fields); err != nil {
		log.Fatal().Err(err).Msg("logger setup failed")
	}

	// Shutdown gracefully when SIGINT or SIGTERM signal is received
	log.Info().Int("pid", os.Getpid()).Msg("opa tracker started")
	ctx, cancel := context.WithCancel(context.Background())
	shutdown := make(chan os.Signal, 1)
	signal.Notify(shutdown, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-shutdown
		cancel()
		log.Info().Msg("opa tracker shutting down..")
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

	// Track registered OPA repositories
	repos, err := tracker.GetRepositories(cfg, rm, hub.OPA)
	if err != nil {
		log.Fatal().Err(err).Send()
	}
	ec := tracker.NewDBErrorsCollector(ctx, rm, repos)
	limiter := make(chan struct{}, cfg.GetInt("tracker.concurrency"))
	var wg sync.WaitGroup
	for _, r := range repos {
		limiter <- struct{}{}
		wg.Add(1)
		w := NewTracker(ctx, cfg, r, rm, pm, is, ec)
		go func(r *hub.Repository) {
			if err := w.Track(&wg); err != nil {
				ec.Append(r.RepositoryID, err)
				w.Logger.Err(err).Send()
			}
			<-limiter
		}(r)
	}
	wg.Wait()
	ec.Flush()
	log.Info().Msg("opa tracker finished")
}
