package hub

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	trivy "github.com/aquasecurity/trivy/pkg/types"
	"github.com/mitchellh/hashstructure/v2"
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

// Changelog represents a package's changelog.
type Changelog []*VersionChanges

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
	Name        string   `json:"name" yaml:"name"`
	Image       string   `json:"image" yaml:"image"`
	Whitelisted bool     `json:"whitelisted" yaml:"whitelisted"`
	Platforms   []string `json:"platforms" yaml:"platforms"`
}

// Maintainer represents a package's maintainer.
type Maintainer struct {
	MaintainerID string `json:"maintainer_id"`
	Name         string `json:"name" yaml:"name"`
	Email        string `json:"email" yaml:"email"`
}

// Package represents a Kubernetes package.
type Package struct {
	PackageID                      string                 `json:"package_id" hash:"ignore"`
	Name                           string                 `json:"name"`
	NormalizedName                 string                 `json:"normalized_name" hash:"ignore"`
	AlternativeName                string                 `json:"alternative_name"`
	Category                       PackageCategory        `json:"category"`
	LogoURL                        string                 `json:"logo_url"`
	LogoImageID                    string                 `json:"logo_image_id" hash:"ignore"`
	IsOperator                     bool                   `json:"is_operator"`
	Official                       bool                   `json:"official" hash:"ignore"`
	CNCF                           bool                   `json:"cncf" hash:"ignore"`
	Channels                       []*Channel             `json:"channels"`
	DefaultChannel                 string                 `json:"default_channel"`
	DisplayName                    string                 `json:"display_name"`
	Description                    string                 `json:"description"`
	Keywords                       []string               `json:"keywords"`
	HomeURL                        string                 `json:"home_url"`
	Readme                         string                 `json:"readme"`
	Install                        string                 `json:"install"`
	Links                          []*Link                `json:"links"`
	Capabilities                   string                 `json:"capabilities"`
	CRDs                           []interface{}          `json:"crds"`
	CRDsExamples                   []interface{}          `json:"crds_examples"`
	SecurityReportSummary          *SecurityReportSummary `json:"security_report_summary" hash:"ignore"`
	SecurityReportCreatedAt        int64                  `json:"security_report_created_at,omitempty" hash:"ignore"`
	Data                           map[string]interface{} `json:"data"`
	Version                        string                 `json:"version"`
	AvailableVersions              []*Version             `json:"available_versions" hash:"ignore"`
	AppVersion                     string                 `json:"app_version"`
	Digest                         string                 `json:"digest"`
	Deprecated                     bool                   `json:"deprecated"`
	License                        string                 `json:"license"`
	Signed                         bool                   `json:"signed"`
	Signatures                     []string               `json:"signatures"`
	ContentURL                     string                 `json:"content_url"`
	ContainersImages               []*ContainerImage      `json:"containers_images"`
	AllContainersImagesWhitelisted bool                   `json:"all_containers_images_whitelisted" hash:"ignore"`
	Provider                       string                 `json:"provider"`
	HasValuesSchema                bool                   `json:"has_values_schema" hash:"ignore"`
	ValuesSchema                   json.RawMessage        `json:"values_schema,omitempty"`
	HasChangelog                   bool                   `json:"has_changelog" hash:"ignore"`
	Changes                        []*Change              `json:"changes"`
	ContainsSecurityUpdates        bool                   `json:"contains_security_updates"`
	Prerelease                     bool                   `json:"prerelease"`
	Maintainers                    []*Maintainer          `json:"maintainers"`
	Recommendations                []*Recommendation      `json:"recommendations"`
	Screenshots                    []*Screenshot          `json:"screenshots"`
	SignKey                        *SignKey               `json:"sign_key"`
	Repository                     *Repository            `json:"repository" hash:"ignore"`
	TS                             int64                  `json:"ts,omitempty" hash:"ignore"`
	Stats                          *PackageStats          `json:"stats" hash:"ignore"`
	ProductionOrganizations        []*Organization        `json:"production_organizations" hash:"ignore"`
	RelativePath                   string                 `json:"relative_path"`
}

// SetAutoGeneratedDigest sets an auto generated digest in the package.
func (p *Package) SetAutoGeneratedDigest() error {
	opts := &hashstructure.HashOptions{
		IgnoreZeroValue: true,
		SlicesAsSets:    true,
		ZeroNil:         true,
	}
	hash, err := hashstructure.Hash(p, hashstructure.FormatV2, opts)
	if err != nil {
		return err
	}
	p.Digest = fmt.Sprintf("%d", hash)
	return nil
}

// PackageCategory represents the category of a given package.
type PackageCategory int64

const (
	SkipCategoryPrediction PackageCategory = -1
	UnknownCategory        PackageCategory = 0
	AIMachineLearning      PackageCategory = 1
	Database               PackageCategory = 2
	IntegrationDelivery    PackageCategory = 3
	MonitoringLogging      PackageCategory = 4
	Networking             PackageCategory = 5
	Security               PackageCategory = 6
	Storage                PackageCategory = 7
	StreamingMessaging     PackageCategory = 8
)

// PackageCategoryFromName returns the corresponding category from the name
// provided.
func PackageCategoryFromName(category string) (PackageCategory, error) {
	switch category {
	case "skip-prediction":
		return SkipCategoryPrediction, nil
	case "ai-machine-learning":
		return AIMachineLearning, nil
	case "database":
		return Database, nil
	case "integration-delivery":
		return IntegrationDelivery, nil
	case "monitoring-logging":
		return MonitoringLogging, nil
	case "networking":
		return Networking, nil
	case "security":
		return Security, nil
	case "storage":
		return Storage, nil
	case "streaming-messaging":
		return StreamingMessaging, nil
	default:
		return -9, errors.New("invalid category name")
	}
}

