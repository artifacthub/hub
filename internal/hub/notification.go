package hub

import (
	"context"

	"github.com/artifacthub/hub/internal/email"
	"github.com/jackc/pgx/v4"
)

// NotificationEmailDataCache describes the methods a NotificationEmailDataCache
// implementation must provide.
type NotificationEmailDataCache interface {
	Get(ctx context.Context, e *Event) (email.Data, error)
}

// Notification represents the details of a notification pending to be delivered.
type Notification struct {
	NotificationID string `json:"notification_id"`
	Event          *Event `json:"event"`
	User           *User  `json:"user"`
}

// NotificationManager describes the methods an NotificationManager
// implementation must provide.
type NotificationManager interface {
	Add(ctx context.Context, tx pgx.Tx, eventID, userID string) error
	GetPending(ctx context.Context, tx pgx.Tx) (*Notification, error)
	UpdateStatus(
		ctx context.Context,
		tx pgx.Tx,
		notificationID string,
		delivered bool,
		deliveryErr error,
	) error
}
