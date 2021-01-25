package errors

import "github.com/stretchr/testify/mock"

// CollectorMock is mock ErrorsCollector implementation.
type CollectorMock struct {
	mock.Mock
}

// Append implements the ErrorsCollector interface.
func (m *CollectorMock) Append(repositoryID string, err string) {
	m.Called(repositoryID, err)
}

// Flush implements the ErrorsCollector interface.
func (m *CollectorMock) Flush() {
	m.Called()
}

// Init implements the ErrorsCollector interface.
func (m *CollectorMock) Init(repositoryID string) {
	m.Called(repositoryID)
}
