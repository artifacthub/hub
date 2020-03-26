package hub

import (
	"context"

	"github.com/artifacthub/hub/internal/email"
	"github.com/jackc/pgconn"
	"github.com/jackc/pgx/v4"
)

type userIDKey struct{}

// UserIDKey represents the key used for the userID value inside a context.
var UserIDKey = userIDKey{}

// DB defines the methods the database handler must provide.
type DB interface {
	QueryRow(ctx context.Context, sql string, args ...interface{}) pgx.Row
	Exec(ctx context.Context, sql string, arguments ...interface{}) (pgconn.CommandTag, error)
}

// EmailSender defines the methods the email sender must provide.
type EmailSender interface {
	SendEmail(data *email.Data) error
}

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

// Session represents some information about a user session.
type Session struct {
	SessionID string `json:"session_id"`
	UserID    string `json:"user_id"`
	IP        string `json:"ip"`
	UserAgent string `json:"user_agent"`
}

// Organization represents an entity with one or more users associated that can
// own packages and other entities like chart repositories.
type Organization struct {
	OrganizationID string `json:"organization_id"`
	Name           string `json:"name"`
	DisplayName    string `json:"display_name"`
	Description    string `json:"description"`
	HomeURL        string `json:"home_url"`
	LogoURL        string `json:"logo_url"`
	LogoImageID    string `json:"logo_image_id"`
}
