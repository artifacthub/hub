package apikey

import (
	"context"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/stretchr/testify/mock"
)

// ManagerMock is a mock implementation of the APIKeyManager interface.
type ManagerMock struct {
	mock.Mock
}

// Add implements the APIKeyManager interface.
func (m *ManagerMock) Add(ctx context.Context, ak *hub.APIKey) (*hub.APIKey, error) {
	args := m.Called(ctx, ak)
	data, _ := args.Get(0).(*hub.APIKey)
	return data, args.Error(1)
}

// Check implements the UserManager interface.
func (m *ManagerMock) Check(ctx context.Context, apiKeyID, apiKeySecret string) (*hub.CheckAPIKeyOutput, error) {
	args := m.Called(ctx, apiKeyID, apiKeySecret)
	data, _ := args.Get(0).(*hub.CheckAPIKeyOutput)
	return data, args.Error(1)
}

// Delete implements the APIKeyManager interface.
func (m *ManagerMock) Delete(ctx context.Context, apiKeyID string) error {
	args := m.Called(ctx, apiKeyID)
	return args.Error(0)
}

// GetOwnedByUserJSON implements the APIKeyManager interface.
func (m *ManagerMock) GetOwnedByUserJSON(ctx context.Context, p *hub.Pagination) (*hub.JSONQueryResult, error) {
	args := m.Called(ctx, p)
	data, _ := args.Get(0).(*hub.JSONQueryResult)
	return data, args.Error(1)
}

// GetJSON implements the APIKeyManager interface.
func (m *ManagerMock) GetJSON(ctx context.Context, apiKeyID string) ([]byte, error) {
	args := m.Called(ctx, apiKeyID)
	data, _ := args.Get(0).([]byte)
	return data, args.Error(1)
}

// Update implements the APIKeyManager interface.
func (m *ManagerMock) Update(ctx context.Context, ak *hub.APIKey) error {
	args := m.Called(ctx, ak)
	return args.Error(0)
}
