package hub

import (
	"context"
	"time"
)

// CheckAPIKeyOutput represents the output returned by the CheckApiKey method.
type CheckAPIKeyOutput struct {
	Valid  bool   `json:"valid"`
	UserID string `json:"user_id"`
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

// Session represents some information about a user session.
type Session struct {
	SessionID string `json:"session_id"`
	UserID    string `json:"user_id"`
	IP        string `json:"ip"`
	UserAgent string `json:"user_agent"`
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
}

type userIDKey struct{}

// UserIDKey represents the key used for the userID value inside a context.
var UserIDKey = userIDKey{}

// UserManager describes the methods a UserManager implementation must provide.
type UserManager interface {
	CheckAPIKey(ctx context.Context, key []byte) (*CheckAPIKeyOutput, error)
	CheckAvailability(ctx context.Context, resourceKind, value string) (bool, error)
	CheckCredentials(ctx context.Context, email, password string) (*CheckCredentialsOutput, error)
	CheckSession(ctx context.Context, sessionID []byte, duration time.Duration) (*CheckSessionOutput, error)
	DeleteSession(ctx context.Context, sessionID []byte) error
	GetProfile(ctx context.Context) (*User, error)
	GetProfileJSON(ctx context.Context) ([]byte, error)
	GetUserID(ctx context.Context, email string) (string, error)
	RegisterSession(ctx context.Context, session *Session) ([]byte, error)
	RegisterUser(ctx context.Context, user *User, baseURL string) error
	UpdatePassword(ctx context.Context, old, new string) error
	UpdateProfile(ctx context.Context, user *User) error
	VerifyEmail(ctx context.Context, code string) (bool, error)
}
