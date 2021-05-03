package hub

import (
	"context"
	"encoding/json"
)

const (
	// PackageMetadataFile represents the name of the file where the Artifact
	// Hub metadata for a given package is stored.
	PackageMetadataFile = "artifacthub-pkg"
)

// Change represents a change introduced in a package version.
type Change struct {
	Kind        string  `json:"kind,omitempty"`
	Description string  `json:"description"`
	Links       []*Link `json:"links,omitempty"`
}

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

// ContainerImage represents a container image associated with a package.
type ContainerImage struct {
	Name        string `json:"name" yaml:"name"`
	Image       string `json:"image" yaml:"image"`
	Whitelisted bool   `json:"whitelisted" yaml:"whitelisted"`
}

// Maintainer represents a package's maintainer.
type Maintainer struct {
	MaintainerID string `json:"maintainer_id"`
	Name         string `json:"name" yaml:"name"`
	Email        string `json:"email" yaml:"email"`
}

// Package represents a Kubernetes package.
type Package struct {
	PackageID               string                 `json:"package_id"`
	Name                    string                 `json:"name"`
	NormalizedName          string                 `json:"normalized_name"`
	LogoURL                 string                 `json:"logo_url"`
	LogoImageID             string                 `json:"logo_image_id"`
	IsOperator              bool                   `json:"is_operator"`
	Official                bool                   `json:"official"`
	Channels                []*Channel             `json:"channels"`
	DefaultChannel          string                 `json:"default_channel"`
	DisplayName             string                 `json:"display_name"`
	Description             string                 `json:"description"`
	Keywords                []string               `json:"keywords"`
	HomeURL                 string                 `json:"home_url"`
	Readme                  string                 `json:"readme"`
	Install                 string                 `json:"install"`
	Links                   []*Link                `json:"links"`
	Capabilities            string                 `json:"capabilities"`
	CRDs                    []interface{}          `json:"crds"`
	CRDsExamples            []interface{}          `json:"crds_examples"`
	SecurityReportSummary   *SecurityReportSummary `json:"security_report_summary"`
	SecurityReportCreatedAt int64                  `json:"security_report_created_at,omitempty"`
	Data                    map[string]interface{} `json:"data"`
	Version                 string                 `json:"version"`
	AvailableVersions       []*Version             `json:"available_versions"`
	AppVersion              string                 `json:"app_version"`
	Digest                  string                 `json:"digest"`
	Deprecated              bool                   `json:"deprecated"`
	License                 string                 `json:"license"`
	Signed                  bool                   `json:"signed"`
	ContentURL              string                 `json:"content_url"`
	ContainersImages        []*ContainerImage      `json:"containers_images"`
	Provider                string                 `json:"provider"`
	HasValuesSchema         bool                   `json:"has_values_schema"`
	ValuesSchema            json.RawMessage        `json:"values_schema,omitempty"`
	HasChangeLog            bool                   `json:"has_changelog"`
	Changes                 []*Change              `json:"changes"`
	ContainsSecurityUpdates bool                   `json:"contains_security_updates"`
	Prerelease              bool                   `json:"prerelease"`
	Maintainers             []*Maintainer          `json:"maintainers"`
	Recommendations         []*Recommendation      `json:"recommendations"`
	Repository              *Repository            `json:"repository"`
	TS                      int64                  `json:"ts,omitempty"`
	Stats                   *PackageStats          `json:"stats"`
}

// PackageManager describes the methods a PackageManager implementation must
// provide.
type PackageManager interface {
	Get(ctx context.Context, input *GetPackageInput) (*Package, error)
	GetChangeLogJSON(ctx context.Context, pkgID string) ([]byte, error)
	GetHarborReplicationDumpJSON(ctx context.Context) ([]byte, error)
	GetJSON(ctx context.Context, input *GetPackageInput) ([]byte, error)
	GetRandomJSON(ctx context.Context) ([]byte, error)
	GetSnapshotSecurityReportJSON(ctx context.Context, pkgID, version string) ([]byte, error)
	GetSnapshotsToScan(ctx context.Context) ([]*SnapshotToScan, error)
	GetStarredByUserJSON(ctx context.Context) ([]byte, error)
	GetStarsJSON(ctx context.Context, packageID string) ([]byte, error)
	GetStatsJSON(ctx context.Context) ([]byte, error)
	GetSummaryJSON(ctx context.Context, input *GetPackageInput) ([]byte, error)
	GetValuesSchemaJSON(ctx context.Context, pkgID, version string) ([]byte, error)
	Register(ctx context.Context, pkg *Package) error
	SearchJSON(ctx context.Context, input *SearchPackageInput) ([]byte, error)
	SearchMonocularJSON(ctx context.Context, baseURL, tsQueryWeb string) ([]byte, error)
	ToggleStar(ctx context.Context, packageID string) error
	UpdateSnapshotSecurityReport(ctx context.Context, r *SnapshotSecurityReport) error
	Unregister(ctx context.Context, pkg *Package) error
}

