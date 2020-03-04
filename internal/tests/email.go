package tests

import (
	"github.com/cncf/hub/internal/email"
	"github.com/stretchr/testify/mock"
)

type EmailSenderMock struct {
	mock.Mock
}

func (m *EmailSenderMock) SendEmail(data *email.Data) error {
	args := m.Called(data)
	return args.Error(0)
}
