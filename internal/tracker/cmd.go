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
	"github.com/spf13/viper"
)

// Run starts a tracker cmd.
func Run(newTracker New, cmdName string, repositoryKind hub.RepositoryKind) error {
	// Setup configuration and logger
	cfg, err := util.SetupConfig(cmdName)
	if err != nil {
		return fmt.Errorf("configuration setup failed: %w", err)
	}
	fields := map[string]interface{}{
		"cmd": cmdName,
	}
	if err := util.SetupLogger(cfg, fields); err != nil {
		return fmt.Errorf("logger setup failed: %w", err)
	}

	// Shutdown gracefully when SIGINT or SIGTERM signal is received
	log.Info().Int("pid", os.Getpid()).Msg(fmt.Sprintf("%s started", cmdName))
	ctx, cancel := context.WithCancel(context.Background())
	shutdown := make(chan os.Signal, 1)
	signal.Notify(shutdown, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-shutdown
		cancel()
		log.Info().Msg(fmt.Sprintf("%s shutting down..", cmdName))
	}()

	// Setup services
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
	repos, err := getRepositories(cfg, rm, repositoryKind)
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
	log.Info().Msg(fmt.Sprintf("%s finished", cmdName))

	return nil
}

// getRepositories gets the repositories a tracker cmd will process. If a list
// of repositories names is found in the configuration provided, those will be
// the repositories returned provided they are found. If no repositories names
// are found in the configuration, all the repositories of the kind provided
// will be returned.
func getRepositories(
	cfg *viper.Viper,
	rm hub.RepositoryManager,
	kind hub.RepositoryKind,
) ([]*hub.Repository, error) {
	reposNames := cfg.GetStringSlice("tracker.repositoriesNames")
	var repos []*hub.Repository
	if len(reposNames) > 0 {
		for _, name := range reposNames {
			repo, err := rm.GetByName(context.Background(), name)
			if err != nil {
				return nil, fmt.Errorf("error getting repository %s: %w", name, err)
			}
			repos = append(repos, repo)
		}
	} else {
		var err error
		repos, err = rm.GetByKind(context.Background(), kind)
		if err != nil {
			return nil, fmt.Errorf("error getting repositories by kind: %w", err)
		}
	}
	return repos, nil
}
