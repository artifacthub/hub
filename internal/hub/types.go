package hub

type ChartRepository struct {
	ChartRepositoryID string `json:"chart_repository_id"`
	Name              string `json:"name"`
	DisplayName       string `json:"display_name"`
	URL               string `json:"url"`
}

type OperatorProvider struct {
	OperatorProviderID string `json:"operator_provider_id"`
	Name               string `json:"name"`
}

type OperatorCategory struct {
	OperatorCategoryID string `json:"operator_category_id"`
	Name               string `json:"name"`
}

type Link struct {
	Name string `json:"name"`
	URL  string `json:"url"`
}

type Maintainer struct {
	MaintainerID string `json:"maintainer_id"`
	Name         string `json:"name"`
	Email        string `json:"email"`
}

type PackageKind int64

const (
	Chart    PackageKind = 0
	Operator PackageKind = 1
)

type Package struct {
	PackageID         string            `json:"package_id"`
	Kind              PackageKind       `json:"kind"`
	Name              string            `json:"name"`
	DisplayName       string            `json:"display_name"`
	Description       string            `json:"description"`
	HomeURL           string            `json:"home_url"`
	LogoURL           string            `json:"logo_url"`
	Keywords          []string          `json:"keywords"`
	Readme            string            `json:"readme"`
	Links             []*Link           `json:"links"`
	Version           string            `json:"version"`
	AvailableVersions []string          `json:"available_versions"`
	AppVersion        string            `json:"app_version"`
	LastUpdated       int64             `json:"last_updated"`
	Maintainers       []*Maintainer     `json:"maintainers"`
	ChartRepository   *ChartRepository  `json:"chart_repository"`
	OperatorProvider  *OperatorProvider `json:"operator_provider"`
}

type Query struct {
	Text string `json:"text"`
}
