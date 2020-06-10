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
func (m *ManagerMock) Add(ctx context.Context, ak *hub.APIKey) ([]byte, error) {
	args := m.Called(ctx, ak)
	data, _ := args.Get(0).([]byte)
	return data, args.Error(1)
}

// Delete implements the APIKeyManager interface.
func (m *ManagerMock) Delete(ctx context.Context, apiKeyID string) error {
	args := m.Called(ctx, apiKeyID)
	return args.Error(0)
}

// GetOwnedByUserJSON implements the APIKeyManager interface.
func (m *ManagerMock) GetOwnedByUserJSON(ctx context.Context) ([]byte, error) {
	args := m.Called(ctx)
	data, _ := args.Get(0).([]byte)
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
