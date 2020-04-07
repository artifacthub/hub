package org

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"

	"github.com/artifacthub/hub/internal/email"
	"github.com/artifacthub/hub/internal/hub"
)

// Manager provides an API to manage organizations.
type Manager struct {
	db hub.DB
	es hub.EmailSender
}

// NewManager creates a new Manager instance.
func NewManager(db hub.DB, es hub.EmailSender) *Manager {
	return &Manager{
		db: db,
		es: es,
	}
}

// Add adds the provided organization to the database.
func (m *Manager) Add(ctx context.Context, org *hub.Organization) error {
	query := "select add_organization($1::uuid, $2::jsonb)"
	userID := ctx.Value(hub.UserIDKey).(string)
	orgJSON, _ := json.Marshal(org)
	_, err := m.db.Exec(ctx, query, userID, orgJSON)
	return err
}

// AddMember adds a new member to the provided organization. The new member
// must be a registered user. The user will receive an email to confirm her
// willingness to join the organization. The user doing the request must be a
// member of the organization.
func (m *Manager) AddMember(ctx context.Context, orgName, userAlias, baseURL string) error {
	query := "select add_organization_member($1::uuid, $2::text, $3::text)"
	userID := ctx.Value(hub.UserIDKey).(string)
	_, err := m.db.Exec(ctx, query, userID, orgName, userAlias)
	if err != nil {
		return err
	}

	// Send organization invitation email
	if m.es != nil {
		var userEmail string
		query := `select email from "user" where alias = $1`
		if err := m.db.QueryRow(ctx, query, userAlias).Scan(&userEmail); err != nil {
			return err
		}
		templateData := map[string]string{
			"link":    fmt.Sprintf("%s/accept-invitation?org=%s", baseURL, orgName),
			"orgName": orgName,
		}
		var emailBody bytes.Buffer
		if err := invitationTmpl.Execute(&emailBody, templateData); err != nil {
			return err
		}
		emailData := &email.Data{
			To:      userEmail,
			Subject: fmt.Sprintf("Invitation to join %s on Artifact Hub", orgName),
			Body:    emailBody.Bytes(),
		}
		if err := m.es.SendEmail(emailData); err != nil {
			return err
		}
	}

	return nil
}

// ConfirmMembership confirms the user doing the request membership to the
// provided organization.
func (m *Manager) ConfirmMembership(ctx context.Context, orgName string) error {
	query := "select confirm_organization_membership($1::uuid, $2::text)"
	userID := ctx.Value(hub.UserIDKey).(string)
	_, err := m.db.Exec(ctx, query, userID, orgName)
	return err
}

// DeleteMember removes a member from the provided organization. The user doing
// the request must be a member of the organization.
func (m *Manager) DeleteMember(ctx context.Context, orgName, userAlias string) error {
	query := "select delete_organization_member($1::uuid, $2::text, $3::text)"
	userID := ctx.Value(hub.UserIDKey).(string)
	_, err := m.db.Exec(ctx, query, userID, orgName, userAlias)
	return err
}

// GetJSON returns the organization requested as a json object.
func (m *Manager) GetJSON(ctx context.Context, orgName string) ([]byte, error) {
	query := "select get_organization($1::uuid, $2::text)"
	userID := ctx.Value(hub.UserIDKey).(string)
	return m.dbQueryJSON(ctx, query, userID, orgName)
}

// GetByUserJSON returns the organizations the user doing the request belongs
// to as a json object.
func (m *Manager) GetByUserJSON(ctx context.Context) ([]byte, error) {
	query := "select get_user_organizations($1::uuid)"
	userID := ctx.Value(hub.UserIDKey).(string)
	return m.dbQueryJSON(ctx, query, userID)
}

// GetMembersJSON returns the members of the provided organization as a json
// object.
func (m *Manager) GetMembersJSON(ctx context.Context, orgName string) ([]byte, error) {
	query := "select get_organization_members($1::uuid, $2::text)"
	userID := ctx.Value(hub.UserIDKey).(string)
	return m.dbQueryJSON(ctx, query, userID, orgName)
}

// Update updates the provided organization in the database.
func (m *Manager) Update(ctx context.Context, org *hub.Organization) error {
	query := "select update_organization($1::uuid, $2::jsonb)"
	userID := ctx.Value(hub.UserIDKey).(string)
	orgJSON, _ := json.Marshal(org)
	_, err := m.db.Exec(ctx, query, userID, orgJSON)
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
