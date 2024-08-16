package helpers

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"github.com/artifacthub/hub/internal/hub"
)

const (
	// DefaultAPICacheMaxAge represents the default cache duration used by some
	// API endpoints.
	DefaultAPICacheMaxAge = 5 * time.Minute

	// PaginationDefaultLimit represents the default limit used for pagination.
	PaginationDefaultLimit = 20

	// PaginationMaxLimit represents the default maximum limit used for
	// pagination.
	PaginationMaxLimit = 60

	// PaginationTotalCount represents a header used to indicate the number of
	// entries available for pagination purposes.
	PaginationTotalCount = "Pagination-Total-Count"
)

// BuildCacheControlHeader builds an http cache header using the max age
// duration provided.
func BuildCacheControlHeader(cacheMaxAge time.Duration) string {
	return fmt.Sprintf("max-age=%d", int64(cacheMaxAge.Seconds()))
}

// GetPagination is a helper that extracts the pagination information from the
// query string values provided.
func GetPagination(qs url.Values, defaultLimit, maxLimit int) (*hub.Pagination, error) {
	// Limit
	var limit int
	if qs.Get("limit") != "" {
		var err error
		limit, err = strconv.Atoi(qs.Get("limit"))
		if err != nil {
			return nil, fmt.Errorf("invalid limit: %s", qs.Get("limit"))
		}
		if limit > maxLimit {
			return nil, fmt.Errorf("invalid limit: %s (max: %d)", qs.Get("limit"), maxLimit)
		}
	} else {
		limit = defaultLimit
	}

	// Offset
	var offset int
	if qs.Get("offset") != "" {
		var err error
		offset, err = strconv.Atoi(qs.Get("offset"))
		if err != nil {
			return nil, fmt.Errorf("invalid offset: %s", qs.Get("offset"))
		}
	}

	return &hub.Pagination{
		Limit:  limit,
		Offset: offset,
	}, nil
}

// RenderJSON is a helper to write the json data provided to the given http
// response writer, setting the appropriate content type, cache and status code.
func RenderJSON(w http.ResponseWriter, dataJSON []byte, cacheMaxAge time.Duration, code int) {
	w.Header().Set("Cache-Control", BuildCacheControlHeader(cacheMaxAge))
	w.Header().Set("Content-Length", strconv.Itoa(len(dataJSON)))
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
