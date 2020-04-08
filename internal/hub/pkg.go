package hub

import "context"

// GetPackageInput represents the input used to get a specific package.
type GetPackageInput struct {
	ChartRepositoryName string `json:"chart_repository_name"`
	PackageName         string `json:"package_name"`
	Version             string `json:"version"`
}

// Link represents a url associated with a package.
type Link struct {
	Name string `json:"name"`
	URL  string `json:"url"`
}

// Maintainer represents a package's maintainer.
type Maintainer struct {
	MaintainerID string `json:"maintainer_id"`
	Name         string `json:"name"`
	Email        string `json:"email"`
}

// Package represents a Kubernetes package.
type Package struct {
	PackageID         string                 `json:"package_id"`
	Kind              PackageKind            `json:"kind"`
	Name              string                 `json:"name"`
	DisplayName       string                 `json:"display_name"`
	Description       string                 `json:"description"`
	HomeURL           string                 `json:"home_url"`
	LogoURL           string                 `json:"logo_url"`
	LogoImageID       string                 `json:"logo_image_id"`
	Keywords          []string               `json:"keywords"`
	Deprecated        bool                   `json:"deprecated"`
	Readme            string                 `json:"readme"`
	Links             []*Link                `json:"links"`
	Version           string                 `json:"version"`
	AvailableVersions []string               `json:"available_versions"`
	AppVersion        string                 `json:"app_version"`
	Digest            string                 `json:"digest"`
	Data              map[string]interface{} `json:"data"`
	Maintainers       []*Maintainer          `json:"maintainers"`
	UserID            string                 `json:"user_id"`
	OrganizationID    string                 `json:"organization_id"`
	ChartRepository   *ChartRepository       `json:"chart_repository"`
}

// PackageKind represents the kind of a given package.
type PackageKind int64

const (
	// Chart represents a Helm chart.
	Chart PackageKind = 0

	// Falco represents a set of Falco rules.
	Falco PackageKind = 1

	// OPA represents a set of OPA policies.
	OPA PackageKind = 2
)

// PackageManager describes the methods a PackageManager implementation must
// provide.
type PackageManager interface {
	GetJSON(ctx context.Context, input *GetPackageInput) ([]byte, error)
	GetStarredByUserJSON(ctx context.Context) ([]byte, error)
	GetStatsJSON(ctx context.Context) ([]byte, error)
	GetUpdatesJSON(ctx context.Context) ([]byte, error)
	Register(ctx context.Context, pkg *Package) error
	SearchJSON(ctx context.Context, input *SearchPackageInput) ([]byte, error)
	ToggleStar(ctx context.Context, packageID string) error
}

// SearchPackageInput represents the query input when searching for packages.
type SearchPackageInput struct {
	Limit             int           `json:"limit,omitempty"`
	Offset            int           `json:"offset,omitempty"`
	Facets            bool          `json:"facets"`
	Text              string        `json:"text"`
	PackageKinds      []PackageKind `json:"package_kinds,omitempty"`
	Users             []string      `json:"users,omitempty"`
	Orgs              []string      `json:"orgs,omitempty"`
	ChartRepositories []string      `json:"chart_repositories,omitempty"`
	Deprecated        bool          `json:"deprecated"`
}
