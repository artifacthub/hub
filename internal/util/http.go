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
)

// SetupHTTPClient is a helper that returns an http client. If restricted is
// set to true, the http client won't be able to make requests to a set of
// restricted addresses.
func SetupHTTPClient(restricted bool) hub.HTTPClient {
	if restricted {
		return setupRestrictedHTTPClient()
	}
	return &http.Client{
		Timeout: 10 * time.Second,
	}
}

// setupRestrictedHTTPClient returns an http client that is not allowed to make
// requests to a set of restricted addresses.
func setupRestrictedHTTPClient() hub.HTTPClient {
	dialer := &net.Dialer{
		Timeout:   10 * time.Second,
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
		TLSHandshakeTimeout:   10 * time.Second,
	}
	return &http.Client{
		Timeout:   10 * time.Second,
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
	if !ip.IsGlobalUnicast() || isPrivate(ip) { // TODO: use ip.IsPrivate() when available
		return ErrRestrictedConnection
	}
	return nil
}

// isPrivate reports whether ip is a private address, according to
// RFC 1918 (IPv4 addresses) and RFC 4193 (IPv6 addresses).
//
// Source: https://github.com/golang/go/blob/5963f0a332496a68f1eb2d0c6a5badd73c9f046d/src/net/ip.go#L131-L148
func isPrivate(ip net.IP) bool {
	if ip4 := ip.To4(); ip4 != nil {
		// Following RFC 1918, Section 3. Private Address Space which says:
		//   The Internet Assigned Numbers Authority (IANA) has reserved the
		//   following three blocks of the IP address space for private internets:
		//     10.0.0.0        -   10.255.255.255  (10/8 prefix)
		//     172.16.0.0      -   172.31.255.255  (172.16/12 prefix)
		//     192.168.0.0     -   192.168.255.255 (192.168/16 prefix)
		return ip4[0] == 10 ||
			(ip4[0] == 172 && ip4[1]&0xf0 == 16) ||
			(ip4[0] == 192 && ip4[1] == 168)
	}
	// Following RFC 4193, Section 8. IANA Considerations which says:
	//   The IANA has assigned the FC00::/7 prefix to "Unique Local Unicast".
	return len(ip) == net.IPv6len && ip[0]&0xfe == 0xfc
}
