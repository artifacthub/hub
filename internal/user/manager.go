package user

import (
	"bytes"
	"context"
	"crypto/sha512"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/artifacthub/hub/internal/email"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/jackc/pgx/v4"
	"github.com/satori/uuid"
	"golang.org/x/crypto/bcrypt"
)

const (
	// Database queries
	checkUserAliasAvailDBQ       = `select check_user_alias_availability($1::text)`
	checkUserCredsDBQ            = `select user_id, password from "user" where email = $1 and password is not null and email_verified = true`
	deleteSessionDBQ             = `delete from session where session_id = $1`
	getAPIKeyInfoDBQ             = `select user_id, secret from api_key where api_key_id = $1`
	getSessionDBQ                = `select user_id, floor(extract(epoch from created_at)) from session where session_id = $1`
	getUserIDDBQ                 = `select user_id from "user" where email = $1`
	getUserPasswordDBQ           = `select password from "user" where user_id = $1 and password is not null`
	getUserProfileDBQ            = `select get_user_profile($1::uuid)`
	registerPasswordResetCodeDBQ = `select register_password_reset_code($1::text)`
	registerSessionDBQ           = `select register_session($1::jsonb)`
	registerUserDBQ              = `select register_user($1::jsonb)`
	resetUserPasswordDBQ         = `select reset_user_password($1::bytea, $2::text)`
	updateUserPasswordDBQ        = `select update_user_password($1::uuid, $2::text, $3::text)`
	updateUserProfileDBQ         = `select update_user_profile($1::uuid, $2::jsonb)`
	verifyEmailDBQ               = `select verify_email($1::uuid)`
	verifyPasswordResetCodeDBQ   = `select verify_password_reset_code($1::bytea)`
)

var (
	// ErrInvalidPassword indicates that the password provided is not valid.
	ErrInvalidPassword = errors.New("invalid password")

	// ErrInvalidPasswordResetCode indicates that the password reset code
	// provided is not valid.
	ErrInvalidPasswordResetCode = errors.New("invalid password reset code")

	// errInvalidPasswordResetCodeDB represents the error returned from the
	// database when the password reset code is not valid.
	errInvalidPasswordResetCodeDB = errors.New("ERROR: invalid password reset code (SQLSTATE P0001)")

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

// CheckAPIKey checks if the api key provided is valid.
func (m *Manager) CheckAPIKey(ctx context.Context, apiKeyID, apiKeySecret string) (*hub.CheckAPIKeyOutput, error) {
	// Validate input
	if apiKeyID == "" || apiKeySecret == "" {
		return nil, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "api key id or secret not provided")
	}

	// Get key's user id and secret from database
	var userID, apiKeySecretHashed string
	err := m.db.QueryRow(ctx, getAPIKeyInfoDBQ, apiKeyID).Scan(&userID, &apiKeySecretHashed)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return &hub.CheckAPIKeyOutput{Valid: false}, nil
		}
		return nil, err
	}

	// Check if the secret provided is valid
	switch {
	case strings.HasPrefix(apiKeySecretHashed, "$2a$"):
		// Bcrypt hash, will be deprecated soon
		err = bcrypt.CompareHashAndPassword([]byte(apiKeySecretHashed), []byte(apiKeySecret))
		if err != nil {
			return &hub.CheckAPIKeyOutput{Valid: false}, nil
		}
	default:
		// SHA512 hash
		if fmt.Sprintf("%x", sha512.Sum512([]byte(apiKeySecret))) != apiKeySecretHashed {
			return &hub.CheckAPIKeyOutput{Valid: false}, nil
		}
	}

	return &hub.CheckAPIKeyOutput{
		Valid:  true,
		UserID: userID,
	}, nil
}

// CheckAvailability checks the availability of a given value for the provided
// resource kind.
func (m *Manager) CheckAvailability(ctx context.Context, resourceKind, value string) (bool, error) {
	var available bool
	var query string

	// Validate input
	validResourceKinds := []string{
		"userAlias",
	}
	isResourceKindValid := func(resourceKind string) bool {
		for _, k := range validResourceKinds {
			if resourceKind == k {
				return true
			}
		}
		return false
	}
	if !isResourceKindValid(resourceKind) {
		return available, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid resource kind")
	}
	if value == "" {
		return available, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid value")
	}

	// Check availability in database
	switch resourceKind {
	case "userAlias":
		query = checkUserAliasAvailDBQ
	}
	query = fmt.Sprintf("select not exists (%s)", query)
	err := m.db.QueryRow(ctx, query, value).Scan(&available)
	return available, err
}

