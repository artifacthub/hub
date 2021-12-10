package util

import (
	"context"
	"crypto/tls"
	"errors"
	"net"
	"net/http"
	"syscall"
	"time"

	"github.com/artifacthub/hub/internal/hub"
)

var (
	// ErrRestrictedConnection error indicates that connections to the provided
	// address are restricted.
	ErrRestrictedConnection = errors.New("restricted connection")

	// HTTPClientDefaultTimeout represents the default timeout used for http
	// clients.
	HTTPClientDefaultTimeout = 10 * time.Second
)

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
// requests to a set of restricted addresses.
func setupRestrictedHTTPClient(timeout time.Duration) hub.HTTPClient {
	dialer := &net.Dialer{
		Timeout:   timeout,
		DualStack: true,
		Control:   checkRestrictions,
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
		Proxy:                 http.ProxyFromEnvironment,
		TLSHandshakeTimeout:   timeout,
	}
	return &http.Client{
		Timeout:   timeout,
		Transport: transport,
	}
}

// checkRestrictions checks if a connection to the provided network and address
// should be restricted.
func checkRestrictions(network string, address string, conn syscall.RawConn) error {
	if !(network == "tcp4" || network == "tcp6") {
		return ErrRestrictedConnection
	}
	host, _, err := net.SplitHostPort(address)
	if err != nil {
		return ErrRestrictedConnection
	}
	ip := net.ParseIP(host)
	if ip == nil {
		return ErrRestrictedConnection
	}
	if !ip.IsGlobalUnicast() || ip.IsPrivate() {
		return ErrRestrictedConnection
	}
	return nil
}
