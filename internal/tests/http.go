package tests

import (
	"net/http"

	"github.com/stretchr/testify/mock"
)

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
