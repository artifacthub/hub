package repo

import (
	"crypto/sha256"
	"encoding/hex"
	"io"
	"net/url"
	"path"
	"time"

	"github.com/artifacthub/hub/internal/hub"
	"helm.sh/helm/v3/pkg/getter"
	helmrepo "helm.sh/helm/v3/pkg/repo"
	"sigs.k8s.io/yaml"
)

const (
	helmRepoIndexFile = "index.yaml"
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
	indexBytes, err := downloadIndexFile(chartRepository)
	if err != nil {
		return nil, "", err
	}
	indexFile, err := loadIndexFile(indexBytes)
	if err != nil {
		return nil, "", err
	}
	return indexFile, getDigest(indexBytes), nil
}

// downloadIndexFile downloads a Helm repository's index file.
func downloadIndexFile(r *helmrepo.ChartRepository) ([]byte, error) {
	// Prepare index file url
	parsedURL, err := url.Parse(r.Config.URL)
	if err != nil {
		return nil, err
	}
	parsedURL.RawPath = path.Join(parsedURL.RawPath, helmRepoIndexFile)
	parsedURL.Path = path.Join(parsedURL.Path, helmRepoIndexFile)
	indexURL := parsedURL.String()

	// Fetch index file content from remote location
	resp, err := r.Client.Get(indexURL,
		getter.WithURL(r.Config.URL),
		getter.WithBasicAuth(r.Config.Username, r.Config.Password),
	)
	if err != nil {
		return nil, err
	}
	return io.ReadAll(resp)
}

// loadIndexFile reads and parses a Helm repository's index file.
func loadIndexFile(indexBytes []byte) (*helmrepo.IndexFile, error) {
	indexFile := &helmrepo.IndexFile{}
	if err := yaml.UnmarshalStrict(indexBytes, indexFile); err != nil {
		return nil, err
	}
	if indexFile.APIVersion == "" {
		return nil, helmrepo.ErrNoAPIVersion
	}
	indexFile.SortEntries()
	return indexFile, nil
}

// getDigest returns the digest of a Helm repository's index file.
func getDigest(indexBytes []byte) string {
	indexFile := &helmrepo.IndexFile{}
	_ = yaml.UnmarshalStrict(indexBytes, indexFile)
	indexFile.Generated = time.Time{}
	indexBytes, _ = yaml.Marshal(indexFile)
	hash := sha256.Sum256(indexBytes)
	digest := hex.EncodeToString(hash[:])
	return digest
}
