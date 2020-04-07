package helpers

import (
	"fmt"
	"net/http"
	"time"
)

const (
	StaticCacheMaxAge     = 365 * 24 * time.Hour
	DefaultAPICacheMaxAge = 5 * time.Minute
)

// RenderJSON is a helper to write the json data provided to the given http
// response writer, setting the appropriate content type and cache
func RenderJSON(w http.ResponseWriter, dataJSON []byte, cacheMaxAge time.Duration) {
	w.Header().Set("Cache-Control", fmt.Sprintf("max-age=%d", int64(cacheMaxAge.Seconds())))
	w.Header().Set("Content-Type", "application/json")
	_, _ = w.Write(dataJSON)
}

// GetBaseURL is a helper function that builds the base url from the request
// provided.
func GetBaseURL(r *http.Request) string {
	scheme := "http"
	if r.TLS != nil {
		scheme = "https"
	}
	return fmt.Sprintf("%s://%s", scheme, r.Host)
}
