package httpw

import (
	"io"
	"net/http"
)

// UserAgent is the user agent string used on requests made by ArtifactHub.
const UserAgent = "ArtifactHub"

// NewHTTPRequest creates a new HTTP request with the ArtifactHub User-Agent
// header set. It's a wrapper around http.NewHTTPRequest that automatically
// adds the User-Agent header.
func NewRequest(method, url string, body io.Reader) (*http.Request, error) {
	req, err := http.NewRequest(method, url, body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", UserAgent)
	return req, nil
}
