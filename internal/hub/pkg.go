package hub

import "context"

// GetPackageInput represents the input used to get a specific package.
type GetPackageInput struct {
	PackageID           string `json:"package_id"`
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
	PackageID               string                 `json:"package_id"`
	Kind                    PackageKind            `json:"kind"`
	Name                    string                 `json:"name"`
	NormalizedName          string                 `json:"normalized_name"`
	LogoURL                 string                 `json:"logo_url"`
	LogoImageID             string                 `json:"logo_image_id"`
	DisplayName             string                 `json:"display_name"`
	Description             string                 `json:"description"`
	Keywords                []string               `json:"keywords"`
	HomeURL                 string                 `json:"home_url"`
	Readme                  string                 `json:"readme"`
	Links                   []*Link                `json:"links"`
	Data                    map[string]interface{} `json:"data"`
	Version                 string                 `json:"version"`
	AvailableVersions       []string               `json:"available_versions"`
	AppVersion              string                 `json:"app_version"`
	Digest                  string                 `json:"digest"`
	Deprecated              bool                   `json:"deprecated"`
	License                 string                 `json:"license"`
	ContentURL              string                 `json:"content_url"`
	Maintainers             []*Maintainer          `json:"maintainers"`
	UserID                  string                 `json:"user_id"`
	UserAlias               string                 `json:"user_alias"`
	OrganizationID          string                 `json:"organization_id"`
	OrganizationName        string                 `json:"organization_name"`
	OrganizationDisplayName string                 `json:"organization_display_name"`
	ChartRepository         *ChartRepository       `json:"chart_repository"`
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
	Get(ctx context.Context, input *GetPackageInput) (*Package, error)
	GetJSON(ctx context.Context, input *GetPackageInput) ([]byte, error)
	GetStarredByUserJSON(ctx context.Context) ([]byte, error)
	GetStarsJSON(ctx context.Context, packageID string) ([]byte, error)
	GetStatsJSON(ctx context.Context) ([]byte, error)
	GetUpdatesJSON(ctx context.Context) ([]byte, error)
	Register(ctx context.Context, pkg *Package) error
	SearchJSON(ctx context.Context, input *SearchPackageInput) ([]byte, error)
	ToggleStar(ctx context.Context, packageID string) error
	Unregister(ctx context.Context, pkg *Package) error
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
