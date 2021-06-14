package webhook

import (
	"context"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/stretchr/testify/mock"
)

// ManagerMock is a mock implementation of the WebhookManager interface.
type ManagerMock struct {
	mock.Mock
}

// Add implements the WebhookManager interface.
func (m *ManagerMock) Add(ctx context.Context, orgName string, wh *hub.Webhook) error {
	args := m.Called(ctx, orgName, wh)
	return args.Error(0)
}

// Delete implements the WebhookManager interface.
func (m *ManagerMock) Delete(ctx context.Context, webhookID string) error {
	args := m.Called(ctx, webhookID)
	return args.Error(0)
}

// GetOwnedByOrgJSON implements the WebhookManager interface.
func (m *ManagerMock) GetOwnedByOrgJSON(
	ctx context.Context,
	orgName string,
	p *hub.Pagination,
) (*hub.JSONQueryResult, error) {
	args := m.Called(ctx, orgName, p)
	data, _ := args.Get(0).(*hub.JSONQueryResult)
	return data, args.Error(1)
}

// GetOwnedByUserJSON implements the WebhookManager interface.
func (m *ManagerMock) GetOwnedByUserJSON(ctx context.Context, p *hub.Pagination) (*hub.JSONQueryResult, error) {
	args := m.Called(ctx, p)
	data, _ := args.Get(0).(*hub.JSONQueryResult)
	return data, args.Error(1)
}

// GetSubscribedTo implements the WebhookManager interface.
func (m *ManagerMock) GetSubscribedTo(ctx context.Context, e *hub.Event) ([]*hub.Webhook, error) {
	args := m.Called(ctx, e)
	data, _ := args.Get(0).([]*hub.Webhook)
	return data, args.Error(1)
}

// GetJSON implements the WebhookManager interface.
func (m *ManagerMock) GetJSON(ctx context.Context, webhookID string) ([]byte, error) {
	args := m.Called(ctx, webhookID)
	data, _ := args.Get(0).([]byte)
	return data, args.Error(1)
}

// Update implements the WebhookManager interface.
func (m *ManagerMock) Update(ctx context.Context, wh *hub.Webhook) error {
	args := m.Called(ctx, wh)
	return args.Error(0)
}
