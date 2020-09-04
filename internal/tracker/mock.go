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
