package user

import (
	"context"
	"time"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/stretchr/testify/mock"
)

// ManagerMock is a mock implementation of the UserManager interface.
type ManagerMock struct {
	mock.Mock
}

// CheckCredentials implements the UserManager interface.
func (m *ManagerMock) CheckCredentials(
	ctx context.Context,
	email,
	password string,
) (*hub.CheckCredentialsOutput, error) {
	args := m.Called(ctx, email, password)
	data, _ := args.Get(0).(*hub.CheckCredentialsOutput)
	return data, args.Error(1)
}

// CheckSession implements the UserManager interface.
func (m *ManagerMock) CheckSession(
	ctx context.Context,
	sessionID []byte,
	duration time.Duration,
) (*hub.CheckSessionOutput, error) {
	args := m.Called(ctx, sessionID, duration)
	data, _ := args.Get(0).(*hub.CheckSessionOutput)
	return data, args.Error(1)
}

// DeleteSession implements the UserManager interface.
func (m *ManagerMock) DeleteSession(ctx context.Context, sessionID []byte) error {
	args := m.Called(ctx, sessionID)
	return args.Error(0)
}

// GetProfileJSON implements the UserManager interface.
func (m *ManagerMock) GetProfileJSON(ctx context.Context) ([]byte, error) {
	args := m.Called(ctx)
	data, _ := args.Get(0).([]byte)
	return data, args.Error(1)
}

// GetUserID implements the UserManager interface.
func (m *ManagerMock) GetUserID(ctx context.Context, email string) (string, error) {
	args := m.Called(ctx)
	return args.String(0), args.Error(1)
}

// RegisterSession implements the UserManager interface.
func (m *ManagerMock) RegisterSession(ctx context.Context, session *hub.Session) ([]byte, error) {
	args := m.Called(ctx, session)
	data, _ := args.Get(0).([]byte)
	return data, args.Error(1)
}

// RegisterUser implements the UserManager interface.
func (m *ManagerMock) RegisterUser(ctx context.Context, user *hub.User, baseURL string) error {
	args := m.Called(ctx, user, baseURL)
	return args.Error(0)
}

// UpdatePassword implements the UserManager interface.
func (m *ManagerMock) UpdatePassword(ctx context.Context, old, new string) error {
	args := m.Called(ctx, old, new)
	return args.Error(0)
}

// UpdateProfile implements the UserManager interface.
func (m *ManagerMock) UpdateProfile(ctx context.Context, user *hub.User) error {
	args := m.Called(ctx, user)
	return args.Error(0)
}

// VerifyEmail implements the UserManager interface.
func (m *ManagerMock) VerifyEmail(ctx context.Context, code string) (bool, error) {
	args := m.Called(ctx, code)
	return args.Bool(0), args.Error(1)
}
