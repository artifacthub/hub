package hub

type userIDKey struct{}

// UserIDKey represents the key used for the userID value inside a context.
var UserIDKey = userIDKey{}

// ChartRepository represents a Helm chart repository.
type ChartRepository struct {
	ChartRepositoryID string `json:"chart_repository_id"`
	Name              string `json:"name"`
	DisplayName       string `json:"display_name"`
	URL               string `json:"url"`
	UserID            string `json:"user_id"`
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

	// Falco represents a set of Falco rules.
	Falco PackageKind = 1

	// OPA represents a set of OPA policies.
	OPA PackageKind = 2
)

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
	ChartRepository   *ChartRepository       `json:"chart_repository"`
}

// SearchPackageInput represents the query input when searching for packages.
type SearchPackageInput struct {
	Limit             int           `json:"limit,omitempty"`
	Offset            int           `json:"offset,omitempty"`
	Facets            bool          `json:"facets"`
	Text              string        `json:"text"`
	PackageKinds      []PackageKind `json:"package_kinds,omitempty"`
	ChartRepositories []string      `json:"chart_repositories,omitempty"`
	Deprecated        bool          `json:"deprecated"`
}

// GetPackageInput represents the input used to get a specific package.
type GetPackageInput struct {
	ChartRepositoryName string `json:"chart_repository_name"`
	PackageName         string `json:"package_name"`
	Version             string `json:"version"`
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
