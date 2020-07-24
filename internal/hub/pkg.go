package hub

import (
	"context"
)

// Channel represents a package's channel.
type Channel struct {
	Name    string `json:"name"`
	Version string `json:"version"`
}

// GetPackageInput represents the input used to get a specific package.
type GetPackageInput struct {
	PackageID      string `json:"package_id"`
	RepositoryName string `json:"repository_name"`
	PackageName    string `json:"package_name"`
	Version        string `json:"version"`
}

// Link represents a url associated with a package.
type Link struct {
	Name string `json:"name" yaml:"name"`
	URL  string `json:"url" yaml:"url"`
}

// Maintainer represents a package's maintainer.
type Maintainer struct {
	MaintainerID string `json:"maintainer_id"`
	Name         string `json:"name" yaml:"name"`
	Email        string `json:"email" yaml:"email"`
}

// Package represents a Kubernetes package.
type Package struct {
	PackageID         string                 `json:"package_id"`
	Name              string                 `json:"name"`
	NormalizedName    string                 `json:"normalized_name"`
	LogoURL           string                 `json:"logo_url"`
	LogoImageID       string                 `json:"logo_image_id"`
	IsOperator        bool                   `json:"is_operator"`
	Channels          []*Channel             `json:"channels"`
	DefaultChannel    string                 `json:"default_channel"`
	DisplayName       string                 `json:"display_name"`
	Description       string                 `json:"description"`
	Keywords          []string               `json:"keywords"`
	HomeURL           string                 `json:"home_url"`
	Readme            string                 `json:"readme"`
	Install           string                 `json:"install"`
	Links             []*Link                `json:"links"`
	Data              map[string]interface{} `json:"data"`
	Version           string                 `json:"version"`
	AvailableVersions []*Version             `json:"available_versions"`
	AppVersion        string                 `json:"app_version"`
	Digest            string                 `json:"digest"`
	Deprecated        bool                   `json:"deprecated"`
	License           string                 `json:"license"`
	Signed            bool                   `json:"signed"`
	ContentURL        string                 `json:"content_url"`
	ContainerImage    string                 `json:"container_image"`
	Provider          string                 `json:"provider"`
	Maintainers       []*Maintainer          `json:"maintainers"`
	Repository        *Repository            `json:"repository"`
	CreatedAt         int64                  `json:"created_at,omitempty"`
}

// PackageManager describes the methods a PackageManager implementation must
// provide.
type PackageManager interface {
	Get(ctx context.Context, input *GetPackageInput) (*Package, error)
	GetJSON(ctx context.Context, input *GetPackageInput) ([]byte, error)
	GetRandomJSON(ctx context.Context) ([]byte, error)
	GetStarredByUserJSON(ctx context.Context) ([]byte, error)
	GetStarsJSON(ctx context.Context, packageID string) ([]byte, error)
	GetStatsJSON(ctx context.Context) ([]byte, error)
	Register(ctx context.Context, pkg *Package) error
	SearchJSON(ctx context.Context, input *SearchPackageInput) ([]byte, error)
	ToggleStar(ctx context.Context, packageID string) error
	Unregister(ctx context.Context, pkg *Package) error
}

// PackageMetadata represents some metadata about a given package. It's usually
// provided by repositories publishers, to provide the required information
// about the content they'd like to be indexed.
type PackageMetadata struct {
	Version        string        `yaml:"version"`
	Name           string        `yaml:"name"`
	DisplayName    string        `yaml:"displayName"`
	CreatedAt      string        `yaml:"createdAt"`
	Description    string        `yaml:"description"`
	LogoPath       string        `yaml:"logoPath"`
	Digest         string        `yaml:"digest"`
	License        string        `yaml:"license"`
	HomeURL        string        `yaml:"homeURL"`
	AppVersion     string        `yaml:"appVersion"`
	PublisherID    string        `yaml:"publisherID"`
	ContainerImage string        `yaml:"containerImage"`
	Operator       bool          `yaml:"operator"`
	Deprecated     bool          `yaml:"deprecated"`
	Keywords       []string      `yaml:"keywords"`
	Links          []*Link       `yaml:"links"`
	Readme         string        `yaml:"readme"`
	Install        string        `yaml:"install"`
	Maintainers    []*Maintainer `yaml:"maintainers"`
	Provider       *Provider     `yaml:"provider"`
}

// Provider represents a package's provider.
type Provider struct {
	Name string `yaml:"name"`
}

// SearchPackageInput represents the query input when searching for packages.
type SearchPackageInput struct {
	Limit           int              `json:"limit,omitempty"`
	Offset          int              `json:"offset,omitempty"`
	Facets          bool             `json:"facets"`
	TsQueryWeb      string           `json:"ts_query_web,omitempty"`
	TsQuery         string           `json:"ts_query,omitempty"`
	Users           []string         `json:"users,omitempty"`
	Orgs            []string         `json:"orgs,omitempty"`
	Repositories    []string         `json:"repositories,omitempty"`
	RepositoryKinds []RepositoryKind `json:"repository_kinds,omitempty"`
	Operators       bool             `json:"operators"`
	Deprecated      bool             `json:"deprecated"`
}

// Version represents a package's version
type Version struct {
	Version   string `json:"version"`
	CreatedAt int64  `json:"created_at"`
}
