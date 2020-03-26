package main

import (
	"context"
	"os"
	"os/signal"
	"sync"
	"syscall"

	"github.com/artifacthub/hub/internal/api"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/util"
	"github.com/rs/zerolog/log"
)

func main() {
	// Setup configuration and logger
	cfg, err := util.SetupConfig("chart-tracker")
	if err != nil {
		log.Fatal().Err(err).Msg("Configuration setup failed")
	}
	fields := map[string]interface{}{
		"cmd": "chart-tracker",
	}
	if err := util.SetupLogger(cfg, fields); err != nil {
		log.Fatal().Err(err).Msg("Logger setup failed")
	}

	// Shutdown gracefully when SIGINT or SIGTERM signal is received
	log.Info().Int("pid", os.Getpid()).Msg("Chart tracker started")
	ctx, cancel := context.WithCancel(context.Background())
	shutdown := make(chan os.Signal, 1)
	signal.Notify(shutdown, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-shutdown
		cancel()
		log.Info().Msg("Chart tracker shutting down..")
	}()

	// Setup hub api and image store instances
	db, err := util.SetupDB(cfg)
	if err != nil {
		log.Fatal().Err(err).Msg("Database setup failed")
	}
	hubAPI := api.New(db, nil)
	imageStore, err := util.SetupImageStore(cfg, db)
	if err != nil {
		log.Fatal().Err(err).Msg("ImageStore setup failed")
	}

	// Get chart repositories to process
	reposNames := cfg.GetStringSlice("tracker.repositoriesNames")
	var repos []*hub.ChartRepository
	if len(reposNames) > 0 {
		for _, name := range reposNames {
			repo, err := hubAPI.ChartRepositories.GetByName(context.Background(), name)
			if err != nil {
				log.Error().Err(err).Str("name", name).Msg("Error getting chart repository")
				continue
			}
			repos = append(repos, repo)
		}
	} else {
		var err error
		repos, err = hubAPI.ChartRepositories.GetAll(context.Background())
		if err != nil {
			log.Fatal().Err(err).Msg("Error getting chart repositories")
		}
	}

	// Launch dispatcher and workers and wait for them to finish
	var wg sync.WaitGroup
	ec := newErrorsCollector(ctx, hubAPI, repos)
	dispatcher := newDispatcher(ctx, ec, hubAPI)
	wg.Add(1)
	go dispatcher.run(&wg, repos)
	for i := 0; i < cfg.GetInt("tracker.numWorkers"); i++ {
		w := newWorker(ctx, i, ec, hubAPI, imageStore)
		wg.Add(1)
		go w.run(&wg, dispatcher.Queue)
	}
	wg.Wait()
	ec.flush()
	log.Info().Msg("Chart tracker finished")
}
