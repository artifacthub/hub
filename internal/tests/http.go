package tests

import (
	"net/http"

	"github.com/stretchr/testify/mock"
)

// HTTPClientMock is a mock HTTPClient implementation.
type HTTPClientMock struct {
	mock.Mock
}

// Do implements the HTTPClient interface.
func (m *HTTPClientMock) Do(req *http.Request) (*http.Response, error) {
	args := m.Called(req)
	resp, _ := args.Get(0).(*http.Response)
	return resp, args.Error(1)
}

// ErrReader represents a faulty reader implementation. It can be handy to
// simulate faulty requests bodies (ioutil.NopCloser(tests.ErrReader(0))).
type ErrReader int

// Read implements the io.Reader interface.
func (ErrReader) Read(p []byte) (n int, err error) {
	return 0, ErrFake
}
