package repo

import (
	"github.com/artifacthub/hub/internal/hub"
	"helm.sh/helm/v3/pkg/cli"
	"helm.sh/helm/v3/pkg/getter"
	helmrepo "helm.sh/helm/v3/pkg/repo"
)

// HelmIndexLoader provides a mechanism to load a Helm repository index file,
// verifying it is valid.
type HelmIndexLoader struct{}

// LoadIndex downloads and parses the index file of the provided repository.
func (l *HelmIndexLoader) LoadIndex(r *hub.Repository) (*helmrepo.IndexFile, error) {
	repoConfig := &helmrepo.Entry{
		Name: r.Name,
		URL:  r.URL,
	}
	getters := getter.All(&cli.EnvSettings{})
	chartRepository, err := helmrepo.NewChartRepository(repoConfig, getters)
	if err != nil {
		return nil, err
	}
	path, err := chartRepository.DownloadIndexFile()
	if err != nil {
		return nil, err
	}
	indexFile, err := helmrepo.LoadIndexFile(path)
	if err != nil {
		return nil, err
	}
	return indexFile, nil
}