// CheckCredentials checks if the credentials provided are valid.
func (m *Manager) CheckCredentials(
	ctx context.Context,
	email,
	password string,
) (*hub.CheckCredentialsOutput, error) {
	// Validate input
	if email == "" {
		return nil, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "email not provided")
	}
	if password == "" {
		return nil, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "password not provided")
	}

	// Get password for email provided from database
	var userID, hashedPassword string
	err := m.db.QueryRow(ctx, checkUserCredsDBQ, email).Scan(&userID, &hashedPassword)
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
	// Validate input
	if len(sessionID) == 0 {
		return nil, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "session id not provided")
	}
	if duration == 0 {
		return nil, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "duration not provided")
	}

	// Get session details from database
	var userID string
	var createdAt int64
	err := m.db.QueryRow(ctx, getSessionDBQ, hashSessionID(sessionID)).Scan(&userID, &createdAt)
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
	// Validate input
	if len(sessionID) == 0 {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "session id not provided")
	}

	// Delete session from database
	_, err := m.db.Exec(ctx, deleteSessionDBQ, hashSessionID(sessionID))
	return err
}

// GetProfile returns the profile of the user doing the request.
func (m *Manager) GetProfile(ctx context.Context) (*hub.User, error) {
	dataJSON, err := m.GetProfileJSON(ctx)
	if err != nil {
		return nil, err
	}
	u := &hub.User{}
	if err := json.Unmarshal(dataJSON, &u); err != nil {
		return nil, err
	}
	return u, nil
}

// GetProfileJSON returns the profile of the user doing the request as a json
// object.
func (m *Manager) GetProfileJSON(ctx context.Context) ([]byte, error) {
	userID := ctx.Value(hub.UserIDKey).(string)
	var profile []byte
	err := m.db.QueryRow(ctx, getUserProfileDBQ, userID).Scan(&profile)
	return profile, err
}

// GetUserID returns the id of the user with the email provided.
func (m *Manager) GetUserID(ctx context.Context, email string) (string, error) {
	// Validate input
	if email == "" {
		return "", fmt.Errorf("%w: %s", hub.ErrInvalidInput, "email not provided")
	}

	// Get user id from database
	var userID string
	err := m.db.QueryRow(ctx, getUserIDDBQ, email).Scan(&userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", ErrNotFound
		}
		return "", err
	}
	return userID, nil
}

// RegisterPasswordResetCode registers a code that allows the user identified
// by the email provided to reset the password. A link containing the code will
// be email to the user to initiate the password reset process.
func (m *Manager) RegisterPasswordResetCode(ctx context.Context, userEmail, baseURL string) error {
	// Validate input
	if userEmail == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "email not provided")
	}
	if m.es != nil {
		u, err := url.Parse(baseURL)
		if err != nil || u.Scheme == "" || u.Host == "" {
			return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid base url")
		}
	}

	// Register password reset code in database
	var code []byte
	err := m.db.QueryRow(ctx, registerPasswordResetCodeDBQ, userEmail).Scan(&code)
	if err != nil {
		return err
	}

	// Send password reset email
	if code != nil && m.es != nil {
		codeB64 := base64.URLEncoding.EncodeToString(code)
		templateData := map[string]string{
			"link": fmt.Sprintf("%s/reset-password?code=%s", baseURL, codeB64),
		}
		var emailBody bytes.Buffer
		if err := passwordResetTmpl.Execute(&emailBody, templateData); err != nil {
			return err
		}
		emailData := &email.Data{
			To:      userEmail,
			Subject: "Password reset",
			Body:    emailBody.Bytes(),
		}
		if err := m.es.SendEmail(emailData); err != nil {
			return err
		}
	}

	return nil
}

// RegisterSession registers a user session in the database.
func (m *Manager) RegisterSession(ctx context.Context, session *hub.Session) ([]byte, error) {
	// Validate input
	if session.UserID == "" {
		return nil, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "user id not provided")
	}
	if _, err := uuid.FromString(session.UserID); err != nil {
		return nil, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid user id")
	}

	// Register session in database
	sessionJSON, _ := json.Marshal(session)
	var sessionID []byte
	err := m.db.QueryRow(ctx, registerSessionDBQ, sessionJSON).Scan(&sessionID)
	return sessionID, err
}

