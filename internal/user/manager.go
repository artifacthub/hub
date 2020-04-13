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

var (
	// ErrInvalidPassword indicates that the password provided is not valid.
	ErrInvalidPassword = errors.New("invalid password")

	// ErrNotFound indicates that the user does not exist.
	ErrNotFound = errors.New("user not found")
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
) (*hub.CheckCredentialsOutput, error) {
	// Get password for email provided from database
	var userID, hashedPassword string
	query := `select user_id, password from "user" where email = $1 and password is not null`
	err := m.db.QueryRow(ctx, query, email).Scan(&userID, &hashedPassword)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return &hub.CheckCredentialsOutput{Valid: false}, nil
		}
		return nil, err
	}

	// Check if the password provided is valid
	err = bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
	if err != nil {
		return &hub.CheckCredentialsOutput{Valid: false}, nil
	}

	return &hub.CheckCredentialsOutput{
		Valid:  true,
		UserID: userID,
	}, err
}

// CheckSession checks if the user session provided is valid.
func (m *Manager) CheckSession(
	ctx context.Context,
	sessionID []byte,
	duration time.Duration,
) (*hub.CheckSessionOutput, error) {
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
			return &hub.CheckSessionOutput{Valid: false}, nil
		}
		return nil, err
	}

	// Check if the session has expired
	if time.Unix(createdAt, 0).Add(duration).Before(time.Now()) {
		return &hub.CheckSessionOutput{Valid: false}, nil
	}

	return &hub.CheckSessionOutput{
		Valid:  true,
		UserID: userID,
	}, nil
}

// DeleteSession deletes a user session from the database.
func (m *Manager) DeleteSession(ctx context.Context, sessionID []byte) error {
	_, err := m.db.Exec(ctx, "delete from session where session_id = $1", sessionID)
	return err
}

// GetProfileJSON returns the profile of the user doing the request.
func (m *Manager) GetProfileJSON(ctx context.Context) ([]byte, error) {
	userID := ctx.Value(hub.UserIDKey).(string)
	var profile []byte
	err := m.db.QueryRow(ctx, "select get_user_profile($1::uuid)", userID).Scan(&profile)
	return profile, err
}

// GetUserID returns the id of the user with the email provided.
func (m *Manager) GetUserID(ctx context.Context, email string) (string, error) {
	var userID string
	query := `select user_id from "user" where email = $1`
	err := m.db.QueryRow(ctx, query, email).Scan(&userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", ErrNotFound
		}
		return "", err
	}
	return userID, nil
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
	if user.Password != "" {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		user.Password = string(hashedPassword)
	}

	// Register user in database
	userJSON, _ := json.Marshal(user)
	var code string
	err := m.db.QueryRow(ctx, "select register_user($1::jsonb)", userJSON).Scan(&code)
	if err != nil {
		return err
	}

	// Send email verification code
	if !user.EmailVerified && m.es != nil {
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

// UpdatePassword updates the user password in the database.
func (m *Manager) UpdatePassword(ctx context.Context, old, new string) error {
	userID := ctx.Value(hub.UserIDKey).(string)

	// Validate old password
	var oldHashed string
	getPasswordQuery := `select password from "user" where user_id = $1 and password is not null`
	err := m.db.QueryRow(ctx, getPasswordQuery, userID).Scan(&oldHashed)
	if err != nil {
		return err
	}
	err = bcrypt.CompareHashAndPassword([]byte(oldHashed), []byte(old))
	if err != nil {
		return ErrInvalidPassword
	}

	// Hash new password
	newHashed, err := bcrypt.GenerateFromPassword([]byte(new), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	// Update user password in database
	updatePasswordQuery := "select update_user_password($1::uuid, $2::text, $3::text)"
	_, err = m.db.Exec(ctx, updatePasswordQuery, userID, oldHashed, string(newHashed))
	return err
}

// UpdateProfile updates the user profile in the database.
func (m *Manager) UpdateProfile(ctx context.Context, user *hub.User) error {
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
