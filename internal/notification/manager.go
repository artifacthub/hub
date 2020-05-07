package notification

import (
	"context"
	"encoding/json"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/jackc/pgx/v4"
)

// Manager provides an API to manage notifications.
type Manager struct{}

// NewManager creates a new Manager instance.
func NewManager() *Manager {
	return &Manager{}
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
