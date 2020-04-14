package chartrepo

import (
	"github.com/artifacthub/hub/internal/hub"
	"helm.sh/helm/v3/pkg/cli"
	"helm.sh/helm/v3/pkg/getter"
	"helm.sh/helm/v3/pkg/repo"
)

// IndexLoader provides a mechanism to load a chart repository index file,
// verifying it is valid.
type IndexLoader struct{}

// LoadIndexFile downloads and parses the index file of the provided repository.
func (l *IndexLoader) LoadIndexFile(r *hub.ChartRepository) error {
	repoConfig := &repo.Entry{
		Name: r.Name,
		URL:  r.URL,
	}
	getters := getter.All(&cli.EnvSettings{})
	chartRepository, err := repo.NewChartRepository(repoConfig, getters)
	if err != nil {
		return err
	}
	path, err := chartRepository.DownloadIndexFile()
	if err != nil {
		return err
	}
	_, err = repo.LoadIndexFile(path)
	return err
}
