package util

import (
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"

	"github.com/artifacthub/hub/internal/tests"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCheckRestrictions(t *testing.T) {
	t.Parallel()

	testCases := []struct {
		name       string
		network    string
		address    string
		restricted bool
	}{
		{"public ipv4", "tcp4", "8.8.8.8:443", false},
		{"public ipv6", "tcp6", "[2606:4700:4700::1111]:443", false},
		{"nat64 with public ipv4", "tcp6", "[64:ff9b::808:808]:443", false},
		{"6to4 with public ipv4", "tcp6", "[2002:808:808::]:443", false},
		{"public ipv6 next to teredo", "tcp6", "[2001:4860:4860::8888]:443", false},
		{"public ipv6 next to benchmarking", "tcp6", "[2001:3::1]:443", false},
		{"public ipv6 next to documentation", "tcp6", "[3fff:1000::1]:443", false},
		{"public ipv6 next to srv6", "tcp6", "[5f01::1]:443", false},
		{"public ipv6 next to discard", "tcp6", "[100:0:0:1::1]:443", false},
		{"public ipv4 next to 6to4 relay", "tcp4", "192.88.100.1:443", false},
		{"udp network", "udp4", "8.8.8.8:53", true},
		{"missing port", "tcp4", "8.8.8.8", true},
		{"invalid address", "tcp4", "invalid:443", true},
		{"loopback", "tcp4", "127.0.0.1:80", true},
		{"ipv6 loopback", "tcp6", "[::1]:80", true},
		{"unspecified", "tcp4", "0.0.0.0:80", true},
		{"this network", "tcp4", "0.1.2.3:80", true},
		{"private 10/8", "tcp4", "10.0.0.5:80", true},
		{"private 172.16/12", "tcp4", "172.16.0.1:80", true},
		{"private 192.168/16", "tcp4", "192.168.1.1:80", true},
		{"unique local", "tcp6", "[fd00:ec2::254]:80", true},
		{"link local", "tcp4", "169.254.169.254:80", true},
		{"ipv6 link local with zone", "tcp6", "[fe80::1%eth0]:80", true},
		{"multicast", "tcp4", "224.0.0.1:80", true},
		{"carrier grade nat", "tcp4", "100.64.0.1:80", true},
		{"alibaba metadata", "tcp4", "100.100.100.200:80", true},
		{"azure wire server", "tcp4", "168.63.129.16:80", true},
		{"documentation range", "tcp4", "192.0.2.1:80", true},
		{"benchmarking range", "tcp4", "198.18.0.1:80", true},
		{"reserved range", "tcp4", "240.0.0.1:80", true},
		{"ipv6 documentation range", "tcp6", "[2001:db8::1]:80", true},
		{"ipv4 mapped private", "tcp6", "[::ffff:10.0.0.5]:80", true},
		{"nat64 with private ipv4", "tcp6", "[64:ff9b::a00:5]:80", true},
		{"nat64 with link local ipv4", "tcp6", "[64:ff9b::a9fe:a9fe]:80", true},
		{"nat64 local use", "tcp6", "[64:ff9b:1::a00:5]:80", true},
		{"6to4 with private ipv4", "tcp6", "[2002:a00:5::]:80", true},
		{"6to4 with relay ipv4", "tcp6", "[2002:c058:6301::]:80", true},
		{"ipv4 compatible with link local ipv4", "tcp6", "[::a9fe:a9fe]:80", true},
		{"ipv4 compatible with private ipv4", "tcp6", "[::10.0.0.5]:80", true},
		{"ipv4 compatible with public ipv4", "tcp6", "[::8.8.8.8]:80", true},
		{"ipv4 translated", "tcp6", "[::ffff:0:a9fe:a9fe]:80", true},
		{"site local", "tcp6", "[fec0::1]:80", true},
		{"discard only", "tcp6", "[100::1]:80", true},
		{"teredo", "tcp6", "[2001:0:4136:e378::1]:80", true},
		{"ipv6 benchmarking range", "tcp6", "[2001:2::1]:80", true},
		{"ipv6 second documentation range", "tcp6", "[3fff::1]:80", true},
		{"srv6 sids", "tcp6", "[5f00::1]:80", true},
		{"6to4 relay anycast", "tcp4", "192.88.99.1:80", true},
	}
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			err := checkRestrictions(tc.network, tc.address, nil)
			if tc.restricted {
				assert.ErrorIs(t, err, ErrRestrictedConnection)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestRestrictTransport(t *testing.T) {
	t.Parallel()

	var hits atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		hits.Add(1)
	}))
	defer srv.Close()

	transport := &http.Transport{}
	restrictTransport(transport)
	client := &http.Client{Transport: transport}
	resp, err := client.Get(srv.URL)
	if resp != nil {
		resp.Body.Close()
	}

	require.ErrorIs(t, err, ErrRestrictedConnection)
	assert.Zero(t, hits.Load())
}

func TestRestrictTransportDisablesProxy(t *testing.T) {
	t.Parallel()

	transport := &http.Transport{Proxy: http.ProxyFromEnvironment}
	restrictTransport(transport)

	assert.Nil(t, transport.Proxy)
}

func TestRestrictedHTTPClientDoesNotUseProxy(t *testing.T) {
	t.Parallel()

	client, ok := SetupHTTPClient(true, time.Second).(*http.Client)
	require.True(t, ok)
	transport, ok := client.Transport.(*http.Transport)
	require.True(t, ok)

	assert.Nil(t, transport.Proxy)
}

func TestSetupDefaultTransports(t *testing.T) {
	// Not parallel: these tests update the process-wide default transports
	transports := tests.PreserveDefaultTransports(t)

	var hits atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		hits.Add(1)
	}))
	defer srv.Close()

	// Nothing is restricted unless requested
	require.NoError(t, SetupDefaultTransports(false))
	for _, transport := range transports {
		resp, err := (&http.Client{Transport: transport}).Get(srv.URL)
		require.NoError(t, err)
		resp.Body.Close()
	}
	require.EqualValues(t, len(transports), hits.Load())
	hits.Store(0)

	// Both transports are updated in place when restricted
	require.NoError(t, SetupDefaultTransports(true))
	for _, transport := range transports {
		transport.CloseIdleConnections()
		_, err := (&http.Client{Transport: transport}).Get(srv.URL) //nolint:bodyclose
		require.ErrorIs(t, err, ErrRestrictedConnection)
		assert.Nil(t, transport.Proxy)
	}
	assert.Zero(t, hits.Load())

	// The client for operator set destinations is not affected
	resp, err := NewUnrestrictedHTTPClient().Get(srv.URL)
	require.NoError(t, err)
	resp.Body.Close()
	assert.EqualValues(t, 1, hits.Load())
}