// PackageMetadata represents some metadata about a given package. It's usually
// provided by repositories publishers, to provide the required information
// about the content they'd like to be indexed.
type PackageMetadata struct {
	Version                 string            `yaml:"version"`
	Name                    string            `yaml:"name"`
	DisplayName             string            `yaml:"displayName"`
	CreatedAt               string            `yaml:"createdAt"`
	Description             string            `yaml:"description"`
	LogoPath                string            `yaml:"logoPath"`
	LogoURL                 string            `yaml:"logoURL"`
	Digest                  string            `yaml:"digest"`
	License                 string            `yaml:"license"`
	HomeURL                 string            `yaml:"homeURL"`
	AppVersion              string            `yaml:"appVersion"`
	PublisherID             string            `yaml:"publisherID"`
	ContainersImages        []*ContainerImage `yaml:"containersImages"`
	Operator                bool              `yaml:"operator"`
	Deprecated              bool              `yaml:"deprecated"`
	Keywords                []string          `yaml:"keywords"`
	Links                   []*Link           `yaml:"links"`
	Readme                  string            `yaml:"readme"`
	Install                 string            `yaml:"install"`
	Changes                 []*Change         `yaml:"changes"`
	ContainsSecurityUpdates bool              `yaml:"containsSecurityUpdates"`
	Prerelease              bool              `yaml:"prerelease"`
	Maintainers             []*Maintainer     `yaml:"maintainers"`
	Provider                *Provider         `yaml:"provider"`
	Ignore                  []string          `yaml:"ignore"`
	Recommendations         []*Recommendation `yaml:"recommendations"`
}

// PackageStats represents some statistics about a package.
type PackageStats struct {
	Subscriptions int `json:"subscriptions"`
	Webhooks      int `json:"webhooks"`
}

// Recommendation represents some information about a recommended package.
type Recommendation struct {
	URL string `json:"url" yaml:"url"`
}

// SnapshotSecurityReport represents some information about the security
// vulnerabilities the images used by a given package's snapshot may have.
type SnapshotSecurityReport struct {
	PackageID string                   `json:"package_id"`
	Version   string                   `json:"version"`
	Summary   *SecurityReportSummary   `json:"summary"`
	Full      map[string][]interface{} `json:"full"`
}

// SecurityReportSummary represents a summary of the security report.
type SecurityReportSummary struct {
	Critical int `json:"critical"`
	High     int `json:"high"`
	Medium   int `json:"medium"`
	Low      int `json:"low"`
	Unknown  int `json:"unknown"`
}

// SnapshotToScan represents some information about a package's snapshot that
// needs to be scanned for security vulnerabilities.
type SnapshotToScan struct {
	RepositoryID     string            `json:"repository_id"`
	PackageID        string            `json:"package_id"`
	PackageName      string            `json:"package_name"`
	Version          string            `json:"version"`
	ContainersImages []*ContainerImage `json:"containers_images"`
}

// Provider represents a package's provider.
type Provider struct {
	Name string `yaml:"name"`
}

// SearchPackageInput represents the query input when searching for packages.
type SearchPackageInput struct {
	Limit             int              `json:"limit,omitempty"`
	Offset            int              `json:"offset,omitempty"`
	Facets            bool             `json:"facets"`
	TSQueryWeb        string           `json:"ts_query_web,omitempty"`
	TSQuery           string           `json:"ts_query,omitempty"`
	Users             []string         `json:"users,omitempty"`
	Orgs              []string         `json:"orgs,omitempty"`
	Repositories      []string         `json:"repositories,omitempty"`
	RepositoryKinds   []RepositoryKind `json:"repository_kinds,omitempty"`
	VerifiedPublisher bool             `json:"verified_publisher"`
	Official          bool             `json:"official"`
	Operators         bool             `json:"operators"`
	Deprecated        bool             `json:"deprecated"`
	Licenses          []string         `json:"licenses,omitempty"`
	Capabilities      []string         `json:"capabilities,omitempty"`
}

// Version represents a package's version.
type Version struct {
	Version string `json:"version"`
	TS      int64  `json:"ts"`
}
