package apikey

import (
	"context"
	"crypto/rand"
	"crypto/sha512"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/util"
	"github.com/jackc/pgx/v4"
	"github.com/satori/uuid"
)

const (
	// Database queries
	addAPIKeyDBQ       = `select add_api_key($1::jsonb)`                               //#nosec
	deleteAPIKeyDBQ    = `select delete_api_key($1::uuid, $2::uuid)`                   //#nosec
	getAPIKeyDBQ       = `select get_api_key($1::uuid, $2::uuid)`                      //#nosec
	getAPIKeyUserIDDBQ = `select user_id, secret from api_key where api_key_id = $1`   //#nosec
	getUserAPIKeysDBQ  = `select * from get_user_api_keys($1::uuid, $2::int, $3::int)` //#nosec
	updateAPIKeyDBQ    = `select update_api_key($1::jsonb)`                            //#nosec
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
func (m *Manager) Add(ctx context.Context, ak *hub.APIKey) (*hub.APIKey, error) {
	ak.UserID = ctx.Value(hub.UserIDKey).(string)

	// Validate input
	if ak.Name == "" {
		return nil, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "name not provided")
	}

	// Generate API key secret
	randomBytes := make([]byte, 32)
	if _, err := rand.Read(randomBytes); err != nil {
		return nil, err
	}
	apiKeySecret := base64.StdEncoding.EncodeToString(randomBytes)
	apiKeySecretHashed := hash(apiKeySecret)

	// Add api key to the database
	var apiKeyID string
	ak.Secret = apiKeySecretHashed
	akJSON, _ := json.Marshal(ak)
	if err := m.db.QueryRow(ctx, addAPIKeyDBQ, akJSON).Scan(&apiKeyID); err != nil {
		return nil, err
	}

	return &hub.APIKey{
		APIKeyID: apiKeyID,
		Secret:   apiKeySecret,
	}, nil
}

// Check checks if the api key provided is valid.
func (m *Manager) Check(ctx context.Context, apiKeyID, apiKeySecret string) (*hub.CheckAPIKeyOutput, error) {
	// Validate input
	if apiKeyID == "" || apiKeySecret == "" {
		return nil, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "api key id or secret not provided")
	}

	// Get key's user id and secret from database
	var userID, apiKeySecretHashed string
	err := m.db.QueryRow(ctx, getAPIKeyUserIDDBQ, apiKeyID).Scan(&userID, &apiKeySecretHashed)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return &hub.CheckAPIKeyOutput{Valid: false}, nil
		}
		return nil, err
	}

	// Check if the secret provided is valid
	if hash(apiKeySecret) != apiKeySecretHashed {
		return &hub.CheckAPIKeyOutput{Valid: false}, nil
	}

	return &hub.CheckAPIKeyOutput{
		Valid:  true,
		UserID: userID,
	}, nil
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
func (m *Manager) GetOwnedByUserJSON(ctx context.Context, p *hub.Pagination) (*hub.JSONQueryResult, error) {
	userID := ctx.Value(hub.UserIDKey).(string)

	// Get api keys from database
	return util.DBQueryJSONWithPagination(ctx, m.db, getUserAPIKeysDBQ, userID, p.Limit, p.Offset)
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

// hash is a helper function that creates a sha512 hash of the text provided.
func hash(text string) string {
	return fmt.Sprintf("%x", sha512.Sum512([]byte(text)))
}
