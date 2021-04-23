package main

import (
	"context"
	"errors"
	"os"
	"os/exec"
	"os/signal"
	"runtime/debug"
	"sync"
	"syscall"
	"time"

	"github.com/artifacthub/hub/internal/authz"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/pkg"
	"github.com/artifacthub/hub/internal/repo"
	"github.com/artifacthub/hub/internal/tracker"
	"github.com/artifacthub/hub/internal/util"
	"github.com/rs/zerolog/log"
	"golang.org/x/time/rate"
)

const (
	githubMaxRequestsPerHourUnauthenticated = 60
	githubMaxRequestsPerHourAuthenticated   = 5000
	repositoryTimeout                       = 5 * time.Minute
)

var (
	errTimeout = errors.New("repository tracking timed out")
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
	hc := util.SetupHTTPClient(cfg.GetBool("restrictedHTTPClient"))
	rm := repo.NewManager(cfg, db, az, hc)
	pm := pkg.NewManager(db)
	githubMaxRequestsPerHour := githubMaxRequestsPerHourUnauthenticated
	if cfg.GetString("creds.githubToken") != "" {
		githubMaxRequestsPerHour = githubMaxRequestsPerHourAuthenticated
	}
	githubRL := rate.NewLimiter(rate.Every(1*time.Hour), githubMaxRequestsPerHour)
	go func() {
		<-time.After(1 * time.Hour)
		githubRL.SetLimit(rate.Every(1 * time.Hour / time.Duration(githubMaxRequestsPerHour)))
	}()
	is, err := util.SetupImageStore(cfg, db, hc, githubRL)
	if err != nil {
		log.Fatal().Err(err).Msg("image store setup failed")
	}
	ec := repo.NewErrorsCollector(rm, repo.Tracker)
	svc := &hub.TrackerServices{
		Ctx:                ctx,
		Cfg:                cfg,
		Rm:                 rm,
		Pm:                 pm,
		Rc:                 &repo.Cloner{},
		Oe:                 &repo.OLMOCIExporter{},
		Ec:                 ec,
		Hc:                 hc,
		Is:                 is,
		GithubRL:           githubRL,
		SetupTrackerSource: tracker.SetupSource,
	}

	// Track registered repositories
	repos, err := tracker.GetRepositories(ctx, cfg, rm)
	if err != nil {
		log.Fatal().Err(err).Msg("error getting repositories")
	}
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
			logger := log.With().Str("repo", r.Name).Str("kind", hub.GetKindName(r.Kind)).Logger()
			done := make(chan struct{})
			go func() {
				defer func() {
					done <- struct{}{}
				}()
				defer func() {
					if r := recover(); r != nil {
						logger.Error().Bytes("stacktrace", debug.Stack()).Interface("recover", r).Send()
					}
				}()
				t := tracker.New(svc, r, logger)
				if err := t.Run(); err != nil {
					logger.Error().Err(err).Send()
					svc.Ec.Append(r.RepositoryID, err.Error())
				}
			}()
			select {
			case <-done:
			case <-time.After(repositoryTimeout):
				logger.Error().Err(errTimeout).Send()
				svc.Ec.Append(r.RepositoryID, errTimeout.Error())
			}
		}(r)
	}
	wg.Wait()
	ec.Flush()
	log.Info().Msg("tracker finished")
}
