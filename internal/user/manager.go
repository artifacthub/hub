package user

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/artifacthub/hub/internal/email"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/jackc/pgx/v4"
	"golang.org/x/crypto/bcrypt"
)

// Manager provides an API to manage users.
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

// CheckCredentials checks if the credentials provided are valid.
func (m *Manager) CheckCredentials(
	ctx context.Context,
	email,
	password string,
) (*CheckCredentialsOutput, error) {
	// Get password for email provided from database
	var userID, hashedPassword string
	query := `select user_id, password from "user" where email = $1`
	err := m.db.QueryRow(ctx, query, email).Scan(&userID, &hashedPassword)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return &CheckCredentialsOutput{Valid: false}, nil
		}
		return nil, err
	}

	// Check if the password provided is valid
	err = bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
	if err != nil {
		return &CheckCredentialsOutput{Valid: false}, nil
	}

	return &CheckCredentialsOutput{
		Valid:  true,
		UserID: userID,
	}, err
}

// CheckSession checks if the user session provided is valid.
func (m *Manager) CheckSession(
	ctx context.Context,
	sessionID []byte,
	duration time.Duration,
) (*CheckSessionOutput, error) {
	// Get session details from database
	var userID string
	var createdAt int64
	query := `
	select user_id, floor(extract(epoch from created_at))
	from session where session_id = $1
	`
	err := m.db.QueryRow(ctx, query, sessionID).Scan(&userID, &createdAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return &CheckSessionOutput{Valid: false}, nil
		}
		return nil, err
	}

	// Check if the session has expired
	if time.Unix(createdAt, 0).Add(duration).Before(time.Now()) {
		return &CheckSessionOutput{Valid: false}, nil
	}

	return &CheckSessionOutput{
		Valid:  true,
		UserID: userID,
	}, nil
}

// DeleteSession deletes a user session from the database.
func (m *Manager) DeleteSession(ctx context.Context, sessionID []byte) error {
	_, err := m.db.Exec(ctx, "delete from session where session_id = $1", sessionID)
	return err
}

// GetAlias returns the alias of the user doing the request.
func (m *Manager) GetAlias(ctx context.Context) (string, error) {
	userID := ctx.Value(hub.UserIDKey).(string)
	var alias string
	err := m.db.QueryRow(ctx, `select alias from "user" where user_id = $1`, userID).Scan(&alias)
	return alias, err
}

// RegisterSession registers a user session in the database.
func (m *Manager) RegisterSession(ctx context.Context, session *hub.Session) ([]byte, error) {
	sessionJSON, _ := json.Marshal(session)
	var sessionID []byte
	err := m.db.QueryRow(ctx, "select register_session($1::jsonb)", sessionJSON).Scan(&sessionID)
	return sessionID, err
}

// RegisterUser registers the user provided in the database. When the user is
// registered a verification email will be sent to the email address provided.
// The base url provided will be used to build the url the user will need to
// click to complete the verification.
func (m *Manager) RegisterUser(ctx context.Context, user *hub.User, baseURL string) error {
	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	user.Password = string(hashedPassword)

	// Register user in database
	userJSON, _ := json.Marshal(user)
	var code string
	err = m.db.QueryRow(ctx, "select register_user($1::jsonb)", userJSON).Scan(&code)
	if err != nil {
		return err
	}

	// Send email verification code
	if m.es != nil {
		templateData := map[string]string{
			"link": fmt.Sprintf("%s/verify-email?code=%s", baseURL, code),
		}
		var emailBody bytes.Buffer
		if err := emailVerificationTmpl.Execute(&emailBody, templateData); err != nil {
			return err
		}
		emailData := &email.Data{
			To:      user.Email,
			Subject: "Verify your email address",
			Body:    emailBody.Bytes(),
		}
		if err := m.es.SendEmail(emailData); err != nil {
			return err
		}
	}

	return nil
}

// UpdateUserProfile updates the user profile in the database.
func (m *Manager) UpdateUserProfile(ctx context.Context, user *hub.User) error {
	query := "select update_user_profile($1::uuid, $2::jsonb)"
	userID := ctx.Value(hub.UserIDKey).(string)
	userJSON, _ := json.Marshal(user)
	_, err := m.db.Exec(ctx, query, userID, userJSON)
	return err
}

// VerifyEmail verifies a user's email using the email verification code
// provided.
func (m *Manager) VerifyEmail(ctx context.Context, code string) (bool, error) {
	var verified bool
	err := m.db.QueryRow(ctx, "select verify_email($1::uuid)", code).Scan(&verified)
	return verified, err
}

// CheckCredentialsOutput represents the output returned by the
// CheckCredentials method.
type CheckCredentialsOutput struct {
	Valid  bool   `json:"valid"`
	UserID string `json:"user_id"`
}

// CheckSessionOutput represents the output returned by the CheckSession method.
type CheckSessionOutput struct {
	Valid  bool   `json:"valid"`
	UserID string `json:"user_id"`
}
