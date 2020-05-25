package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/artifacthub/hub/internal/chartrepo"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/pkg"
	"github.com/artifacthub/hub/internal/util"
	"github.com/rs/zerolog/log"
	"github.com/spf13/viper"
)

func main() {
	// Setup configuration and logger
	cfg, err := util.SetupConfig("chart-tracker")
	if err != nil {
		log.Fatal().Err(err).Msg("configuration setup failed")
	}
	fields := map[string]interface{}{
		"cmd": "chart-tracker",
	}
	if err := util.SetupLogger(cfg, fields); err != nil {
		log.Fatal().Err(err).Msg("logger setup failed")
	}

	// Shutdown gracefully when SIGINT or SIGTERM signal is received
	log.Info().Int("pid", os.Getpid()).Msg("chart tracker started")
	ctx, cancel := context.WithCancel(context.Background())
	shutdown := make(chan os.Signal, 1)
	signal.Notify(shutdown, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-shutdown
		cancel()
		log.Info().Msg("chart tracker shutting down..")
	}()

	// Setup internal services required
	db, err := util.SetupDB(cfg)
	if err != nil {
		log.Fatal().Err(err).Msg("database setup failed")
	}
	il := &chartrepo.IndexLoader{}
	rm := chartrepo.NewManager(db)
	pm := pkg.NewManager(db)
	is, err := util.SetupImageStore(cfg, db)
	if err != nil {
		log.Fatal().Err(err).Msg("image store setup failed")
	}

	// Get chart repositories to process
	repos, err := getChartRepositories(cfg, rm)
	if err != nil {
		log.Fatal().Err(err).Send()
	}

	// Launch dispatcher and workers and wait for them to finish
	var wg sync.WaitGroup
	ec := NewDBErrorsCollector(ctx, rm, repos)
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
	log.Info().Msg("chart tracker finished")
}

// getChartRepositories gets the details of the chart repositories the chart
// tracker will process.
func getChartRepositories(cfg *viper.Viper, rm hub.ChartRepositoryManager) ([]*hub.ChartRepository, error) {
	reposNames := cfg.GetStringSlice("tracker.repositoriesNames")
	var repos []*hub.ChartRepository
	if len(reposNames) > 0 {
		for _, name := range reposNames {
			repo, err := rm.GetByName(context.Background(), name)
			if err != nil {
				return nil, fmt.Errorf("error getting chart repository %s: %w", name, err)
			}
			repos = append(repos, repo)
		}
	} else {
		var err error
		repos, err = rm.GetAll(context.Background())
		if err != nil {
			return nil, fmt.Errorf("error getting all chart repositories: %w", err)
		}
	}
	return repos, nil
}
