package repo

import (
	"context"
	"errors"
	"net"
	"net/http"
	"testing"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHelmIndexLoaderUsesDefaultTransportDialer(t *testing.T) {
	// Not parallel: this test updates the process-wide default transport
	errDial := errors.New("dial error from default transport")
	tests.PreserveDefaultTransports(t)
	http.DefaultTransport.(*http.Transport).DialContext = func(context.Context, string, string) (net.Conn, error) {
		return nil, errDial
	}

	l := &HelmIndexLoader{}
	_, _, err := l.LoadIndex(&hub.Repository{Name: "repo1", URL: "http://repo1.example.com"})

	require.Error(t, err)
	assert.Contains(t, err.Error(), errDial.Error())
}

func TestNewHelmTransport(t *testing.T) {
	t.Parallel()

	transport, err := newHelmTransport()

	require.NoError(t, err)
	assert.True(t, transport.DisableCompression)
	assert.NotSame(t, http.DefaultTransport, transport)
}
