package repo

import (
	"time"

	"github.com/artifacthub/hub/internal/hub"
	"helm.sh/helm/v3/pkg/getter"
	helmrepo "helm.sh/helm/v3/pkg/repo"
)

// HelmIndexLoader provides a mechanism to load a Helm repository index file,
// verifying it is valid.
type HelmIndexLoader struct{}

// LoadIndex downloads and parses the index file of the provided repository.
func (l *HelmIndexLoader) LoadIndex(r *hub.Repository) (*helmrepo.IndexFile, string, error) {
	repoConfig := &helmrepo.Entry{
		Name:     r.Name,
		URL:      r.URL,
		Username: r.AuthUser,
		Password: r.AuthPass,
	}
	getters := getter.Providers{
		{
			Schemes: []string{"http", "https"},
			New: func(options ...getter.Option) (getter.Getter, error) {
				return getter.NewHTTPGetter(getter.WithTimeout(10 * time.Second))
			},
		},
	}
	chartRepository, err := helmrepo.NewChartRepository(repoConfig, getters)
	if err != nil {
		return nil, "", err
	}
	indexPath, err := chartRepository.DownloadIndexFile()
	if err != nil {
		return nil, "", err
	}
	indexFile, err := helmrepo.LoadIndexFile(indexPath)
	if err != nil {
		return nil, "", err
	}
	return indexFile, indexPath, nil
}
