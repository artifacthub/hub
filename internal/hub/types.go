package hub

import (
	"context"

	"github.com/jackc/pgconn"
	"github.com/jackc/pgx/v4"
)

// DB defines the methods the database handler must provide.
type DB interface {
	QueryRow(ctx context.Context, sql string, args ...interface{}) pgx.Row
	Exec(ctx context.Context, sql string, arguments ...interface{}) (pgconn.CommandTag, error)
}

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
	Facets               bool          `json:"facets"`
	Text                 string        `json:"text"`
	PackageKinds         []PackageKind `json:"package_kinds,omitempty"`
	ChartRepositoriesIDs []string      `json:"chart_repositories_ids,omitempty"`
}
