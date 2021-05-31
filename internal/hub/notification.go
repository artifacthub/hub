package hub

import (
	"context"

	"github.com/jackc/pgx/v4"
)

// Notification represents the details of a notification pending to be delivered.
type Notification struct {
	NotificationID string   `json:"notification_id"`
	Event          *Event   `json:"event"`
	User           *User    `json:"user"`
	Webhook        *Webhook `json:"webhook"`
}

// NotificationManager describes the methods an NotificationManager
// implementation must provide.
type NotificationManager interface {
	Add(ctx context.Context, tx pgx.Tx, n *Notification) error
	GetPending(ctx context.Context, tx pgx.Tx) (*Notification, error)
	UpdateStatus(
		ctx context.Context,
		tx pgx.Tx,
		notificationID string,
		delivered bool,
		deliveryErr error,
	) error
}

// PackageNotificationTemplateData represents some details of a notification
// about a given package that will be exposed to notification templates.
type PackageNotificationTemplateData struct {
	BaseURL string                 `json:"base_url"`
	Event   map[string]interface{} `json:"event"`
	Package map[string]interface{} `json:"package"`
	Theme   map[string]string      `json:"theme"`
}

// RepositoryNotificationTemplateData represents some details of a notification
// about a given repository that will be exposed to notification templates.
type RepositoryNotificationTemplateData struct {
	BaseURL    string                 `json:"base_url"`
	Event      map[string]interface{} `json:"event"`
	Repository map[string]interface{} `json:"repository"`
	Theme      map[string]string      `json:"theme"`
}
