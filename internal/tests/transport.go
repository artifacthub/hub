package tests

import (
	"context"
	"net"
	"net/http"
	"net/url"
	"testing"

	"github.com/google/go-containerregistry/pkg/v1/remote"
)

// PreserveDefaultTransports returns the process-wide default transports, the
// net/http and the go-containerregistry ones, after saving the settings that
// util.SetupDefaultTransports updates in place (DialContext and Proxy). Those
// settings are restored when the test and all its subtests complete. Idle
// connections are closed on both occasions, so connections established with
// previous settings are not reused. Tests using it must not run in parallel.
func PreserveDefaultTransports(tb testing.TB) []*http.Transport {
	tb.Helper()

	transports := make([]*http.Transport, 0, 2)
	for _, rt := range []http.RoundTripper{http.DefaultTransport, remote.DefaultTransport} {
		transport, ok := rt.(*http.Transport)
		if !ok {
			tb.Fatalf("unsupported default transport type: %T", rt)
		}
		transports = append(transports, transport)
	}

	type settings struct {
		dialContext func(ctx context.Context, network, addr string) (net.Conn, error)
		proxy       func(*http.Request) (*url.URL, error)
	}
	saved := make([]settings, 0, len(transports))
	for _, transport := range transports {
		saved = append(saved, settings{
			dialContext: transport.DialContext,
			proxy:       transport.Proxy,
		})
		transport.CloseIdleConnections()
	}
	tb.Cleanup(func() {
		for i, transport := range transports {
			transport.DialContext = saved[i].dialContext
			transport.Proxy = saved[i].proxy
			transport.CloseIdleConnections()
		}
	})

	return transports
}