// RegisterUser registers the user provided in the database. When the user is
// registered a verification email will be sent to the email address provided.
// The base url provided will be used to build the url the user will need to
// click to complete the verification. When a user is registered using oauth,
// the email is verified automatically and no email is sent.
func (m *Manager) RegisterUser(ctx context.Context, user *hub.User, baseURL string) error {
	// Validate input
	if user.Alias == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "alias not provided")
	}
	if user.Email == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "email not provided")
	}
	if !user.EmailVerified && m.es != nil {
		u, err := url.Parse(baseURL)
		if err != nil || u.Scheme == "" || u.Host == "" {
			return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid base url")
		}
	}
	if user.ProfileImageID != "" {
		if _, err := uuid.FromString(user.ProfileImageID); err != nil {
			return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid profile image id")
		}
	}

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
	var code *string
	err := m.db.QueryRow(ctx, registerUserDBQ, userJSON).Scan(&code)
	if err != nil {
		return err
	}

	// Send email verification code
	if code != nil && m.es != nil {
		templateData := map[string]string{
			"link": fmt.Sprintf("%s/verify-email?code=%s", baseURL, *code),
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

// ResetPassword resets the user password in the database.
func (m *Manager) ResetPassword(ctx context.Context, codeB64, newPassword, baseURL string) error {
	// Validate input
	if codeB64 == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "code not provided")
	}
	if newPassword == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "new password not provided")
	}
	if m.es != nil {
		u, err := url.Parse(baseURL)
		if err != nil || u.Scheme == "" || u.Host == "" {
			return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid base url")
		}
	}

	// Hash new password
	newHashed, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	// Reset user password in database
	code, err := base64.URLEncoding.DecodeString(codeB64)
	if err != nil {
		return ErrInvalidPasswordResetCode
	}
	var userEmail string
	err = m.db.QueryRow(ctx, resetUserPasswordDBQ, code, string(newHashed)).Scan(&userEmail)
	if err != nil {
		if err.Error() == errInvalidPasswordResetCodeDB.Error() {
			return ErrInvalidPasswordResetCode
		}
		return err
	}

	// Send password reset success email
	if m.es != nil {
		templateData := map[string]string{
			"baseURL": baseURL,
		}
		var emailBody bytes.Buffer
		if err := passwordResetSuccessTmpl.Execute(&emailBody, templateData); err != nil {
			return err
		}
		emailData := &email.Data{
			To:      userEmail,
			Subject: "Your password has been reset",
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

	// Validate input
	if old == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "old password not provided")
	}
	if new == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "new password not provided")
	}

	// Validate old password
	var oldHashed string
	err := m.db.QueryRow(ctx, getUserPasswordDBQ, userID).Scan(&oldHashed)
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
	_, err = m.db.Exec(ctx, updateUserPasswordDBQ, userID, oldHashed, string(newHashed))
	return err
}

// UpdateProfile updates the user profile in the database.
func (m *Manager) UpdateProfile(ctx context.Context, user *hub.User) error {
	userID := ctx.Value(hub.UserIDKey).(string)

	// Validate input
	if user.Alias == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "alias not provided")
	}
	if user.ProfileImageID != "" {
		if _, err := uuid.FromString(user.ProfileImageID); err != nil {
			return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid profile image id")
		}
	}

	// Update user profile in database
	userJSON, _ := json.Marshal(user)
	_, err := m.db.Exec(ctx, updateUserProfileDBQ, userID, userJSON)
	return err
}

// VerifyEmail verifies a user's email using the email verification code
// provided.
func (m *Manager) VerifyEmail(ctx context.Context, code string) (bool, error) {
	var verified bool

	// Validate input
	if code == "" {
		return verified, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "code not provided")
	}

	// Verify email in database
	err := m.db.QueryRow(ctx, verifyEmailDBQ, code).Scan(&verified)
	return verified, err
}

// VerifyPasswordResetCode verifies if the provided code is valid.
func (m *Manager) VerifyPasswordResetCode(ctx context.Context, codeB64 string) error {
	// Validate input
	if codeB64 == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "code not provided")
	}

	// Verify password reset code in database
	code, err := base64.URLEncoding.DecodeString(codeB64)
	if err != nil {
		return ErrInvalidPasswordResetCode
	}
	_, err = m.db.Exec(ctx, verifyPasswordResetCodeDBQ, code)
	if err != nil && err.Error() == errInvalidPasswordResetCodeDB.Error() {
		return ErrInvalidPasswordResetCode
	}
	return err
}

// hashSessionID is a helper function that creates a sha512 hash of the
// sessionID provided.
func hashSessionID(sessionID []byte) string {
	return fmt.Sprintf("\\x%x", sha512.Sum512(sessionID))
}
