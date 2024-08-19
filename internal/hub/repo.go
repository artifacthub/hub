package hub

import (
	"context"
	"encoding/json"
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

const (
	// Tekton catalog versioning kinds
	TektonDirBasedVersioning = "directory"
	TektonGitBasedVersioning = "git"
)

// ContainerImageData represents some data specific to repositories of the
// container image kind.
type ContainerImageData struct {
	Tags []ContainerImageTag `json:"tags"`
}

// ContainerImageTag represents some information about a container image tag.
type ContainerImageTag struct {
	Name    string `json:"name"`
	Mutable bool   `json:"mutable"`
}

// TektonData represents some data specific to repositories of the Tekton tasks
// or pipelines kinds.
type TektonData struct {
	Versioning string `json:"versioning"` // Options: directory or git
}

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

	// Keptn represents a repository with Keptn integrations.
	Keptn RepositoryKind = 10

	// TektonPipeline represents a repository with Tekton pipelines.
	TektonPipeline RepositoryKind = 11

	// Container represents a repository with containers images.
	Container RepositoryKind = 12

	// Kubewarden represents a repository with Kubewarden policies.
	Kubewarden RepositoryKind = 13

	// Gatekeeper represents a repository with Gatekeeper policies.
	Gatekeeper RepositoryKind = 14

	// Kyverno represents a repository with Kyverno policies.
	Kyverno RepositoryKind = 15

	// KnativeClientPlugin represents a repository with Knative client plugins.
	KnativeClientPlugin RepositoryKind = 16

	// Backstage represents a repository with Backstage plugins.
	Backstage RepositoryKind = 17

	// ArgoTemplate represents a repository with Argo templates.
	ArgoTemplate RepositoryKind = 18

	// KubeArmor represents a repository with KubeArmor policies.
	KubeArmor RepositoryKind = 19

	// KCL represents a repository with KCL modules.
	KCL RepositoryKind = 20

	// Headlamp represents a repository with Headlamp plugins.
	Headlamp RepositoryKind = 21

	// InspektorGadget represents a repository with Inspektor Gadgets.
	InspektorGadget RepositoryKind = 22

	// TektonStepAction represents a repository with Tekton stepactions.
	TektonStepAction RepositoryKind = 23

	// Meshery represents a repository with Meshery designs.
	Meshery RepositoryKind = 24

	// OpenCost represents a repository with OpenCost plugins.
	OpenCost RepositoryKind = 25

	// Radius represents a repository with Radius recipes.
	Radius RepositoryKind = 26
)

// GetKindName returns the name of the provided repository kind.
func GetKindName(kind RepositoryKind) string {
	switch kind {
	case ArgoTemplate:
		return "argo-template"
	case Backstage:
		return "backstage"
	case Container:
		return "container"
	case CoreDNS:
		return "coredns"
	case Falco:
		return "falco"
	case Gatekeeper:
		return "gatekeeper"
	case Headlamp:
		return "headlamp"
	case Helm:
		return "helm"
	case HelmPlugin:
		return "helm-plugin"
	case InspektorGadget:
		return "inspektor-gadget"
	case KCL:
		return "kcl"
	case KedaScaler:
		return "keda-scaler"
	case Keptn:
		return "keptn"
	case KnativeClientPlugin:
		return "knative-client-plugin"
	case Krew:
		return "krew"
	case KubeArmor:
		return "kubearmor"
	case Kubewarden:
		return "kubewarden"
	case Kyverno:
		return "kyverno"
	case Meshery:
		return "meshery"
	case OLM:
		return "olm"
	case OPA:
		return "opa"
	case OpenCost:
		return "opencost"
	case Radius:
		return "radius"
	case TBAction:
		return "tbaction"
	case TektonPipeline:
		return "tekton-pipeline"
	case TektonTask:
		return "tekton-task"
	case TektonStepAction:
		return "tekton-stepaction"
	default:
		return ""
	}
}

// GetKindFromName returns the kind of the provided repository from the name
// provided.
func GetKindFromName(kind string) (RepositoryKind, error) {
	switch kind {
	case "argo-template":
		return ArgoTemplate, nil
	case "backstage":
		return Backstage, nil
	case "container":
		return Container, nil
	case "coredns":
		return CoreDNS, nil
	case "falco":
		return Falco, nil
	case "gatekeeper":
		return Gatekeeper, nil
	case "headlamp":
		return Headlamp, nil
	case "helm":
		return Helm, nil
	case "helm-plugin":
		return HelmPlugin, nil
	case "inspektor-gadget":
		return InspektorGadget, nil
	case "kcl":
		return KCL, nil
	case "keda-scaler":
		return KedaScaler, nil
	case "keptn":
		return Keptn, nil
	case "knative-client-plugin":
		return KnativeClientPlugin, nil
	case "krew":
		return Krew, nil
	case "kubearmor":
		return KubeArmor, nil
	case "kubewarden":
		return Kubewarden, nil
	case "kyverno":
		return Kyverno, nil
	case "meshery":
		return Meshery, nil
	case "olm":
		return OLM, nil
	case "opa":
		return OPA, nil
	case "opencost":
		return OpenCost, nil
	case "radius":
		return Radius, nil
	case "tbaction":
		return TBAction, nil
	case "tekton-pipeline":
		return TektonPipeline, nil
	case "tekton-task":
		return TektonTask, nil
	case "tekton-stepaction":
		return TektonStepAction, nil
	default:
		return -1, errors.New("invalid kind name")
	}
}

// HelmIndexLoader interface defines the methods a Helm index loader
// implementation should provide.
type HelmIndexLoader interface {
	LoadIndex(r *Repository) (*helmrepo.IndexFile, string, error)
}

// OLMOCIExporter describes the methods an OLMOCIExporter implementation must
// provide.
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
	RepositoryID            string          `json:"repository_id"`
	Name                    string          `json:"name"`
	DisplayName             string          `json:"display_name"`
	URL                     string          `json:"url"`
	Branch                  string          `json:"branch"`
	Private                 bool            `json:"private"`
	AuthUser                string          `json:"auth_user"`
	AuthPass                string          `json:"auth_pass"`
	Digest                  string          `json:"digest"`
	Kind                    RepositoryKind  `json:"kind"`
	UserID                  string          `json:"user_id"`
	UserAlias               string          `json:"user_alias"`
	OrganizationID          string          `json:"organization_id"`
	OrganizationName        string          `json:"organization_name"`
	OrganizationDisplayName string          `json:"organization_display_name"`
	LastScanningErrors      string          `json:"last_scanning_errors"`
	LastTrackingErrors      string          `json:"last_tracking_errors"`
	VerifiedPublisher       bool            `json:"verified_publisher"`
	Official                bool            `json:"official"`
	CNCF                    bool            `json:"cncf"`
	Disabled                bool            `json:"disabled"`
	ScannerDisabled         bool            `json:"scanner_disabled"`
	Data                    json.RawMessage `json:"data,omitempty"`
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
	GetMetadata(r *Repository, basePath string) (*RepositoryMetadata, error)
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
	Owners       []*Owner                 `yaml:"owners,omitempty"`
	Ignore       []*RepositoryIgnoreEntry `yaml:"ignore,omitempty"`
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
	URL                string           `json:"url,omitempty"`
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
