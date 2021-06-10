package subscription

import (
	"context"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/stretchr/testify/mock"
)

// ManagerMock is a mock implementation of the SubscriptionManager interface.
type ManagerMock struct {
	mock.Mock
}

// Add implements the SubscriptionManager interface.
func (m *ManagerMock) Add(ctx context.Context, s *hub.Subscription) error {
	args := m.Called(ctx, s)
	return args.Error(0)
}

// AddOptOut implements the SubscriptionManager interface.
func (m *ManagerMock) AddOptOut(ctx context.Context, o *hub.OptOut) error {
	args := m.Called(ctx, o)
	return args.Error(0)
}

// Delete implements the SubscriptionManager interface.
func (m *ManagerMock) Delete(ctx context.Context, s *hub.Subscription) error {
	args := m.Called(ctx, s)
	return args.Error(0)
}

// DeleteOptOut implements the SubscriptionManager interface.
func (m *ManagerMock) DeleteOptOut(ctx context.Context, optOutID string) error {
	args := m.Called(ctx, optOutID)
	return args.Error(0)
}

// GetByPackageJSON implements the SubscriptionManager interface.
func (m *ManagerMock) GetByPackageJSON(ctx context.Context, packageID string) ([]byte, error) {
	args := m.Called(ctx, packageID)
	data, _ := args.Get(0).([]byte)
	return data, args.Error(1)
}

// GetByUserJSON implements the SubscriptionManager interface.
func (m *ManagerMock) GetByUserJSON(ctx context.Context, p *hub.Pagination) (*hub.JSONQueryResult, error) {
	args := m.Called(ctx, p)
	data, _ := args.Get(0).(*hub.JSONQueryResult)
	return data, args.Error(1)
}

// GetOptOutListJSON implements the SubscriptionManager interface.
func (m *ManagerMock) GetOptOutListJSON(ctx context.Context, p *hub.Pagination) (*hub.JSONQueryResult, error) {
	args := m.Called(ctx, p)
	data, _ := args.Get(0).(*hub.JSONQueryResult)
	return data, args.Error(1)
}

// GetSubscriptors implements the SubscriptionManager interface.
func (m *ManagerMock) GetSubscriptors(ctx context.Context, e *hub.Event) ([]*hub.User, error) {
	args := m.Called(ctx, e)
	data, _ := args.Get(0).([]*hub.User)
	return data, args.Error(1)
}
