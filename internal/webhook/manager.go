package webhook

import (
	"context"
	"encoding/json"
	"fmt"
	"html/template"
	"net/url"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/util"
	"github.com/satori/uuid"
)

// Manager provides an API to manage webhooks.
type Manager struct {
	db hub.DB
}

// NewManager creates a new Manager instance.
func NewManager(db hub.DB) *Manager {
	return &Manager{
		db: db,
	}
}

// Add adds the provided webhook to the database.
func (m *Manager) Add(ctx context.Context, orgName string, wh *hub.Webhook) error {
	userID := ctx.Value(hub.UserIDKey).(string)

	// Validate input
	if wh.Name == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "name not provided")
	}
	if wh.URL == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "url not provided")
	}
	u, err := url.Parse(wh.URL)
	if err != nil || u.Scheme == "" || u.Host == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid url")
	}
	if _, err := template.New("").Parse(wh.Template); err != nil {
		return fmt.Errorf("%w: %s %s", hub.ErrInvalidInput, "invalid template", err)
	}
	if len(wh.EventKinds) == 0 {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "no event kinds provided")
	}
	if len(wh.Packages) == 0 {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "no packages provided")
	}
	for _, p := range wh.Packages {
		if _, err := uuid.FromString(p.PackageID); err != nil {
			return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid package id")
		}
	}

	// Add webhook to the database
	query := "select add_webhook($1::uuid, $2::text, $3::jsonb)"
	whJSON, _ := json.Marshal(wh)
	_, err = m.db.Exec(ctx, query, userID, orgName, whJSON)
	if err != nil && err.Error() == util.ErrDBInsufficientPrivilege.Error() {
		return hub.ErrInsufficientPrivilege
	}
	return err
}

// Delete deletes the provided webhook from the database.
func (m *Manager) Delete(ctx context.Context, webhookID string) error {
	userID := ctx.Value(hub.UserIDKey).(string)

	// Validate input
	if _, err := uuid.FromString(webhookID); err != nil {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid webhook id")
	}

	// Delete webhook from database
	query := "select delete_webhook($1::uuid, $2::uuid)"
	_, err := m.db.Exec(ctx, query, userID, webhookID)
	if err != nil && err.Error() == util.ErrDBInsufficientPrivilege.Error() {
		return hub.ErrInsufficientPrivilege
	}
	return err
}

// GetJSON returns the requested webhook as a json object.
func (m *Manager) GetJSON(ctx context.Context, webhookID string) ([]byte, error) {
	userID := ctx.Value(hub.UserIDKey).(string)

	// Validate input
	if _, err := uuid.FromString(webhookID); err != nil {
		return nil, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid webhook id")
	}

	// Get webhook from database
	query := "select get_webhook($1::uuid, $2::uuid)"
	dataJSON, err := m.dbQueryJSON(ctx, query, userID, webhookID)
	if err != nil {
		if err.Error() == util.ErrDBInsufficientPrivilege.Error() {
			return nil, hub.ErrInsufficientPrivilege
		}
		return nil, err
	}
	return dataJSON, nil
}

// GetOwnedByOrgJSON returns the webhooks belonging to the provided organization
// as a json array.
func (m *Manager) GetOwnedByOrgJSON(ctx context.Context, orgName string) ([]byte, error) {
	userID := ctx.Value(hub.UserIDKey).(string)

	// Validate input
	if orgName == "" {
		return nil, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "organization name not provided")
	}

	// Get webhooks from database
	query := "select get_org_webhooks($1::uuid, $2::text)"
	return m.dbQueryJSON(ctx, query, userID, orgName)
}

// GetOwnedByUserJSON returns the webhooks belonging to the requesting user as
// a json array.
func (m *Manager) GetOwnedByUserJSON(ctx context.Context) ([]byte, error) {
	userID := ctx.Value(hub.UserIDKey).(string)

	// Get webhooks from database
	query := "select get_user_webhooks($1::uuid)"
	return m.dbQueryJSON(ctx, query, userID)
}

// GetSubscribedTo returns the webhooks subscribed to the event provided.
func (m *Manager) GetSubscribedTo(ctx context.Context, e *hub.Event) ([]*hub.Webhook, error) {
	var dataJSON []byte
	var err error
	switch e.EventKind {
	case hub.NewRelease:
		if _, err := uuid.FromString(e.PackageID); err != nil {
			return nil, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid package id")
		}
		query := "select get_webhooks_subscribed_to_package($1::int, $2::uuid)"
		dataJSON, err = m.dbQueryJSON(ctx, query, e.EventKind, e.PackageID)
	default:
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	var webhooks []*hub.Webhook
	if err := json.Unmarshal(dataJSON, &webhooks); err != nil {
		return nil, err
	}
	return webhooks, err
}

// Update updates the provided webhook in the database.
func (m *Manager) Update(ctx context.Context, wh *hub.Webhook) error {
	userID := ctx.Value(hub.UserIDKey).(string)

	// Validate input
	if _, err := uuid.FromString(wh.WebhookID); err != nil {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid webhook id")
	}
	if wh.Name == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "name not provided")
	}
	if wh.URL == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "url not provided")
	}
	u, err := url.Parse(wh.URL)
	if err != nil || u.Scheme == "" || u.Host == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid url")
	}
	if _, err := template.New("").Parse(wh.Template); err != nil {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid template")
	}
	if len(wh.EventKinds) == 0 {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "no event kinds provided")
	}
	if len(wh.Packages) == 0 {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "no packages provided")
	}
	for _, p := range wh.Packages {
		if _, err := uuid.FromString(p.PackageID); err != nil {
			return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid package id")
		}
	}

	// Update webhook in database
	query := "select update_webhook($1::uuid, $2::jsonb)"
	whJSON, _ := json.Marshal(wh)
	_, err = m.db.Exec(ctx, query, userID, whJSON)
	if err != nil && err.Error() == util.ErrDBInsufficientPrivilege.Error() {
		return hub.ErrInsufficientPrivilege
	}
	return err
}

// dbQueryJSON is a helper that executes the query provided and returns a bytes
// slice containing the json data returned from the database.
func (m *Manager) dbQueryJSON(ctx context.Context, query string, args ...interface{}) ([]byte, error) {
	var dataJSON []byte
	if err := m.db.QueryRow(ctx, query, args...).Scan(&dataJSON); err != nil {
		return nil, err
	}
	return dataJSON, nil
}
