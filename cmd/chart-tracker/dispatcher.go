package main

import (
	"context"
	"fmt"
	"sync"

	"github.com/rs/zerolog/log"
	"github.com/tegioz/hub/internal/hub"
	"helm.sh/helm/v3/pkg/cli"
	"helm.sh/helm/v3/pkg/getter"
	"helm.sh/helm/v3/pkg/repo"
)

type dispatcher struct {
	indexFile      *repo.IndexFile
	packagesDigest map[string]string
	Queue          chan *repo.ChartVersion
}

func newDispatcher(ctx context.Context, hubApi *hub.Hub, cr *hub.ChartRepository) (*dispatcher, error) {
	log.Info().Msg("Loading chart repository index file")
	indexFile, err := loadIndexFile(cr.URL)
	if err != nil {
		return nil, err
	}
	log.Info().Msg("Loading registered packages digest")
	packagesDigest, err := hubApi.GetChartRepositoryPackagesDigest(ctx, cr.ChartRepositoryID)
	if err != nil {
		return nil, err
	}

	d := &dispatcher{
		indexFile:      indexFile,
		packagesDigest: packagesDigest,
		Queue:          make(chan *repo.ChartVersion),
	}
	return d, nil
}

func (d *dispatcher) run(ctx context.Context, wg *sync.WaitGroup) {
	defer wg.Done()
	for _, chartVersions := range d.indexFile.Entries {
		for _, chartVersion := range chartVersions {
			key := fmt.Sprintf("%s@%s", chartVersion.Metadata.Name, chartVersion.Metadata.Version)
			if chartVersion.Digest != d.packagesDigest[key] {
				d.Queue <- chartVersion
			}

			select {
			case <-ctx.Done():
				return
			default:
			}
		}
	}
	close(d.Queue)
}

func loadIndexFile(repoURL string) (*repo.IndexFile, error) {
	repoConfig := &repo.Entry{URL: repoURL}
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
