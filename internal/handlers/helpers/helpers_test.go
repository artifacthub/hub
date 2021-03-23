package helpers

import (
	"bytes"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"time"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/stretchr/testify/assert"
)

func TestBuildCacheControlHeader(t *testing.T) {
	testCases := []struct {
		cacheMaxAge                time.Duration
		expectedCacheControlHeader string
	}{
		{
			0,
			"max-age=0",
		},
		{
			1 * time.Minute,
			"max-age=60",
		},
		{
			24 * time.Hour,
			"max-age=86400",
		},
	}
	for i, tc := range testCases {
		tc := tc
		t.Run(strconv.Itoa(i), func(t *testing.T) {
			t.Parallel()
			cacheControlHeader := BuildCacheControlHeader(tc.cacheMaxAge)
			assert.Equal(t, tc.expectedCacheControlHeader, cacheControlHeader)
		})
	}
}

func TestRenderJSON(t *testing.T) {
	testCases := []struct {
		data        []byte
		cacheMaxAge time.Duration
		code        int
	}{
		{
			nil,
			24 * time.Hour,
			http.StatusOK,
		},
		{
			[]byte("dataJSON"),
			0,
			http.StatusOK,
		},
		{
			[]byte("dataJSON"),
			24 * time.Hour,
			http.StatusCreated,
		},
	}
	for i, tc := range testCases {
		tc := tc
		t.Run(strconv.Itoa(i), func(t *testing.T) {
			t.Parallel()
			w := httptest.NewRecorder()
			RenderJSON(w, tc.data, tc.cacheMaxAge, tc.code)
			resp := w.Result()
			defer resp.Body.Close()
			h := resp.Header
			data, _ := ioutil.ReadAll(resp.Body)

			assert.Equal(t, tc.code, resp.StatusCode)
			assert.Equal(t, "application/json", h.Get("Content-Type"))
			assert.Equal(t, BuildCacheControlHeader(tc.cacheMaxAge), h.Get("Cache-Control"))
			if tc.data != nil {
				assert.Equal(t, tc.data, data)
			} else {
				assert.Equal(t, []byte{}, data)
			}
		})
	}
}

func TestRenderErrorJSON(t *testing.T) {
	testCases := []struct {
		err                error
		expectedStatusCode int
		expectedErrorMsg   string
	}{
		{
			hub.ErrInvalidInput,
			http.StatusBadRequest,
			"invalid input",
		},
		{
			fmt.Errorf("%w: test error", hub.ErrInvalidInput),
			http.StatusBadRequest,
			"invalid input: test error",
		},
		{
			hub.ErrInsufficientPrivilege,
			http.StatusForbidden,
			"",
		},
		{
			hub.ErrNotFound,
			http.StatusNotFound,
			"",
		},
		{
			tests.ErrFakeDB,
			http.StatusInternalServerError,
			"",
		},
	}
	for i, tc := range testCases {
		tc := tc
		t.Run(strconv.Itoa(i), func(t *testing.T) {
			t.Parallel()
			w := httptest.NewRecorder()
			RenderErrorJSON(w, tc.err)
			resp := w.Result()
			defer resp.Body.Close()
			h := resp.Header
			data, _ := ioutil.ReadAll(resp.Body)

			assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
			assert.Equal(t, "application/json", h.Get("Content-Type"))
			var expectedBody bytes.Buffer
			writeErrorJSON(&expectedBody, tc.expectedErrorMsg)
			assert.Equal(t, expectedBody.Bytes(), data)
		})
	}
}

func TestRenderErrorWithCodeJSON(t *testing.T) {
	testCases := []struct {
		err              error
		code             int
		expectedErrorMsg string
	}{
		{
			fmt.Errorf("%w: test error", hub.ErrInvalidInput),
			http.StatusBadRequest,
			"invalid input: test error",
		},
		{
			fmt.Errorf("%w: test error", hub.ErrInvalidInput),
			http.StatusBadGateway,
			"invalid input: test error",
		},
		{
			nil,
			http.StatusUnauthorized,
			"",
		},
	}
	for i, tc := range testCases {
		tc := tc
		t.Run(strconv.Itoa(i), func(t *testing.T) {
			t.Parallel()
			w := httptest.NewRecorder()
			RenderErrorWithCodeJSON(w, tc.err, tc.code)
			resp := w.Result()
			defer resp.Body.Close()
			h := resp.Header
			data, _ := ioutil.ReadAll(resp.Body)

			assert.Equal(t, tc.code, resp.StatusCode)
			assert.Equal(t, "application/json", h.Get("Content-Type"))
			var expectedBody bytes.Buffer
			writeErrorJSON(&expectedBody, tc.expectedErrorMsg)
			assert.Equal(t, expectedBody.Bytes(), data)
		})
	}
}
