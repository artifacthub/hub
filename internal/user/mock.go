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

// ApproveSession implements the UserManager interface.
func (m *ManagerMock) ApproveSession(ctx context.Context, sessionID, passcode string) error {
	args := m.Called(ctx, sessionID, passcode)
	return args.Error(0)
}

// CheckAvailability implements the UserManager interface.
func (m *ManagerMock) CheckAvailability(ctx context.Context, resourceKind, value string) (bool, error) {
	args := m.Called(ctx, resourceKind, value)
	return args.Bool(0), args.Error(1)
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
	sessionID string,
	duration time.Duration,
) (*hub.CheckSessionOutput, error) {
	args := m.Called(ctx, sessionID, duration)
	data, _ := args.Get(0).(*hub.CheckSessionOutput)
	return data, args.Error(1)
}

// DeleteSession implements the UserManager interface.
func (m *ManagerMock) DeleteSession(ctx context.Context, sessionID string) error {
	args := m.Called(ctx, sessionID)
	return args.Error(0)
}

// DeleteUser implements the UserManager interface.
func (m *ManagerMock) DeleteUser(ctx context.Context, code string) error {
	args := m.Called(ctx, code)
	return args.Error(0)
}

// DisableTFA implements the UserManager interface.
func (m *ManagerMock) DisableTFA(ctx context.Context, passcode string) error {
	args := m.Called(ctx, passcode)
	return args.Error(0)
}

// EnableTFA implements the UserManager interface.
func (m *ManagerMock) EnableTFA(ctx context.Context, passcode string) error {
	args := m.Called(ctx, passcode)
	return args.Error(0)
}

// GetProfile implements the UserManager interface.
func (m *ManagerMock) GetProfile(ctx context.Context) (*hub.User, error) {
	args := m.Called(ctx)
	data, _ := args.Get(0).(*hub.User)
	return data, args.Error(1)
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

// RegisterDeleteUserCode implements the UserManager interface.
func (m *ManagerMock) RegisterDeleteUserCode(ctx context.Context) error {
	args := m.Called(ctx)
	return args.Error(0)
}

// RegisterPasswordResetCode implements the UserManager interface.
func (m *ManagerMock) RegisterPasswordResetCode(ctx context.Context, userEmail string) error {
	args := m.Called(ctx, userEmail)
	return args.Error(0)
}

// RegisterSession implements the UserManager interface.
func (m *ManagerMock) RegisterSession(ctx context.Context, session *hub.Session) (*hub.Session, error) {
	args := m.Called(ctx, session)
	data, _ := args.Get(0).(*hub.Session)
	return data, args.Error(1)
}

// RegisterUser implements the UserManager interface.
func (m *ManagerMock) RegisterUser(ctx context.Context, user *hub.User) error {
	args := m.Called(ctx, user)
	return args.Error(0)
}

// ResetPassword implements the UserManager interface.
func (m *ManagerMock) ResetPassword(ctx context.Context, code, newPassword string) error {
	args := m.Called(ctx, code, newPassword)
	return args.Error(0)
}

// SetupTFA implements the UserManager interface.
func (m *ManagerMock) SetupTFA(ctx context.Context) ([]byte, error) {
	args := m.Called(ctx)
	data, _ := args.Get(0).([]byte)
	return data, args.Error(1)
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

// VerifyPasswordResetCode implements the UserManager interface.
func (m *ManagerMock) VerifyPasswordResetCode(ctx context.Context, code string) error {
	args := m.Called(ctx, code)
	return args.Error(0)
}
