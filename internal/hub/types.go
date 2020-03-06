package hub

// ChartRepository represents a Helm chart repository.
type ChartRepository struct {
	ChartRepositoryID string `json:"chart_repository_id"`
	Name              string `json:"name"`
	DisplayName       string `json:"display_name"`
	URL               string `json:"url"`
}

// OperatorProvider represents an entity that provides operators that can be
// managed by the Operator Lifecycle Manager (part of the Operator Framework).
type OperatorProvider struct {
	OperatorProviderID string `json:"operator_provider_id"`
	Name               string `json:"name"`
}

// OperatorCategory represents a category an operator may belong to.
type OperatorCategory struct {
	OperatorCategoryID string `json:"operator_category_id"`
	Name               string `json:"name"`
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

// PackageKind represents the kind of a given package.
type PackageKind int64

const (
	// Chart represents a Helm chart.
	Chart PackageKind = 0

	// Operator represents an operator that can be managed by the Operator
	// Lifecycle Manager (Operator Framework).
	Operator PackageKind = 1
)

// Package represents a Kubernetes package.
type Package struct {
	PackageID         string            `json:"package_id"`
	Kind              PackageKind       `json:"kind"`
	Name              string            `json:"name"`
	DisplayName       string            `json:"display_name"`
	Description       string            `json:"description"`
	HomeURL           string            `json:"home_url"`
	LogoURL           string            `json:"logo_url"`
	LogoImageID       string            `json:"logo_image_id"`
	Keywords          []string          `json:"keywords"`
	Readme            string            `json:"readme"`
	Links             []*Link           `json:"links"`
	Version           string            `json:"version"`
	AvailableVersions []string          `json:"available_versions"`
	AppVersion        string            `json:"app_version"`
	Digest            string            `json:"digest"`
	Maintainers       []*Maintainer     `json:"maintainers"`
	ChartRepository   *ChartRepository  `json:"chart_repository"`
	OperatorProvider  *OperatorProvider `json:"operator_provider"`
}

// Query represents the query used when searching for packages.
type Query struct {
	Limit             int           `json:"limit,omitempty"`
	Offset            int           `json:"offset,omitempty"`
	Facets            bool          `json:"facets"`
	Text              string        `json:"text"`
	PackageKinds      []PackageKind `json:"package_kinds,omitempty"`
	ChartRepositories []string      `json:"chart_repositories,omitempty"`
}

// GetPackageInput represents the input used to get a specific package.
type GetPackageInput struct {
	Kind                PackageKind `json:"kind"`
	ChartRepositoryName string      `json:"chart_repository_name"`
	PackageName         string      `json:"package_name"`
	Version             string      `json:"version"`
}

// User represents a Hub user.
type User struct {
	UserID        string `json:"user_id"`
	Alias         string `json:"alias"`
	FirstName     string `json:"first_name"`
	LastName      string `json:"last_name"`
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	Password      string `json:"password"`
}

// CheckCredentialsOutput represents the output returned by the
// CheckCredentials method.
type CheckCredentialsOutput struct {
	Valid  bool   `json:"valid"`
	UserID string `json:"user_id"`
}

// Session represents some information about a user session.
type Session struct {
	SessionID string `json:"session_id"`
	UserID    string `json:"user_id"`
	IP        string `json:"ip"`
	UserAgent string `json:"user_agent"`
}

// CheckSessionOutput represents the output returned by the CheckSession method.
type CheckSessionOutput struct {
	Valid  bool   `json:"valid"`
	UserID string `json:"user_id"`
}
