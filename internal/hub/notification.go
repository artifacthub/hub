package hub

import (
	"context"

	"github.com/jackc/pgx/v4"
)

// Notification represents the details of a notification that will be sent to
// a set of subscribers interested on it.
type Notification struct {
	NotificationID   string           `json:"notification_id"`
	PackageVersion   string           `json:"package_version"`
	PackageID        string           `json:"package_id"`
	NotificationKind NotificationKind `json:"notification_kind"`
}

// NotificationKind represents the kind of a notification.
type NotificationKind int64

const (
	// NewRelease represents a notification for a new package release.
	NewRelease NotificationKind = 0

	// SecurityAlert represents a notification for a security alert.
	SecurityAlert NotificationKind = 1
)

// NotificationManager describes the methods a NotificationManager
// implementation must provide.
type NotificationManager interface {
	GetPending(ctx context.Context, tx pgx.Tx) (*Notification, error)
}
