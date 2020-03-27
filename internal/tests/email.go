package tests

import (
	"errors"

	"github.com/artifacthub/hub/internal/email"
	"github.com/stretchr/testify/mock"
)

// ErrFakeEmailSenderFailure represents a fake email sender failure.
var ErrFakeEmailSenderFailure = errors.New("fake email sender failure")

// EmailSenderMock is a mock implementation of the EmailSender interface.
type EmailSenderMock struct {
	mock.Mock
}

// SendEmail implements the EmailSender interface.
func (m *EmailSenderMock) SendEmail(data *email.Data) error {
	args := m.Called(data)
	return args.Error(0)
}
