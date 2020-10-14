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

	"github.com/artifacthub/hub/internal/authz"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/pkg"
	"github.com/artifacthub/hub/internal/repo"
	"github.com/artifacthub/hub/internal/tracker"
	"github.com/artifacthub/hub/internal/tracker/falco"
	"github.com/artifacthub/hub/internal/tracker/helm"
	"github.com/artifacthub/hub/internal/tracker/olm"
	"github.com/artifacthub/hub/internal/tracker/opa"
	"github.com/artifacthub/hub/internal/util"
	"github.com/rs/zerolog/log"
	"github.com/spf13/viper"
)

func main() {
	// Setup configuration and logger
	cfg, err := util.SetupConfig("tracker")
	if err != nil {
		log.Fatal().Err(err).Msg("configuration setup failed")
	}
	fields := map[string]interface{}{"cmd": "tracker"}
	if err := util.SetupLogger(cfg, fields); err != nil {
		log.Fatal().Err(err).Msg("logger setup failed")
	}

	// Shutdown gracefully when SIGINT or SIGTERM signal is received
	log.Info().Int("pid", os.Getpid()).Msg("tracker started")
	ctx, cancel := context.WithCancel(context.Background())
	shutdown := make(chan os.Signal, 1)
	signal.Notify(shutdown, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-shutdown
		cancel()
		log.Info().Msg("tracker shutting down..")
	}()

	// Setup services
	db, err := util.SetupDB(cfg)
	if err != nil {
		log.Fatal().Err(err).Msg("database setup failed")
	}
	az, err := authz.NewAuthorizer(db)
	if err != nil {
		log.Fatal().Err(err).Msg("authorizer setup failed")
	}
	rm := repo.NewManager(cfg, db, az)
	pm := pkg.NewManager(db)
	is, err := util.SetupImageStore(cfg, db)
	if err != nil {
		log.Fatal().Err(err).Msg("image store setup failed")
	}
	repos, err := getRepositories(cfg, rm)
	if err != nil {
		log.Fatal().Err(err).Msg("error getting repositories")
	}
	ec := tracker.NewDBErrorsCollector(ctx, rm, repos)
	svc := &tracker.Services{
		Ctx: ctx,
		Cfg: cfg,
		Rm:  rm,
		Pm:  pm,
		Is:  is,
		Ec:  ec,
		Hg:  &http.Client{Timeout: 10 * time.Second},
	}

	// Track registered repositories
	cfg.SetDefault("tracker.concurrency", 1)
	limiter := make(chan struct{}, cfg.GetInt("tracker.concurrency"))
	var wg sync.WaitGroup
	for _, r := range repos {
		limiter <- struct{}{}
		wg.Add(1)
		var t tracker.Tracker
		switch r.Kind {
		case hub.Falco:
			t = falco.NewTracker(svc, r)
		case hub.Helm:
			t = helm.NewTracker(svc, r)
		case hub.OLM:
			t = olm.NewTracker(svc, r)
		case hub.OPA:
			t = opa.NewTracker(svc, r)
		}
		go func(r *hub.Repository) {
			log.Info().Str("repo", r.Name).Str("kind", hub.GetKindName(r.Kind)).Msg("tracking repository")
			if err := t.Track(&wg); err != nil {
				ec.Append(r.RepositoryID, err)
				log.Err(err).Str("repo", r.Name).Interface("kind", r.Kind).Send()
			}
			<-limiter
		}(r)
	}
	wg.Wait()
	ec.Flush()
	log.Info().Msg("tracker finished")
}

// getRepositories gets the repositories the tracker will process based on the
// configuration provided:
//
// - If a list of repositories names, those will be the repositories returned
//   provided they are found.
// - If a list of repositories kinds is provided, all repositories of those
//   kinds will be returned.
// - Otherwise, all the repositories will be returned.
//
func getRepositories(
	cfg *viper.Viper,
	rm hub.RepositoryManager,
) ([]*hub.Repository, error) {
	reposNames := cfg.GetStringSlice("tracker.repositoriesNames")
	reposKinds := cfg.GetStringSlice("tracker.repositoriesKinds")

	var repos []*hub.Repository
	if len(reposNames) > 0 {
		for _, name := range reposNames {
			repo, err := rm.GetByName(context.Background(), name)
			if err != nil {
				return nil, fmt.Errorf("error getting repository %s: %w", name, err)
			}
			repos = append(repos, repo)
		}
	} else if len(reposKinds) > 0 {
		for _, kindName := range reposKinds {
			kind, err := hub.GetKindFromName(kindName)
			if err != nil {
				return nil, fmt.Errorf("invalid repository kind found in config: %s", kindName)
			}
			kindRepos, err := rm.GetByKind(context.Background(), kind)
			if err != nil {
				return nil, fmt.Errorf("error getting repositories by kind (%s): %w", kindName, err)
			}
			repos = append(repos, kindRepos...)
		}
	} else {
		var err error
		repos, err = rm.GetAll(context.Background())
		if err != nil {
			return nil, fmt.Errorf("error getting all repositories: %w", err)
		}
	}
	return repos, nil
}
