package main

import (
	"context"
	"net/http"
	"os"
	"os/exec"
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
	"github.com/artifacthub/hub/internal/tracker/generic"
	"github.com/artifacthub/hub/internal/tracker/helm"
	"github.com/artifacthub/hub/internal/tracker/olm"
	"github.com/artifacthub/hub/internal/util"
	"github.com/rs/zerolog/log"
	"golang.org/x/time/rate"
)

const githubMaxRequestsPerHour = 5000

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

	// Check required external tools are available
	if _, err := exec.LookPath("opm"); err != nil {
		log.Fatal().Err(err).Msg("opm not found")
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
	rm := repo.NewManager(cfg, db, az)
	pm := pkg.NewManager(db)
	is, err := util.SetupImageStore(cfg, db)
	if err != nil {
		log.Fatal().Err(err).Msg("image store setup failed")
	}
	repos, err := tracker.GetRepositories(ctx, cfg, rm)
	if err != nil {
		log.Fatal().Err(err).Msg("error getting repositories")
	}
	ec := tracker.NewDBErrorsCollector(rm, repos)
	githubRL := rate.NewLimiter(rate.Every(1*time.Hour), githubMaxRequestsPerHour)
	go func() {
		<-time.After(1 * time.Hour)
		githubRL.SetLimit(rate.Every(1 * time.Hour / githubMaxRequestsPerHour))
	}()
	svc := &tracker.Services{
		Ctx:      ctx,
		Cfg:      cfg,
		Rm:       rm,
		Pm:       pm,
		Is:       is,
		Ec:       ec,
		Hc:       &http.Client{Timeout: 10 * time.Second},
		GithubRL: githubRL,
	}

	// Track registered repositories
	cfg.SetDefault("tracker.concurrency", 1)
	limiter := make(chan struct{}, cfg.GetInt("tracker.concurrency"))
	var wg sync.WaitGroup
L:
	for _, r := range repos {
		select {
		case <-ctx.Done():
			break L
		default:
		}

		limiter <- struct{}{}
		wg.Add(1)
		go func(r *hub.Repository) {
			defer func() {
				<-limiter
				wg.Done()
			}()
			var t tracker.Tracker
			switch r.Kind {
			case hub.Falco:
				t = falco.NewTracker(svc, r)
			case hub.Helm:
				t = helm.NewTracker(svc, r)
			case hub.OLM:
				t = olm.NewTracker(svc, r)
			case hub.OPA:
				t = generic.NewTracker(svc, r)
			}
			if err := tracker.TrackRepository(ctx, cfg, rm, t, r); err != nil {
				svc.Ec.Append(r.RepositoryID, err)
				log.Error().Err(err).Str("repo", r.Name).Str("kind", hub.GetKindName(r.Kind)).Send()
			}
		}(r)
	}
	wg.Wait()
	ec.Flush()
	log.Info().Msg("tracker finished")
}
