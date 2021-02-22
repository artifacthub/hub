package hub

import (
	"context"

	"github.com/jackc/pgx/v4"
)

// Event represents the details of an event.
type Event struct {
	EventID        string                 `json:"event_id"`
	EventKind      EventKind              `json:"event_kind"`
	RepositoryID   string                 `json:"repository_id"`
	PackageID      string                 `json:"package_id"`
	PackageVersion string                 `json:"package_version"`
	Data           map[string]interface{} `json:"data"`
}

// EventKind represents the kind of an event.
type EventKind int64

const (
	// NewRelease represents an event for a new package release.
	NewRelease EventKind = 0

	// SecurityAlert represents an event for a security alert.
	SecurityAlert EventKind = 1

	// RepositoryTrackingErrors represents an event for errors that occur while
	// a repository is being tracked.
	RepositoryTrackingErrors EventKind = 2

	// RepositoryOwnershipClaim represents an event for a repository ownership
	// claim.
	RepositoryOwnershipClaim EventKind = 3

	// RepositoryScanningErrors represents an event for errors that occur while
	// a repository is being scanned.
	RepositoryScanningErrors EventKind = 4
)

// EventManager describes the methods an EventManager implementation must
// provide.
type EventManager interface {
	GetPending(ctx context.Context, tx pgx.Tx) (*Event, error)
}
