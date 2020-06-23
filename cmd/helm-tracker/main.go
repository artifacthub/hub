package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/pkg"
	"github.com/artifacthub/hub/internal/repo"
	"github.com/artifacthub/hub/internal/tracker"
	"github.com/artifacthub/hub/internal/util"
	"github.com/rs/zerolog/log"
)

func main() {
	// Setup configuration and logger
	cfg, err := util.SetupConfig("helm-tracker")
	if err != nil {
		log.Fatal().Err(err).Msg("configuration setup failed")
	}
	fields := map[string]interface{}{
		"cmd": "helm-tracker",
	}
	if err := util.SetupLogger(cfg, fields); err != nil {
		log.Fatal().Err(err).Msg("logger setup failed")
	}

	// Shutdown gracefully when SIGINT or SIGTERM signal is received
	log.Info().Int("pid", os.Getpid()).Msg("helm tracker started")
	ctx, cancel := context.WithCancel(context.Background())
	shutdown := make(chan os.Signal, 1)
	signal.Notify(shutdown, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-shutdown
		cancel()
		log.Info().Msg("helm tracker shutting down..")
	}()

	// Setup internal services required
	db, err := util.SetupDB(cfg)
	if err != nil {
		log.Fatal().Err(err).Msg("database setup failed")
	}
	il := &repo.HelmIndexLoader{}
	rm := repo.NewManager(db)
	pm := pkg.NewManager(db)
	is, err := util.SetupImageStore(cfg, db)
	if err != nil {
		log.Fatal().Err(err).Msg("image store setup failed")
	}

	// Get repositories to process
	repos, err := tracker.GetRepositories(cfg, rm, hub.Helm)
	if err != nil {
		log.Fatal().Err(err).Send()
	}

	// Launch dispatcher and workers and wait for them to finish
	var wg sync.WaitGroup
	ec := tracker.NewDBErrorsCollector(ctx, rm, repos)
	dispatcher := NewDispatcher(ctx, cfg, il, rm, ec)
	wg.Add(1)
	go dispatcher.Run(&wg, repos)
	hc := &http.Client{Timeout: 10 * time.Second}
	for i := 0; i < cfg.GetInt("tracker.numWorkers"); i++ {
		w := NewWorker(ctx, i, pm, is, ec, hc)
		wg.Add(1)
		go w.Run(&wg, dispatcher.Queue)
	}
	wg.Wait()
	ec.Flush()
	log.Info().Msg("helm tracker finished")
}
