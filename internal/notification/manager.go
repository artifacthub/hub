package notification

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/jackc/pgx/v4"
	"github.com/satori/uuid"
)

const (
	// Database queries
	addNotificationDBQ          = `select add_notification($1::jsonb)`
	getPendingNotificationDBQ   = `select get_pending_notification()`
	updateNotificationStatusDBQ = `select update_notification_status($1::uuid, $2::boolean, $3::text)`
)

// Manager provides an API to manage notifications.
type Manager struct{}

// NewManager creates a new Manager instance.
func NewManager() *Manager {
	return &Manager{}
}

// Add adds the provided notification to the database.
func (m *Manager) Add(ctx context.Context, tx pgx.Tx, n *hub.Notification) error {
	if _, err := uuid.FromString(n.Event.EventID); err != nil {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid event id")
	}
	if n.User == nil && n.Webhook == nil {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "user or webhook must be provided")
	}
	if n.User != nil && n.Webhook != nil {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "both user and webhook were provided")
	}
	if n.User != nil {
		if _, err := uuid.FromString(n.User.UserID); err != nil {
			return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid user id")
		}
	}
	if n.Webhook != nil {
		if _, err := uuid.FromString(n.Webhook.WebhookID); err != nil {
			return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid webhook id")
		}
	}
	nJSON, _ := json.Marshal(n)
	_, err := tx.Exec(ctx, addNotificationDBQ, nJSON)
	return err
}

// GetPending returns a pending notification to be delivered if available.
func (m *Manager) GetPending(ctx context.Context, tx pgx.Tx) (*hub.Notification, error) {
	var dataJSON []byte
	if err := tx.QueryRow(ctx, getPendingNotificationDBQ).Scan(&dataJSON); err != nil {
		return nil, err
	}
	var n *hub.Notification
	if err := json.Unmarshal(dataJSON, &n); err != nil {
		return nil, err
	}
	return n, nil
}

// UpdateStatus the provided notification status in the database.
func (m *Manager) UpdateStatus(
	ctx context.Context,
	tx pgx.Tx,
	notificationID string,
	processed bool,
	processedErr error,
) error {
	if _, err := uuid.FromString(notificationID); err != nil {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid notification id")
	}
	var processedErrStr string
	if processedErr != nil {
		processedErrStr = processedErr.Error()
	}
	_, err := tx.Exec(ctx, updateNotificationStatusDBQ, notificationID, processed, processedErrStr)
	return err
}
