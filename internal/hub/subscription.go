package hub

import "context"

// OptOut represents a user's opt-out entry to stop receiving notifications
// about a given repository and event kind.
type OptOut struct {
	OptOutID     string    `json:"opt_out_id"`
	UserID       string    `json:"user_id"`
	RepositoryID string    `json:"repository_id"`
	EventKind    EventKind `json:"event_kind"`
}

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
	AddOptOut(ctx context.Context, o *OptOut) error
	Delete(ctx context.Context, s *Subscription) error
	DeleteOptOut(ctx context.Context, optOutID string) error
	GetByPackageJSON(ctx context.Context, packageID string) ([]byte, error)
	GetByUserJSON(ctx context.Context, p *Pagination) (*JSONQueryResult, error)
	GetOptOutListJSON(ctx context.Context, p *Pagination) (*JSONQueryResult, error)
	GetSubscriptors(ctx context.Context, e *Event) ([]*User, error)
}
