package email

import (
	"errors"

	"github.com/stretchr/testify/mock"
)

// ErrFakeSenderFailure represents a fake sender failure.
var ErrFakeSenderFailure = errors.New("fake sender failure")

// SenderMock is a mock implementation of the hub EmailSender interface.
type SenderMock struct {
	mock.Mock
}

// SendEmail implements the EmailSender interface.
func (m *SenderMock) SendEmail(data *Data) error {
	args := m.Called(data)
	return args.Error(0)
}
