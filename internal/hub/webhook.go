package hub

import "context"

// Webhook represents the configuration of a webhook where notifications will
// be posted to.
type Webhook struct {
	WebhookID   string      `json:"webhook_id"`
	Name        string      `json:"name"`
	Description string      `json:"description"`
	URL         string      `json:"url"`
	Secret      string      `json:"secret"`
	ContentType string      `json:"content_type"`
	Template    string      `json:"template"`
	Active      bool        `json:"active"`
	EventKinds  []EventKind `json:"event_kinds"`
	Packages    []*Package  `json:"packages"`
}

// WebhookManager describes the methods a WebhookManager implementation must
// provide.
type WebhookManager interface {
	Add(ctx context.Context, orgName string, wh *Webhook) error
	Delete(ctx context.Context, webhookID string) error
	GetJSON(ctx context.Context, webhookID string) ([]byte, error)
	GetOwnedByOrgJSON(ctx context.Context, orgName string, p *Pagination) (*JSONQueryResult, error)
	GetOwnedByUserJSON(ctx context.Context, p *Pagination) (*JSONQueryResult, error)
	GetSubscribedTo(ctx context.Context, e *Event) ([]*Webhook, error)
	Update(ctx context.Context, wh *Webhook) error
}
