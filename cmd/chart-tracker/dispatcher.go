package main

import (
	"context"
	"fmt"
	"strings"
	"sync"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/rs/zerolog/log"
	"golang.org/x/time/rate"
	"helm.sh/helm/v3/pkg/chart"
	"helm.sh/helm/v3/pkg/cli"
	"helm.sh/helm/v3/pkg/getter"
	"helm.sh/helm/v3/pkg/repo"
)

// jobKind represents the kind of a job, which can be register or unregister.
type jobKind int

const (
	// register represents a job to register a new chart release in the hub.
	register jobKind = iota

	// unregister represents a job to unregister an existing chart release from
	// the hub.
	unregister
)

// job represents a job for registering or unregistering a given chart release
// available in the provided chart repository. Jobs are created by the
// dispatcher and will eventually be handled by a worker.
type job struct {
	kind         jobKind
	repo         *hub.ChartRepository
	chartVersion *repo.ChartVersion
	downloadLogo bool
}

// dispatcher is in charge of generating jobs to register or unregister charts
// releases and dispatching them among the available workers.
type dispatcher struct {
	ctx              context.Context
	ec               *errorsCollector
	chartRepoManager hub.ChartRepositoryManager
	Queue            chan *job
}

// newDispatcher creates a new dispatcher instance.
func newDispatcher(
	ctx context.Context,
	ec *errorsCollector,
	chartRepoManager hub.ChartRepositoryManager,
) *dispatcher {
	return &dispatcher{
		ctx:              ctx,
		chartRepoManager: chartRepoManager,
		Queue:            make(chan *job),
		ec:               ec,
	}
}

// run instructs the dispatcher to start processing the repositories provided.
func (d *dispatcher) run(wg *sync.WaitGroup, repos []*hub.ChartRepository) {
	defer wg.Done()
	defer close(d.Queue)

	var wgRepos sync.WaitGroup
	limiter := rate.NewLimiter(25, 25)
	for _, r := range repos {
		if err := limiter.Wait(d.ctx); err != nil {
			log.Error().Err(err).Msg("Error waiting for limiter")
			return
		}
		wgRepos.Add(1)
		go d.syncRepositoryCharts(&wgRepos, r)
	}

	wgRepos.Wait()
}

// syncRepositoryCharts synchronizes the charts available in the chart
// repository provided with the hub, generating jobs to register or unregister
// charts releases as needed.
func (d *dispatcher) syncRepositoryCharts(wg *sync.WaitGroup, r *hub.ChartRepository) {
	defer wg.Done()

	log.Info().Str("repo", r.Name).Msg("Loading chart repository index file")
	indexFile, err := loadIndexFile(r)
	if err != nil {
		msg := "Error loading repository index file"
		d.ec.append(r.ChartRepositoryID, fmt.Errorf("%s: %w", msg, err))
		log.Error().Err(err).Str("repo", r.Name).Msg(msg)
		return
	}

	log.Info().Str("repo", r.Name).Msg("Loading registered packages digest")
	registeredPackagesDigest, err := d.chartRepoManager.GetPackagesDigest(d.ctx, r.ChartRepositoryID)
	if err != nil {
		log.Error().Err(err).Str("repo", r.Name).Msg("Error getting repository packages digest")
		return
	}

	// Register new or updated chart releases
	chartsAvailable := make(map[string]struct{})
	for _, chartVersions := range indexFile.Entries {
		for i, chartVersion := range chartVersions {
			var downloadLogo bool
			if i == 0 {
				downloadLogo = true
			}
			key := fmt.Sprintf("%s@%s", chartVersion.Metadata.Name, chartVersion.Metadata.Version)
			chartsAvailable[key] = struct{}{}
			if chartVersion.Digest != registeredPackagesDigest[key] {
				d.Queue <- &job{
					kind:         register,
					repo:         r,
					chartVersion: chartVersion,
					downloadLogo: downloadLogo,
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
			d.Queue <- &job{
				kind: unregister,
				repo: r,
				chartVersion: &repo.ChartVersion{
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

// loadIndexFile downloads and parses the index file of the provided repository.
func loadIndexFile(r *hub.ChartRepository) (*repo.IndexFile, error) {
	repoConfig := &repo.Entry{
		Name: r.Name,
		URL:  r.URL,
	}
	getters := getter.All(&cli.EnvSettings{})
	chartRepository, err := repo.NewChartRepository(repoConfig, getters)
	if err != nil {
		return nil, err
	}
	path, err := chartRepository.DownloadIndexFile()
	if err != nil {
		return nil, err
	}
	indexFile, err := repo.LoadIndexFile(path)
	if err != nil {
		return nil, err
	}
	return indexFile, nil
}
