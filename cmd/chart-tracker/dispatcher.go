package main

import (
	"context"
	"sync"

	"helm.sh/helm/v3/pkg/cli"
	"helm.sh/helm/v3/pkg/getter"
	"helm.sh/helm/v3/pkg/repo"
)

type dispatcher struct {
	indexFile *repo.IndexFile
	Queue     chan *repo.ChartVersion
}

func newDispatcher(repoURL string) (*dispatcher, error) {
	indexFile, err := loadIndexFile(repoURL)
	if err != nil {
		return nil, err
	}
	d := &dispatcher{
		indexFile: indexFile,
		Queue:     make(chan *repo.ChartVersion),
	}
	return d, nil
}

func (d *dispatcher) run(ctx context.Context, wg *sync.WaitGroup) {
	defer wg.Done()
	for _, chartVersions := range d.indexFile.Entries {
		d.Queue <- chartVersions[0]
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