// PackageCategoryClassifier describes the methods a PackageCategoryClassifier
// implementation must provide.
type PackageCategoryClassifier interface {
	Predict(p *Package) PackageCategory
}

// PackageManager describes the methods a PackageManager implementation must
// provide.
type PackageManager interface {
	AddProductionUsage(ctx context.Context, repoName, pkgName, orgName string) error
	DeleteProductionUsage(ctx context.Context, repoName, pkgName, orgName string) error
	Get(ctx context.Context, input *GetPackageInput) (*Package, error)
	GetChangelog(ctx context.Context, pkgID string) (*Changelog, error)
	GetHarborReplicationDumpJSON(ctx context.Context) ([]byte, error)
	GetHelmExporterDumpJSON(ctx context.Context) ([]byte, error)
	GetJSON(ctx context.Context, input *GetPackageInput) ([]byte, error)
	GetNovaDumpJSON(ctx context.Context) ([]byte, error)
	GetProductionUsageJSON(ctx context.Context, repoName, pkgName string) ([]byte, error)
	GetRandomJSON(ctx context.Context) ([]byte, error)
	GetSnapshotSecurityReportJSON(ctx context.Context, pkgID, version string) ([]byte, error)
	GetSnapshotsToScan(ctx context.Context) ([]*SnapshotToScan, error)
	GetStarredByUserJSON(ctx context.Context, p *Pagination) (*JSONQueryResult, error)
	GetStarsJSON(ctx context.Context, packageID string) ([]byte, error)
	GetStatsJSON(ctx context.Context) ([]byte, error)
	GetSummaryJSON(ctx context.Context, input *GetPackageInput) ([]byte, error)
	GetValuesSchemaJSON(ctx context.Context, pkgID, version string) ([]byte, error)
	GetViewsJSON(ctx context.Context, packageID string) ([]byte, error)
	Register(ctx context.Context, pkg *Package) error
	SearchJSON(ctx context.Context, input *SearchPackageInput) (*JSONQueryResult, error)
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
	AlternativeName         string            `yaml:"alternativeName"`
	Category                string            `yaml:"category"`
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
	Screenshots             []*Screenshot     `yaml:"screenshots"`
	Annotations             map[string]string `yaml:"annotations"`
}

// PackageStats represents some statistics about a package.
type PackageStats struct {
	Subscriptions int `json:"subscriptions"`
	Webhooks      int `json:"webhooks"`
}

// Provider represents a package's provider.
type Provider struct {
	Name string `yaml:"name"`
}

// Recommendation represents some information about a recommended package.
type Recommendation struct {
	URL string `json:"url" yaml:"url"`
}

// Screenshot represents a screenshot associated with a package.
type Screenshot struct {
	Title string `json:"title" yaml:"title"`
	URL   string `json:"url" yaml:"url"`
}

// SnapshotSecurityReport represents some information about the security
// vulnerabilities the images used by a given package's snapshot may have.
type SnapshotSecurityReport struct {
	PackageID     string                   `json:"package_id"`
	Version       string                   `json:"version"`
	AlertDigest   string                   `json:"alert_digest"`
	ImagesReports map[string]*trivy.Report `json:"images_reports"`
	Summary       *SecurityReportSummary   `json:"summary"`
}

// SecurityReportSummary represents a summary of the security report.
type SecurityReportSummary struct {
	Critical int `json:"critical"`
	High     int `json:"high"`
	Medium   int `json:"medium"`
	Low      int `json:"low"`
	Unknown  int `json:"unknown"`
}

// SignKey represents a key used to sign a package version.
type SignKey struct {
	Fingerprint string `json:"fingerprint" yaml:"fingerprint"`
	URL         string `json:"url" yaml:"url"`
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

// SearchPackageInput represents the query input when searching for packages.
type SearchPackageInput struct {
	Limit             int               `json:"limit,omitempty"`
	Offset            int               `json:"offset,omitempty"`
	Facets            bool              `json:"facets"`
	TSQueryWeb        string            `json:"ts_query_web,omitempty"`
	TSQuery           string            `json:"ts_query,omitempty"`
	Users             []string          `json:"users,omitempty"`
	Orgs              []string          `json:"orgs,omitempty"`
	Repositories      []string          `json:"repositories,omitempty"`
	RepositoryKinds   []RepositoryKind  `json:"repository_kinds,omitempty"`
	Categories        []PackageCategory `json:"categories,omitempty"`
	VerifiedPublisher bool              `json:"verified_publisher"`
	Official          bool              `json:"official"`
	CNCF              bool              `json:"cncf"`
	Operators         bool              `json:"operators"`
	Deprecated        bool              `json:"deprecated"`
	Licenses          []string          `json:"licenses,omitempty"`
	Capabilities      []string          `json:"capabilities,omitempty"`
	Sort              string            `json:"sort,omitempty"`
}

// Version represents a package's version.
type Version struct {
	Version string `json:"version"`
	TS      int64  `json:"ts"`
}

// VersionChanges represents the changes introduced by a given package's
// version along with some extra metadata.
type VersionChanges struct {
	Version                 string    `json:"version"`
	Changes                 []*Change `json:"changes"`
	TS                      int64     `json:"ts"`
	ContainsSecurityUpdates bool      `json:"contains_security_updates"`
	Prerelease              bool      `json:"prerelease"`
}

// ViewsTracker describes the methods a ViewsTracker implementation must
// provide.
type ViewsTracker interface {
	TrackView(packageID, version string) error
}
