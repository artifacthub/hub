package tracker

import (
	"net/http"

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

// HTTPGetterMock is a mock HTTPGetter implementation.
type HTTPGetterMock struct {
	mock.Mock
}

// Get implements the HTTPGetter interface.
func (m *HTTPGetterMock) Get(url string) (*http.Response, error) {
	args := m.Called(url)
	resp, _ := args.Get(0).(*http.Response)
	return resp, args.Error(1)
}
