package tests

import (
	"github.com/cncf/hub/internal/email"
	"github.com/stretchr/testify/mock"
)

// EmailSenderMock is a mock implementation of the EmailSender interface.
type EmailSenderMock struct {
	mock.Mock
}

// SendEmail implements the EmailSender interface.
func (m *EmailSenderMock) SendEmail(data *email.Data) error {
	args := m.Called(data)
	return args.Error(0)
}
