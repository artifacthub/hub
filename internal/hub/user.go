package hub

import (
	"context"
	"time"
)

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

// Session represents some information about a user session.
type Session struct {
	SessionID string `json:"session_id"`
	UserID    string `json:"user_id"`
	IP        string `json:"ip"`
	UserAgent string `json:"user_agent"`
	Approved  bool   `json:"approved"`
}

// SetupTFAOutput represents the output returned by the SetupTFA method.
type SetupTFAOutput struct {
	QRCode        string   `json:"qr_code"`
	RecoveryCodes []string `json:"recovery_codes"`
	Secret        string   `json:"secret"`
}

// TFAConfig represents the TFA configuration for a given user.
type TFAConfig struct {
	Enabled       bool     `json:"enabled"`
	RecoveryCodes []string `json:"recovery_codes"`
	URL           string   `json:"url"`
}

// User represents a Hub user.
type User struct {
	UserID         string `json:"user_id"`
	Alias          string `json:"alias"`
	FirstName      string `json:"first_name"`
	LastName       string `json:"last_name"`
	Email          string `json:"email"`
	EmailVerified  bool   `json:"email_verified"`
	Password       string `json:"password"`
	ProfileImageID string `json:"profile_image_id"`
	PasswordSet    bool   `json:"password_set"`
	TFAEnabled     bool   `json:"tfa_enabled"`
}

type userIDKey struct{}

// UserIDKey represents the key used for the userID value inside a context.
var UserIDKey = userIDKey{}

// UserManager describes the methods a UserManager implementation must provide.
type UserManager interface {
	ApproveSession(ctx context.Context, sessionID, passcode string) error
	CheckAvailability(ctx context.Context, resourceKind, value string) (bool, error)
	CheckCredentials(ctx context.Context, email, password string) (*CheckCredentialsOutput, error)
	CheckSession(ctx context.Context, sessionID string, duration time.Duration) (*CheckSessionOutput, error)
	DeleteSession(ctx context.Context, sessionID string) error
	DeleteUser(ctx context.Context, code string) error
	DisableTFA(ctx context.Context, passcode string) error
	EnableTFA(ctx context.Context, passcode string) error
	GetProfile(ctx context.Context) (*User, error)
	GetProfileJSON(ctx context.Context) ([]byte, error)
	GetUserID(ctx context.Context, email string) (string, error)
	RegisterDeleteUserCode(ctx context.Context) error
	RegisterPasswordResetCode(ctx context.Context, userEmail string) error
	RegisterSession(ctx context.Context, session *Session) (*Session, error)
	RegisterUser(ctx context.Context, user *User) error
	ResetPassword(ctx context.Context, code, newPassword string) error
	SetupTFA(ctx context.Context) ([]byte, error)
	UpdatePassword(ctx context.Context, old, new string) error
	UpdateProfile(ctx context.Context, user *User) error
	VerifyEmail(ctx context.Context, code string) (bool, error)
	VerifyPasswordResetCode(ctx context.Context, code string) error
}
