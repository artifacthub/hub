package notification

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/jackc/pgx/v4"
	"github.com/satori/uuid"
)

var (
	// ErrInvalidInput indicates that the input provided is not valid.
	ErrInvalidInput = errors.New("invalid input")
)

// Manager provides an API to manage notifications.
type Manager struct{}

// NewManager creates a new Manager instance.
func NewManager() *Manager {
	return &Manager{}
}

// Add adds the provided notification to the database.
func (m *Manager) Add(ctx context.Context, tx pgx.Tx, eventID, userID string) error {
	if _, err := uuid.FromString(eventID); err != nil {
		return fmt.Errorf("%w: %s", ErrInvalidInput, "invalid event id")
	}
	if _, err := uuid.FromString(userID); err != nil {
		return fmt.Errorf("%w: %s", ErrInvalidInput, "invalid user id")
	}
	query := `insert into notification (event_id, user_id) values ($1, $2)`
	_, err := tx.Exec(ctx, query, eventID, userID)
	return err
}

// GetPending returns a pending notification to be delivered if available.
func (m *Manager) GetPending(ctx context.Context, tx pgx.Tx) (*hub.Notification, error) {
	query := "select get_pending_notification()"
	var dataJSON []byte
	if err := tx.QueryRow(ctx, query).Scan(&dataJSON); err != nil {
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
		return fmt.Errorf("%w: %s", ErrInvalidInput, "invalid notification id")
	}
	query := "select update_notification_status($1::uuid, $2::boolean, $3::text)"
	var processedErrStr string
	if processedErr != nil {
		processedErrStr = processedErr.Error()
	}
	_, err := tx.Exec(ctx, query, notificationID, processed, processedErrStr)
	return err
}
