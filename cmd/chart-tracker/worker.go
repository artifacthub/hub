package main

import (
	"context"
	"net/http"
	"sync"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/tegioz/hub/internal/hub"
	"helm.sh/helm/v3/pkg/chart"
	"helm.sh/helm/v3/pkg/chart/loader"
	"helm.sh/helm/v3/pkg/repo"
)

type worker struct {
	ctx    context.Context
	id     int
	hubApi *hub.Hub
	repo   *hub.ChartRepository
	logger zerolog.Logger
}

func newWorker(ctx context.Context, id int, hubApi *hub.Hub, repo *hub.ChartRepository) *worker {
	return &worker{
		ctx:    ctx,
		id:     id,
		hubApi: hubApi,
		repo:   repo,
		logger: log.With().Int("worker", id).Logger(),
	}
}

func (w *worker) run(wg *sync.WaitGroup, queue chan *repo.ChartVersion) {
	defer wg.Done()
	for {
		select {
		case chartVersion, ok := <-queue:
			if !ok {
				return
			}
			log.Debug().
				Str("chart", chartVersion.Metadata.Name).
				Str("version", chartVersion.Metadata.Version).
				Msg("Processing chart version")
			if err := w.processChartVersion(chartVersion); err != nil {
				w.logger.Error().
					Err(err).
					Str("chart", chartVersion.Metadata.Name).
					Str("version", chartVersion.Metadata.Version).
					Msg("Error processing chart version")
			}
		case <-w.ctx.Done():
			return
		}
	}
}

func (w *worker) processChartVersion(chartVersion *repo.ChartVersion) error {
	// Load chart from remote archive in memory
	resp, err := http.Get(chartVersion.URLs[0])
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	chart, err := loader.LoadArchive(resp.Body)
	if err != nil {
		return err
	}

	// Prepare hub package to be registered
	md := chart.Metadata
	p := &hub.Package{
		Kind:            hub.Chart,
		Name:            md.Name,
		Description:     md.Description,
		HomeURL:         md.Home,
		LogoURL:         md.Icon,
		Keywords:        md.Keywords,
		Version:         md.Version,
		AppVersion:      md.AppVersion,
		ChartRepository: w.repo,
	}
	readme := getFile(chart, "README.md")
	if readme != nil {
		p.Readme = string(readme.Data)
	}
	var maintainers []*hub.Maintainer
	for _, entry := range md.Maintainers {
		if entry.Email != "" {
			maintainers = append(maintainers, &hub.Maintainer{
				Name:  entry.Name,
				Email: entry.Email,
			})
		}
	}
	if len(maintainers) > 0 {
		p.Maintainers = maintainers
	}

	// Register package
	return w.hubApi.RegisterPackage(w.ctx, p)
}

func getFile(chart *chart.Chart, name string) *chart.File {
	for _, file := range chart.Files {
		if file.Name == name {
			return file
		}
	}
	return nil
}
