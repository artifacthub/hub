package subscription

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/satori/uuid"
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
	query := "select add_subscription($1::jsonb)"
	sJSON, _ := json.Marshal(s)
	_, err := m.db.Exec(ctx, query, sJSON)
	return err
}

// Delete removes a subscription from the database.
func (m *Manager) Delete(ctx context.Context, s *hub.Subscription) error {
	userID := ctx.Value(hub.UserIDKey).(string)
	s.UserID = userID
	if err := validateSubscription(s); err != nil {
		return err
	}
	query := "select delete_subscription($1::jsonb)"
	sJSON, _ := json.Marshal(s)
	_, err := m.db.Exec(ctx, query, sJSON)
	return err
}

// GetByPackageJSON returns the subscriptions the user has for a given package
// as json array of objects.
func (m *Manager) GetByPackageJSON(ctx context.Context, packageID string) ([]byte, error) {
	userID := ctx.Value(hub.UserIDKey).(string)
	if _, err := uuid.FromString(packageID); err != nil {
		return nil, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid package id")
	}
	query := "select get_package_subscriptions($1::uuid, $2::uuid)"
	var dataJSON []byte
	if err := m.db.QueryRow(ctx, query, userID, packageID).Scan(&dataJSON); err != nil {
		return nil, err
	}
	return dataJSON, nil
}

// GetByUserJSON returns all the subscriptions of the user doing the request as
// as json array of objects.
func (m *Manager) GetByUserJSON(ctx context.Context) ([]byte, error) {
	userID := ctx.Value(hub.UserIDKey).(string)
	query := "select get_user_subscriptions($1::uuid)"
	var dataJSON []byte
	if err := m.db.QueryRow(ctx, query, userID).Scan(&dataJSON); err != nil {
		return nil, err
	}
	return dataJSON, nil
}

// GetSubscriptors returns the users subscribed to a package to receive
// notifications for certain kind of events.
func (m *Manager) GetSubscriptors(
	ctx context.Context,
	packageID string,
	eventKind hub.EventKind,
) ([]*hub.User, error) {
	if _, err := uuid.FromString(packageID); err != nil {
		return nil, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid package id")
	}
	if eventKind != hub.NewRelease {
		return nil, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid event kind")
	}

	query := "select get_subscriptors($1::uuid, $2::integer)"
	var dataJSON []byte
	err := m.db.QueryRow(ctx, query, packageID, eventKind).Scan(&dataJSON)
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
	if s.EventKind != hub.NewRelease {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid event kind")
	}
	return nil
}
