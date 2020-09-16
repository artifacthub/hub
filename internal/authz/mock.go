package authz

import (
	"context"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/stretchr/testify/mock"
)

// AuthorizerMock is a mock implementation of the hub Authorizer interface.
type AuthorizerMock struct {
	mock.Mock
}

// Authorize implements the Authorizer interface.
func (m *AuthorizerMock) Authorize(ctx context.Context, input *hub.AuthorizeInput) error {
	args := m.Called(ctx, input)
	return args.Error(0)
}

// GetAllowedActions implements the Authorizer interface.
func (m *AuthorizerMock) GetAllowedActions(ctx context.Context, userID, orgName string) ([]hub.Action, error) {
	args := m.Called(ctx, userID, orgName)
	data, _ := args.Get(0).([]hub.Action)
	return data, args.Error(1)
}
