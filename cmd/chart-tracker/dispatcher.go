package main

import (
	"context"
	"fmt"
	"sync"

	"github.com/artifacthub/hub/internal/api"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/rs/zerolog/log"
	"golang.org/x/time/rate"
	"helm.sh/helm/v3/pkg/cli"
	"helm.sh/helm/v3/pkg/getter"
	"helm.sh/helm/v3/pkg/repo"
)

// job represents a job for processing a given chart version in the provided
// repository. Jobs are created by the dispatcher that will eventually be
// handled by a worker.
type job struct {
	repo         *hub.ChartRepository
	chartVersion *repo.ChartVersion
	downloadLogo bool
}

// dispatcher is in charge of generating jobs and dispatching them among the
// available workers.
type dispatcher struct {
	ctx    context.Context
	ec     *errorsCollector
	hubAPI *api.API
	Queue  chan *job
}

// newDispatcher creates a new dispatcher instance.
func newDispatcher(ctx context.Context, ec *errorsCollector, hubAPI *api.API) *dispatcher {
	return &dispatcher{
		ctx:    ctx,
		hubAPI: hubAPI,
		Queue:  make(chan *job),
		ec:     ec,
	}
}

// run instructs the dispatcher to start processing the repositories provided.
func (d *dispatcher) run(wg *sync.WaitGroup, repos []*hub.ChartRepository) {
	defer wg.Done()
	defer close(d.Queue)

	// Track repositories charts
	var wgRepos sync.WaitGroup
	limiter := rate.NewLimiter(25, 25)
	for _, r := range repos {
		if err := limiter.Wait(d.ctx); err != nil {
			log.Error().Err(err).Msg("Error waiting for limiter")
			return
		}
		wgRepos.Add(1)
		go d.trackRepositoryCharts(&wgRepos, r)
	}

	wgRepos.Wait()
}

// trackRepositoryCharts generates jobs for each of the chart versions found in
// the given repository, provided that that version has not been already
// processed and its digest has not changed.
func (d *dispatcher) trackRepositoryCharts(wg *sync.WaitGroup, r *hub.ChartRepository) {
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
	packagesDigest, err := d.hubAPI.ChartRepositories.GetPackagesDigest(d.ctx, r.ChartRepositoryID)
	if err != nil {
		log.Error().Err(err).Str("repo", r.Name).Msg("Error getting repository packages digest")
		return
	}
	for _, chartVersions := range indexFile.Entries {
		for i, chartVersion := range chartVersions {
			var downloadLogo bool
			if i == 0 {
				downloadLogo = true
			}
			key := fmt.Sprintf("%s@%s", chartVersion.Metadata.Name, chartVersion.Metadata.Version)
			if chartVersion.Digest != packagesDigest[key] {
				d.Queue <- &job{
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
