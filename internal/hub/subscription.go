package hub

import "context"

// Subscription represents a user's subscription to receive notifications about
// a given package and event kind.
type Subscription struct {
	UserID    string    `json:"user_id"`
	PackageID string    `json:"package_id"`
	EventKind EventKind `json:"event_kind"`
}

// SubscriptionManager describes the methods a SubscriptionManager
// implementation must provide.
type SubscriptionManager interface {
	Add(ctx context.Context, s *Subscription) error
	Delete(ctx context.Context, s *Subscription) error
	GetByPackageJSON(ctx context.Context, packageID string) ([]byte, error)
	GetByUserJSON(ctx context.Context) ([]byte, error)
	GetSubscriptors(ctx context.Context, packageID string, eventKind EventKind) ([]*User, error)
}
