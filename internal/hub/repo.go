package hub

import (
	"context"
	"errors"

	helmrepo "helm.sh/helm/v3/pkg/repo"
)

const (
	// RepositoryMetadataFile represents the name of the file where the
	// Artifact Hub metadata for a given repository is stored.
	RepositoryMetadataFile = "artifacthub-repo"

	// RepositoryOCIPrefix represents the prefix expected in the url when the
	// repository is stored in a OCI registry.
	RepositoryOCIPrefix = "oci://"
)

// RepositoryKind represents the kind of a given repository.
type RepositoryKind int64

const (
	// Helm represents a repository with Helm charts.
	Helm RepositoryKind = 0

	// Falco represents a repository with Falco rules.
	Falco RepositoryKind = 1

	// OPA represents a repository with OPA policies.
	OPA RepositoryKind = 2

	// OLM represents a repository with OLM operators.
	OLM RepositoryKind = 3

	// TBAction represents a repository with Tinkerbell actions.
	TBAction RepositoryKind = 4

	// Krew represents a repository with kubectl plugins that can be managed by
	// the Krew plugin manager.
	Krew RepositoryKind = 5

	// HelmPlugin represents a repository with Helm plugins.
	HelmPlugin RepositoryKind = 6

	// TektonTask represents a repository with Tekton tasks.
	TektonTask RepositoryKind = 7

	// KedaScaler represents a repository with KEDA scalers.
	KedaScaler RepositoryKind = 8

	// CoreDNS represents a repository with CoreDNS plugins.
	CoreDNS RepositoryKind = 9
)

// GetKindName returns the name of the provided repository kind.
func GetKindName(kind RepositoryKind) string {
	switch kind {
	case CoreDNS:
		return "coredns"
	case Falco:
		return "falco"
	case Helm:
		return "helm"
	case HelmPlugin:
		return "helm-plugin"
	case KedaScaler:
		return "keda-scaler"
	case Krew:
		return "krew"
	case OLM:
		return "olm"
	case OPA:
		return "opa"
	case TBAction:
		return "tbaction"
	case TektonTask:
		return "tekton-task"
	default:
		return ""
	}
}

// GetKindFromName returns the kind of the provided repository from the name
// provided.
func GetKindFromName(kind string) (RepositoryKind, error) {
	switch kind {
	case "coredns":
		return CoreDNS, nil
	case "falco":
		return Falco, nil
	case "helm":
		return Helm, nil
	case "helm-plugin":
		return HelmPlugin, nil
	case "keda-scaler":
		return KedaScaler, nil
	case "krew":
		return Krew, nil
	case "olm":
		return OLM, nil
	case "opa":
		return OPA, nil
	case "tbaction":
		return TBAction, nil
	case "tekton-task":
		return TektonTask, nil
	default:
		return -1, errors.New("invalid kind name")
	}
}

// HelmIndexLoader interface defines the methods a Helm index loader
// implementation should provide.
type HelmIndexLoader interface {
	LoadIndex(r *Repository) (*helmrepo.IndexFile, string, error)
}

// OCITagsGetter is the interface that wraps the Tags method, used to get all
// the tags available for a given repository in a OCI registry.
type OCITagsGetter interface {
	Tags(ctx context.Context, r *Repository) ([]string, error)
}

// OLMOCIExporter describes the methods an OLMOCIExporter implementation must
// must provide.
type OLMOCIExporter interface {
	ExportRepository(ctx context.Context, r *Repository) (tmpDir string, err error)
}

// Owner represents some details about a repository's owner.
type Owner struct {
	Name  string `yaml:"name"`
	Email string `yaml:"email"`
}

