package helpers

import (
	"fmt"
	"net/http"
	"time"
)

const (
	DefaultAPICacheMaxAge = 5 * time.Minute
	DefaultBotCacheMaxAge = 5 * time.Minute
)

// BuildCacheControlHeader builds an http cache header using the max age
// duration provided.
func BuildCacheControlHeader(cacheMaxAge time.Duration) string {
	return fmt.Sprintf("max-age=%d", int64(cacheMaxAge.Seconds()))
}

// RenderJSON is a helper to write the json data provided to the given http
// response writer, setting the appropriate content type and cache.
func RenderJSON(w http.ResponseWriter, dataJSON []byte, cacheMaxAge time.Duration) {
	w.Header().Set("Cache-Control", BuildCacheControlHeader(cacheMaxAge))
	w.Header().Set("Content-Type", "application/json")
	_, _ = w.Write(dataJSON)
}
