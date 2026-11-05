package util

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/netip"
	"syscall"
	"time"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/google/go-containerregistry/pkg/v1/remote"
)

// HTTPClientDefaultTimeout represents the default timeout used for http
// clients.
const HTTPClientDefaultTimeout = 10 * time.Second

// defaultDialTimeout and defaultDialKeepAlive match the dialer settings of the
// process-wide default transports.
const (
	defaultDialKeepAlive = 30 * time.Second
	defaultDialTimeout   = 30 * time.Second
)

var (
	// ErrRestrictedConnection error indicates that connections to the provided
	// address are restricted.
	ErrRestrictedConnection = errors.New("restricted connection")

	// nat64Prefix is the NAT64 well-known prefix, which embeds an IPv4 address
	// in its last four bytes.
	nat64Prefix = netip.MustParsePrefix("64:ff9b::/96")

	// restrictedPrefixes contains the special purpose ranges that are not
	// covered by the checks available in the netip package.
	restrictedPrefixes = []netip.Prefix{
		netip.MustParsePrefix("0.0.0.0/8"),
		netip.MustParsePrefix("100.64.0.0/10"),
		netip.MustParsePrefix("168.63.129.16/32"),
		netip.MustParsePrefix("192.0.0.0/24"),
		netip.MustParsePrefix("192.0.2.0/24"),
		netip.MustParsePrefix("192.88.99.0/24"),
		netip.MustParsePrefix("198.18.0.0/15"),
		netip.MustParsePrefix("198.51.100.0/24"),
		netip.MustParsePrefix("203.0.113.0/24"),
		netip.MustParsePrefix("240.0.0.0/4"),
		netip.MustParsePrefix("::/96"),
		netip.MustParsePrefix("::ffff:0:0:0/96"),
		netip.MustParsePrefix("64:ff9b:1::/48"),
		netip.MustParsePrefix("100::/64"),
		netip.MustParsePrefix("2001::/32"),
		netip.MustParsePrefix("2001:2::/48"),
		netip.MustParsePrefix("2001:db8::/32"),
		netip.MustParsePrefix("3fff::/20"),
		netip.MustParsePrefix("5f00::/16"),
		netip.MustParsePrefix("fec0::/10"),
	}

	// sixToFourPrefix is the 6to4 prefix, which embeds an IPv4 address right
	// after its first two bytes.
	sixToFourPrefix = netip.MustParsePrefix("2002::/16")
)

// NewUnrestrictedHTTPClient returns an http client that does not depend on the
// process-wide default transports, so it is not affected by the restrictions
// applied by SetupDefaultTransports. It must only be used to reach destinations
// that are not user-controlled, like the configured OIDC issuer or the GitHub
// and Google OAuth endpoints.
func NewUnrestrictedHTTPClient() *http.Client {
	return &http.Client{
		Transport: &http.Transport{
			DialContext: (&net.Dialer{
				KeepAlive: defaultDialKeepAlive,
				Timeout:   defaultDialTimeout,
			}).DialContext,
			ExpectContinueTimeout: 1 * time.Second,
			ForceAttemptHTTP2:     true,
			IdleConnTimeout:       90 * time.Second,
			MaxIdleConns:          100,
			Proxy:                 http.ProxyFromEnvironment,
			TLSHandshakeTimeout:   HTTPClientDefaultTimeout,
		},
	}
}

// SetupDefaultTransports applies the address restrictions to the process-wide
// default transports when restricted is set to true, covering the libraries
// that do not use the clients returned by SetupHTTPClient, like the OCI registry
// clients. The transports are updated in place because some libraries keep a
// reference to them, so this function must be called before any request is made.
func SetupDefaultTransports(restricted bool) error {
	if !restricted {
		return nil
	}
	for _, rt := range []http.RoundTripper{http.DefaultTransport, remote.DefaultTransport} {
		transport, ok := rt.(*http.Transport)
		if !ok {
			return fmt.Errorf("unsupported default transport type: %T", rt)
		}
		restrictTransport(transport)
	}
	return nil
}

// SetupHTTPClient is a helper that returns an http client. If restricted is
// set to true, the http client won't be able to make requests to a set of
// restricted addresses.
func SetupHTTPClient(restricted bool, timeout time.Duration) hub.HTTPClient {
	if restricted {
		return setupRestrictedHTTPClient(timeout)
	}
	return &http.Client{
		Timeout: timeout,
	}
}

// setupRestrictedHTTPClient returns an http client that is not allowed to make
// requests to a set of restricted addresses. It does not use proxies for the
// reasons explained in restrictTransport.
func setupRestrictedHTTPClient(timeout time.Duration) hub.HTTPClient {
	dialer := &net.Dialer{
		Timeout: timeout,
		Control: checkRestrictions,
	}
	transport := &http.Transport{
		DialContext: dialer.DialContext,
		DialTLSContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
			return tls.DialWithDialer(dialer, network, addr, &tls.Config{
				MinVersion: tls.VersionTLS12,
			})
		},
		ExpectContinueTimeout: 1 * time.Second,
		ForceAttemptHTTP2:     true,
		IdleConnTimeout:       90 * time.Second,
		MaxIdleConns:          100,
		TLSHandshakeTimeout:   timeout,
	}
	return &http.Client{
		Timeout:   timeout,
		Transport: transport,
	}
}

// restrictTransport makes the transport provided check the restrictions on
// every connection, preserving the rest of its configuration. Proxies are not
// used, as the restrictions would only apply to the address of the proxy, not to
// the final destination.
func restrictTransport(transport *http.Transport) {
	transport.Proxy = nil
	transport.DialContext = (&net.Dialer{
		Control:   checkRestrictions,
		KeepAlive: defaultDialKeepAlive,
		Timeout:   defaultDialTimeout,
	}).DialContext
}

// checkRestrictions checks if a connection to the provided network and address
// should be restricted.
func checkRestrictions(network string, address string, conn syscall.RawConn) error {
	if network != "tcp4" && network != "tcp6" {
		return ErrRestrictedConnection
	}
	host, _, err := net.SplitHostPort(address)
	if err != nil {
		return ErrRestrictedConnection
	}
	addr, err := netip.ParseAddr(host)
	if err != nil {
		return ErrRestrictedConnection
	}
	if isRestrictedAddr(addr) {
		return ErrRestrictedConnection
	}
	return nil
}

// isRestrictedAddr checks if the address provided is restricted. IPv6 addresses
// embedding an IPv4 one are restricted based on the embedded address, as they
// can be used to reach it. Deprecated forms of those addresses, like the IPv4
// compatible ones, are always restricted.
func isRestrictedAddr(addr netip.Addr) bool {
	addr = addr.Unmap().WithZone("")
	if !addr.IsGlobalUnicast() || addr.IsPrivate() {
		return true
	}
	for _, prefix := range restrictedPrefixes {
		if prefix.Contains(addr) {
			return true
		}
	}
	bytes := addr.As16()
	switch {
	case nat64Prefix.Contains(addr):
		return isRestrictedAddr(netip.AddrFrom4([4]byte(bytes[12:16])))
	case sixToFourPrefix.Contains(addr):
		return isRestrictedAddr(netip.AddrFrom4([4]byte(bytes[2:6])))
	}
	return false
}
