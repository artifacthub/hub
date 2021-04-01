package apikey

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
	addAPIKeyDBQ      = `select add_api_key($1::jsonb)`
	deleteAPIKeyDBQ   = `select delete_api_key($1::uuid, $2::uuid)`
	getAPIKeyDBQ      = `select get_api_key($1::uuid, $2::uuid)`
	getUserAPIKeysDBQ = `select get_user_api_keys($1::uuid)`
	updateAPIKeyDBQ   = `select update_api_key($1::jsonb)`
)

// Manager provides an API to manage api keys.
type Manager struct {
	db hub.DB
}

// NewManager creates a new Manager instance.
func NewManager(db hub.DB) *Manager {
	return &Manager{
		db: db,
	}
}

// Add adds the provided api key to the database.
func (m *Manager) Add(ctx context.Context, ak *hub.APIKey) ([]byte, error) {
	ak.UserID = ctx.Value(hub.UserIDKey).(string)

	// Validate input
	if ak.Name == "" {
		return nil, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "name not provided")
	}

	// Add api key to the database
	akJSON, _ := json.Marshal(ak)
	return util.DBQueryJSON(ctx, m.db, addAPIKeyDBQ, akJSON)
}

// Delete deletes the provided api key from the database.
func (m *Manager) Delete(ctx context.Context, apiKeyID string) error {
	userID := ctx.Value(hub.UserIDKey).(string)

	// Validate input
	if _, err := uuid.FromString(apiKeyID); err != nil {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid api key id")
	}

	// Delete api key from database
	_, err := m.db.Exec(ctx, deleteAPIKeyDBQ, userID, apiKeyID)
	return err
}

// GetJSON returns the requested api key as a json object.
func (m *Manager) GetJSON(ctx context.Context, apiKeyID string) ([]byte, error) {
	userID := ctx.Value(hub.UserIDKey).(string)

	// Validate input
	if _, err := uuid.FromString(apiKeyID); err != nil {
		return nil, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid api key id")
	}

	// Get api key from database
	return util.DBQueryJSON(ctx, m.db, getAPIKeyDBQ, userID, apiKeyID)
}

// GetOwnedByUserJSON returns the api keys belonging to the requesting user as
// a json array.
func (m *Manager) GetOwnedByUserJSON(ctx context.Context) ([]byte, error) {
	userID := ctx.Value(hub.UserIDKey).(string)

	// Get api keys from database
	return util.DBQueryJSON(ctx, m.db, getUserAPIKeysDBQ, userID)
}

// Update updates the provided api key in the database.
func (m *Manager) Update(ctx context.Context, ak *hub.APIKey) error {
	ak.UserID = ctx.Value(hub.UserIDKey).(string)

	// Validate input
	if _, err := uuid.FromString(ak.APIKeyID); err != nil {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid api key id")
	}
	if ak.Name == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "name not provided")
	}

	// Update api key in database
	akJSON, _ := json.Marshal(ak)
	_, err := m.db.Exec(ctx, updateAPIKeyDBQ, akJSON)
	return err
}
