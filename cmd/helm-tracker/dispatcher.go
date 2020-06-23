package main

import (
	"context"
	"fmt"
	"strings"
	"sync"

	"github.com/Masterminds/semver/v3"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/rs/zerolog/log"
	"github.com/spf13/viper"
	"golang.org/x/time/rate"
	"helm.sh/helm/v3/pkg/chart"
	"helm.sh/helm/v3/pkg/repo"
)

// JobKind represents the kind of a job, which can be register or unregister.
type JobKind int

const (
	// Register represents a job to Register a new chart release in the hub.
	Register JobKind = iota

	// Unregister represents a job to Unregister an existing chart release from
	// the hub.
	Unregister
)

// Job represents a Job for registering or unregistering a given chart release
// available in the provided chart repository. Jobs are created by the
// dispatcher and will eventually be handled by a worker.
type Job struct {
	Kind         JobKind
	Repo         *hub.Repository
	ChartVersion *repo.ChartVersion
	GetLogo      bool
}

// Dispatcher is in charge of generating jobs to register or unregister charts
// releases and dispatching them among the available workers.
type Dispatcher struct {
	ctx   context.Context
	cfg   *viper.Viper
	il    hub.HelmIndexLoader
	rm    hub.RepositoryManager
	ec    ErrorsCollector
	Queue chan *Job
}

// NewDispatcher creates a new dispatcher instance.
func NewDispatcher(
	ctx context.Context,
	cfg *viper.Viper,
	il hub.HelmIndexLoader,
	rm hub.RepositoryManager,
	ec ErrorsCollector,
) *Dispatcher {
	return &Dispatcher{
		ctx:   ctx,
		cfg:   cfg,
		il:    il,
		rm:    rm,
		ec:    ec,
		Queue: make(chan *Job),
	}
}

// Run instructs the dispatcher to start processing the repositories provided.
func (d *Dispatcher) Run(wg *sync.WaitGroup, repos []*hub.Repository) {
	defer wg.Done()
	defer close(d.Queue)

	var wgRepos sync.WaitGroup
	limiter := rate.NewLimiter(25, 25)
	for _, r := range repos {
		if err := limiter.Wait(d.ctx); err != nil {
			log.Error().Err(err).Msg("error waiting for limiter")
			return
		}
		wgRepos.Add(1)
		go d.generateSyncJobs(&wgRepos, r)
	}

	wgRepos.Wait()
}

// generateSyncJobs generates the jobs to register or unregister chart releases
// as needed to keep them in sync.
func (d *Dispatcher) generateSyncJobs(wg *sync.WaitGroup, r *hub.Repository) {
	defer wg.Done()

	log.Info().Str("repo", r.Name).Msg("loading repository index file")
	indexFile, err := d.il.LoadIndex(r)
	if err != nil {
		msg := "error loading repository index file"
		d.ec.Append(r.RepositoryID, fmt.Errorf("%s: %w", msg, err))
		log.Error().Err(err).Str("repo", r.Name).Msg(msg)
		return
	}

	log.Info().Str("repo", r.Name).Msg("loading registered packages digest")
	registeredPackagesDigest, err := d.rm.GetPackagesDigest(d.ctx, r.RepositoryID)
	if err != nil {
		log.Error().Err(err).Str("repo", r.Name).Msg("error getting repository packages digest")
		return
	}

	// Register new or updated chart releases
	bypassDigestCheck := d.cfg.GetBool("tracker.bypassDigestCheck")
	chartsAvailable := make(map[string]struct{})
	for _, chartVersions := range indexFile.Entries {
		for i, chartVersion := range chartVersions {
			var getLogo bool
			if i == 0 {
				getLogo = true
			}
			sv, err := semver.NewVersion(chartVersion.Metadata.Version)
			if err != nil {
				continue
			}
			key := fmt.Sprintf("%s@%s", chartVersion.Metadata.Name, sv.String())
			chartsAvailable[key] = struct{}{}
			if bypassDigestCheck || chartVersion.Digest != registeredPackagesDigest[key] {
				d.Queue <- &Job{
					Kind:         Register,
					Repo:         r,
					ChartVersion: chartVersion,
					GetLogo:      getLogo,
				}
			}
			select {
			case <-d.ctx.Done():
				return
			default:
			}
		}
	}

	// Unregister chart releases no longer available in the repository
	for key := range registeredPackagesDigest {
		if _, ok := chartsAvailable[key]; !ok {
			p := strings.Split(key, "@")
			name := p[0]
			version := p[1]
			d.Queue <- &Job{
				Kind: Unregister,
				Repo: r,
				ChartVersion: &repo.ChartVersion{
					Metadata: &chart.Metadata{
						Name:    name,
						Version: version,
					},
				},
			}
		}
		select {
		case <-d.ctx.Done():
			return
		default:
		}
	}
}
