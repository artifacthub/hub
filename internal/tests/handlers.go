package tests

import (
	"fmt"
	"time"
)

// BuildCacheControlHeader builds an http cache header using the max age
// duration provided.
func BuildCacheControlHeader(cacheMaxAge time.Duration) string {
	return fmt.Sprintf("max-age=%d", int64(cacheMaxAge.Seconds()))
}
