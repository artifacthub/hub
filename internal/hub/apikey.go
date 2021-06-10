package hub

import "context"

// APIKey represents a key used to interact with the HTTP API.
type APIKey struct {
	APIKeyID  string `json:"api_key_id"`
	Name      string `json:"name"`
	Secret    string `json:"secret"`
	CreatedAt int64  `json:"created_at"`
	UserID    string `json:"user_id"`
}

// APIKeyManager describes the methods an APIKeyManager implementation must
// provide.
type APIKeyManager interface {
	Add(ctx context.Context, ak *APIKey) (*APIKey, error)
	Check(ctx context.Context, apiKeyID, apiKeySecret string) (*CheckAPIKeyOutput, error)
	Delete(ctx context.Context, apiKeyID string) error
	GetJSON(ctx context.Context, apiKeyID string) ([]byte, error)
	GetOwnedByUserJSON(ctx context.Context, p *Pagination) (*JSONQueryResult, error)
	Update(ctx context.Context, ak *APIKey) error
}

// CheckAPIKeyOutput represents the output returned by the CheckApiKey method.
type CheckAPIKeyOutput struct {
	Valid  bool   `json:"valid"`
	UserID string `json:"user_id"`
}
