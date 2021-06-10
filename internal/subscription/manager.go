package subscription

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/util"
	"github.com/satori/uuid"
)

const (
	// Database queries
	addOptOutDBQ               = `select add_opt_out($1::jsonb)`
	addSubscriptionDBQ         = `select add_subscription($1::jsonb)`
	deleteOptOutDBQ            = `select delete_opt_out($1::uuid, $2::uuid)`
	deleteSubscriptionDBQ      = `select delete_subscription($1::jsonb)`
	getPkgSubscriptorsDBQ      = `select get_package_subscriptors($1::uuid, $2::integer)`
	getRepoSubscriptorsDBQ     = `select get_repository_subscriptors($1::uuid, $2::integer)`
	getUserOptOutEntriesDBQ    = `select * from get_user_opt_out_entries($1::uuid, $2::int, $3::int)`
	getUserPkgSubscriptionsDBQ = `select get_user_package_subscriptions($1::uuid, $2::uuid)`
	getUserSubscriptionsDBQ    = `select * from get_user_subscriptions($1::uuid, $2::int, $3::int)`
)

var (
	// validEventKinds contains the event kinds supported.
	validEventKinds = []hub.EventKind{
		hub.NewRelease,
		hub.SecurityAlert,
	}
)

// Manager provides an API to manage subscriptions.
type Manager struct {
	db hub.DB
}

// NewManager creates a new Manager instance.
func NewManager(db hub.DB) *Manager {
	return &Manager{
		db: db,
	}
}

// Add adds the provided subscription to the database.
func (m *Manager) Add(ctx context.Context, s *hub.Subscription) error {
	userID := ctx.Value(hub.UserIDKey).(string)
	s.UserID = userID
	if err := validateSubscription(s); err != nil {
		return err
	}
	sJSON, _ := json.Marshal(s)
	_, err := m.db.Exec(ctx, addSubscriptionDBQ, sJSON)
	return err
}

// AddOptOut adds an opt-out entry to the database.
func (m *Manager) AddOptOut(ctx context.Context, o *hub.OptOut) error {
	userID := ctx.Value(hub.UserIDKey).(string)
	o.UserID = userID
	if err := validateOptOut(o); err != nil {
		return err
	}
	oJSON, _ := json.Marshal(o)
	_, err := m.db.Exec(ctx, addOptOutDBQ, oJSON)
	return err
}

// Delete removes a subscription from the database.
func (m *Manager) Delete(ctx context.Context, s *hub.Subscription) error {
	userID := ctx.Value(hub.UserIDKey).(string)
	s.UserID = userID
	if err := validateSubscription(s); err != nil {
		return err
	}
	sJSON, _ := json.Marshal(s)
	_, err := m.db.Exec(ctx, deleteSubscriptionDBQ, sJSON)
	return err
}

// DeleteOptOut deletes an opt-out entry from the database.
func (m *Manager) DeleteOptOut(ctx context.Context, optOutID string) error {
	userID := ctx.Value(hub.UserIDKey).(string)
	if _, err := uuid.FromString(optOutID); err != nil {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid opt out id")
	}
	_, err := m.db.Exec(ctx, deleteOptOutDBQ, userID, optOutID)
	return err
}

// GetByPackageJSON returns the subscriptions the user has for a given package
// as json array of objects.
func (m *Manager) GetByPackageJSON(ctx context.Context, packageID string) ([]byte, error) {
	userID := ctx.Value(hub.UserIDKey).(string)
	if _, err := uuid.FromString(packageID); err != nil {
		return nil, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid package id")
	}
	return util.DBQueryJSON(ctx, m.db, getUserPkgSubscriptionsDBQ, userID, packageID)
}

// GetByUserJSON returns all the subscriptions of the user doing the request as
// as json array of objects.
func (m *Manager) GetByUserJSON(ctx context.Context, p *hub.Pagination) (*hub.JSONQueryResult, error) {
	userID := ctx.Value(hub.UserIDKey).(string)
	return util.DBQueryJSONWithPagination(ctx, m.db, getUserSubscriptionsDBQ, userID, p.Limit, p.Offset)
}

// GetOptOutListJSON returns all the opt-out entries of the user doing the
// request as as json array of objects.
func (m *Manager) GetOptOutListJSON(ctx context.Context, p *hub.Pagination) (*hub.JSONQueryResult, error) {
	userID := ctx.Value(hub.UserIDKey).(string)
	return util.DBQueryJSONWithPagination(ctx, m.db, getUserOptOutEntriesDBQ, userID, p.Limit, p.Offset)
}

// GetSubscriptors returns the users subscribed to receive notifications for
// certain kind of events.
func (m *Manager) GetSubscriptors(ctx context.Context, e *hub.Event) ([]*hub.User, error) {
	var dataJSON []byte
	var err error
	switch e.EventKind {
	case hub.NewRelease, hub.SecurityAlert:
		err = m.db.QueryRow(ctx, getPkgSubscriptorsDBQ, e.PackageID, e.EventKind).Scan(&dataJSON)
	case hub.RepositoryScanningErrors, hub.RepositoryTrackingErrors:
		err = m.db.QueryRow(ctx, getRepoSubscriptorsDBQ, e.RepositoryID, e.EventKind).Scan(&dataJSON)
	case hub.RepositoryOwnershipClaim:
		dataJSON, _ = json.Marshal(e.Data["subscriptors"])
	default:
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	var subscriptors []*hub.User
	if err := json.Unmarshal(dataJSON, &subscriptors); err != nil {
		return nil, err
	}
	return subscriptors, nil
}

// validateSubscription checks if the subscription provided is valid to be used
// as input for some database functions calls.
func validateSubscription(s *hub.Subscription) error {
	if _, err := uuid.FromString(s.PackageID); err != nil {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid package id")
	}
	if !isValidEventKind(s.EventKind) {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid event kind")
	}
	return nil
}

// validateOptOut checks if the opt-out information provided is valid to be
// used as input for some database functions calls.
func validateOptOut(o *hub.OptOut) error {
	if _, err := uuid.FromString(o.RepositoryID); err != nil {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid repository id")
	}
	switch o.EventKind {
	case hub.RepositoryScanningErrors, hub.RepositoryTrackingErrors:
	default:
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid event kind")
	}
	return nil
}

// isValidEventKind checks if the provided event kind is valid.
func isValidEventKind(kind hub.EventKind) bool {
	for _, validKind := range validEventKinds {
		if kind == validKind {
			return true
		}
	}
	return false
}
