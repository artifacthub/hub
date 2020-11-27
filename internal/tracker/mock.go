package tracker

import (
	"github.com/stretchr/testify/mock"
)

// ErrorsCollectorMock is mock ErrorsCollector implementation.
type ErrorsCollectorMock struct {
	mock.Mock
}

// Append implements the ErrorsCollector interface.
func (m *ErrorsCollectorMock) Append(repositoryID string, err error) {
	m.Called(repositoryID, err)
}

// Flush implements the ErrorsCollector interface.
func (m *ErrorsCollectorMock) Flush() {
	m.Called()
}

// Mock is mock Tracker implementation.
type Mock struct {
	mock.Mock
}

// Track implements the Tracker interface.
func (m *Mock) Track() error {
	args := m.Called()
	return args.Error(0)
}
