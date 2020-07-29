package tracker

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"sync"
	"syscall"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/pkg"
	"github.com/artifacthub/hub/internal/repo"
	"github.com/artifacthub/hub/internal/util"
	"github.com/rs/zerolog/log"
)

// Run starts a tracker cmd.
func Run(newTracker New, name string, kind hub.RepositoryKind) error {
	// Setup configuration and logger
	cfg, err := util.SetupConfig(name)
	if err != nil {
		return fmt.Errorf("configuration setup failed: %w", err)
	}
	fields := map[string]interface{}{
		"cmd": name,
	}
	if err := util.SetupLogger(cfg, fields); err != nil {
		return fmt.Errorf("logger setup failed: %w", err)
	}

	// Shutdown gracefully when SIGINT or SIGTERM signal is received
	log.Info().Int("pid", os.Getpid()).Msg(fmt.Sprintf("%s started", name))
	ctx, cancel := context.WithCancel(context.Background())
	shutdown := make(chan os.Signal, 1)
	signal.Notify(shutdown, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-shutdown
		cancel()
		log.Info().Msg(fmt.Sprintf("%s shutting down..", name))
	}()

	// Setup services required
	db, err := util.SetupDB(cfg)
	if err != nil {
		return fmt.Errorf("database setup failed: %w", err)
	}
	rm := repo.NewManager(db)
	pm := pkg.NewManager(db)
	is, err := util.SetupImageStore(cfg, db)
	if err != nil {
		return fmt.Errorf("image store setup failed: %w", err)
	}
	repos, err := GetRepositories(cfg, rm, kind)
	if err != nil {
		return fmt.Errorf("error getting repositories: %w", err)
	}
	ec := NewDBErrorsCollector(ctx, rm, repos)
	svc := &Services{
		Ctx: ctx,
		Cfg: cfg,
		Rm:  rm,
		Pm:  pm,
		Is:  is,
		Ec:  ec,
	}

	// Track registered repositories
	limiter := make(chan struct{}, cfg.GetInt("tracker.concurrency"))
	var wg sync.WaitGroup
	for _, r := range repos {
		limiter <- struct{}{}
		wg.Add(1)
		t := newTracker(svc, r)
		go func(r *hub.Repository) {
			if err := t.Track(&wg); err != nil {
				ec.Append(r.RepositoryID, err)
				log.Err(err).Str("repo", r.Name).Send()
			}
			<-limiter
		}(r)
	}
	wg.Wait()
	ec.Flush()
	log.Info().Msg(fmt.Sprintf("%s finished", name))

	return nil
}
