package tests

import (
	"net/http"
	"reflect"
	"testing"

	"github.com/google/go-containerregistry/pkg/v1/remote"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPreserveDefaultTransports(t *testing.T) {
	// Not parallel: this test updates the process-wide default transports
	transports := []*http.Transport{
		http.DefaultTransport.(*http.Transport),
		remote.DefaultTransport.(*http.Transport),
	}
	for _, transport := range transports {
		require.NotNil(t, transport.Proxy)
	}
	funcPointer := func(f any) uintptr {
		return reflect.ValueOf(f).Pointer()
	}
	dialers := make([]uintptr, 0, len(transports))
	proxies := make([]uintptr, 0, len(transports))
	for _, transport := range transports {
		dialers = append(dialers, funcPointer(transport.DialContext))
		proxies = append(proxies, funcPointer(transport.Proxy))
	}

	t.Run("settings updated", func(t *testing.T) {
		preserved := PreserveDefaultTransports(t)
		require.Equal(t, transports, preserved)
		for _, transport := range preserved {
			transport.DialContext = nil
			transport.Proxy = nil
		}
	})

	for i, transport := range transports {
		assert.Equal(t, dialers[i], funcPointer(transport.DialContext))
		assert.Equal(t, proxies[i], funcPointer(transport.Proxy))
	}
}