// Repository represents a packages repository.
type Repository struct {
	RepositoryID            string         `json:"repository_id"`
	Name                    string         `json:"name"`
	DisplayName             string         `json:"display_name"`
	URL                     string         `json:"url"`
	Branch                  string         `json:"branch"`
	Private                 bool           `json:"private"`
	AuthUser                string         `json:"auth_user"`
	AuthPass                string         `json:"auth_pass"`
	Digest                  string         `json:"digest"`
	Kind                    RepositoryKind `json:"kind"`
	UserID                  string         `json:"user_id"`
	UserAlias               string         `json:"user_alias"`
	OrganizationID          string         `json:"organization_id"`
	OrganizationName        string         `json:"organization_name"`
	OrganizationDisplayName string         `json:"organization_display_name"`
	LastScanningErrors      string         `json:"last_scanning_errors"`
	LastTrackingErrors      string         `json:"last_tracking_errors"`
	VerifiedPublisher       bool           `json:"verified_publisher"`
	Official                bool           `json:"official"`
	Disabled                bool           `json:"disabled"`
	ScannerDisabled         bool           `json:"scanner_disabled"`
}

// RepositoryCloner describes the methods a RepositoryCloner implementation
// must provide.
type RepositoryCloner interface {
	// CloneRepository clones the packages repository provided in a temporary
	// dir, returning the temporary directory path and the path where the
	// packages are located. It's the caller's responsibility to delete the
	// temporary dir when done.
	CloneRepository(ctx context.Context, r *Repository) (tmpDir string, packagesPath string, err error)
}

// RepositoryManager describes the methods an RepositoryManager
// implementation must provide.
type RepositoryManager interface {
	Add(ctx context.Context, orgName string, r *Repository) error
	CheckAvailability(ctx context.Context, resourceKind, value string) (bool, error)
	ClaimOwnership(ctx context.Context, name, orgName string) error
	Delete(ctx context.Context, name string) error
	GetByID(ctx context.Context, repositoryID string, includeCredentials bool) (*Repository, error)
	GetByName(ctx context.Context, name string, includeCredentials bool) (*Repository, error)
	GetMetadata(mdFile string) (*RepositoryMetadata, error)
	GetPackagesDigest(ctx context.Context, repositoryID string) (map[string]string, error)
	GetRemoteDigest(ctx context.Context, r *Repository) (string, error)
	Search(ctx context.Context, input *SearchRepositoryInput) (*SearchRepositoryResult, error)
	SearchJSON(ctx context.Context, input *SearchRepositoryInput) (*JSONQueryResult, error)
	SetLastScanningResults(ctx context.Context, repositoryID, errs string) error
	SetLastTrackingResults(ctx context.Context, repositoryID, errs string) error
	SetVerifiedPublisher(ctx context.Context, repositoryID string, verified bool) error
	Transfer(ctx context.Context, name, orgName string, ownershipClaim bool) error
	Update(ctx context.Context, r *Repository) error
	UpdateDigest(ctx context.Context, repositoryID, digest string) error
}

// RepositoryMetadata represents some metadata about a given repository. It's
// usually provided by repositories publishers, to provide some extra context
// about the repository they'd like to publish.
type RepositoryMetadata struct {
	RepositoryID string                   `yaml:"repositoryID"`
	Owners       []*Owner                 `yaml:"owners"`
	Ignore       []*RepositoryIgnoreEntry `yaml:"ignore"`
}

// RepositoryIgnoreEntry represents an entry in the ignore list. This list is
// meant to be used as a way to exclude packages from being indexed by Artifact
// Hub. The name corresponds to a package name, and it must be an exact match.
// The version field is a regular expression.
type RepositoryIgnoreEntry struct {
	Name    string `yaml:"name"`
	Version string `yaml:"version"`
}

// SearchRepositoryInput represents the query input when searching for repositories.
type SearchRepositoryInput struct {
	Name               string           `json:"name,omitempty"`
	Kinds              []RepositoryKind `json:"kinds,omitempty"`
	Orgs               []string         `json:"orgs,omitempty"`
	Users              []string         `json:"users,omitempty"`
	IncludeCredentials bool             `json:"include_credentials"`
	Limit              int              `json:"limit,omitempty"`
	Offset             int              `json:"offset,omitempty"`
}

// SearchRepositoryResult represents the result of a repositories search.
type SearchRepositoryResult struct {
	Repositories []*Repository
	TotalCount   int
}
