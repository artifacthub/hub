package helpers

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/artifacthub/hub/internal/hub"
)

const (
	// DefaultAPICacheMaxAge represents the default cache duration used by some
	// API endpoints.
	DefaultAPICacheMaxAge = 5 * time.Minute
)

// BuildCacheControlHeader builds an http cache header using the max age
// duration provided.
func BuildCacheControlHeader(cacheMaxAge time.Duration) string {
	return fmt.Sprintf("max-age=%d", int64(cacheMaxAge.Seconds()))
}

// RenderJSON is a helper to write the json data provided to the given http
// response writer, setting the appropriate content type, cache and status code.
func RenderJSON(w http.ResponseWriter, dataJSON []byte, cacheMaxAge time.Duration, code int) {
	w.Header().Set("Cache-Control", BuildCacheControlHeader(cacheMaxAge))
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_, _ = w.Write(dataJSON)
}

// RenderErrorJSON is a helper to write the error provided to the given http
// response writer as json setting the appropriate content type.
func RenderErrorJSON(w http.ResponseWriter, err error) {
	w.Header().Set("Content-Type", "application/json")
	var errMsg string
	switch {
	case errors.Is(err, hub.ErrInvalidInput):
		w.WriteHeader(http.StatusBadRequest)
		if err != nil {
			errMsg = err.Error()
		}
	case errors.Is(err, hub.ErrInsufficientPrivilege):
		w.WriteHeader(http.StatusForbidden)
	case errors.Is(err, hub.ErrNotFound):
		w.WriteHeader(http.StatusNotFound)
	default:
		w.WriteHeader(http.StatusInternalServerError)
	}
	writeErrorJSON(w, errMsg)
}

// RenderErrorWithCodeJSON is a helper to write the error provided to the given
// http response writer as json setting the appropriate content type. Unlike
// RenderErrorJSON, which decides what status code to use based on the type of
// the error provided, this methods expects the status code and the error msg
// will be always sent to the requester.
func RenderErrorWithCodeJSON(w http.ResponseWriter, err error, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	var errMsg string
	if err != nil {
		errMsg = err.Error()
	}
	writeErrorJSON(w, errMsg)
}

// writeErrorJSON buids the error payload and writes it to the writer provided.
func writeErrorJSON(w io.Writer, msg string) {
	data := map[string]interface{}{
		"message": msg,
	}
	_ = json.NewEncoder(w).Encode(data)
}
