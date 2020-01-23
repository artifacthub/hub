package main

import (
	"context"
	"net/http"
	"strings"
	"sync"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/tegioz/hub/internal/hub"
	"helm.sh/helm/v3/pkg/chart"
	"helm.sh/helm/v3/pkg/chart/loader"
)

type worker struct {
	ctx    context.Context
	id     int
	hubApi *hub.Hub
	logger zerolog.Logger
}

func newWorker(ctx context.Context, id int, hubApi *hub.Hub) *worker {
	return &worker{
		ctx:    ctx,
		id:     id,
		hubApi: hubApi,
		logger: log.With().Int("worker", id).Logger(),
	}
}

func (w *worker) run(wg *sync.WaitGroup, queue chan *job) {
	defer wg.Done()
	for {
		select {
		case j, ok := <-queue:
			if !ok {
				return
			}
			md := j.chartVersion.Metadata
			w.logger.Debug().
				Str("repo", j.repo.Name).
				Str("chart", md.Name).
				Str("version", md.Version).
				Msg("Handling job")
			if err := w.handleJob(j); err != nil {
				w.logger.Error().
					Err(err).
					Str("repo", j.repo.Name).
					Str("chart", md.Name).
					Str("version", md.Version).
					Msg("Error handling job")
			}
		case <-w.ctx.Done():
			return
		}
	}
}

func (w *worker) handleJob(j *job) error {
	// Load chart from remote archive in memory
	url := j.chartVersion.URLs[0]
	if !strings.HasPrefix(url, "http") {
		url = j.repo.URL + url
	}
	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		if resp.StatusCode != http.StatusNotFound {
			w.logger.Error().Str("url", url).Int("code", resp.StatusCode).Send()
		}
		return nil
	}
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
		Digest:          j.chartVersion.Digest,
		ChartRepository: j.repo,
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
