package notification

import (
	"context"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/jackc/pgx/v4"
	"github.com/stretchr/testify/mock"
)

// ManagerMock is a mock implementation of the NotificationManager interface.
type ManagerMock struct {
	mock.Mock
}

// GetPending implements the NotificationManager interface.
func (m *ManagerMock) GetPending(ctx context.Context, tx pgx.Tx) (*hub.Notification, error) {
	args := m.Called(ctx, tx)
	data, _ := args.Get(0).(*hub.Notification)
	return data, args.Error(1)
}
