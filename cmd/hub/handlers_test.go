package main

import (
	"errors"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"testing"
	"time"

	"github.com/cncf/hub/internal/hub"
	"github.com/cncf/hub/internal/img/pg"
	"github.com/cncf/hub/internal/tests"
	"github.com/jackc/pgx/v4"
	"github.com/julienschmidt/httprouter"
	"github.com/rs/zerolog"
	"github.com/spf13/viper"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var testFakeError = errors.New("test fake error")

func TestMain(m *testing.M) {
	zerolog.SetGlobalLevel(zerolog.Disabled)
	os.Exit(m.Run())
}

func TestServeIndex(t *testing.T) {
	// Setup test handlers
	th := setupTestHandlers()

	// Test index file is successfully served with the expected headers
	w := httptest.NewRecorder()
	r, _ := http.NewRequest("GET", "/", nil)
	th.h.serveIndex(w, r)
	h := w.Result().Header
	data, _ := ioutil.ReadAll(w.Result().Body)
	assert.Equal(t, http.StatusOK, w.Result().StatusCode)
	assert.Equal(t, "no-store, no-cache, must-revalidate", h.Get("Cache-Control"))
	assert.Equal(t, []byte("indexHtmlData\n"), data)
}

func TestServeStaticFile(t *testing.T) {
	// Setup test handlers and server
	th := setupTestHandlers()
	s := httptest.NewServer(th.h.router)
	defer s.Close()

	// Test non existing static file
	resp, err := http.Get(s.URL + "/static/test.js")
	require.NoError(t, err)
	defer resp.Body.Close()
	assert.Equal(t, http.StatusNotFound, resp.StatusCode)

	// Test existing static file is successfully served with the expected headers
	resp, err = http.Get(s.URL + "/static/test.css")
	require.NoError(t, err)
	defer resp.Body.Close()
	h := resp.Header
	data, _ := ioutil.ReadAll(resp.Body)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	assert.Equal(t, buildCacheControlHeader(staticCacheMaxAge), h.Get("Cache-Control"))
	assert.Equal(t, []byte("testCssData\n"), data)
}

func TestGetStats(t *testing.T) {
	// Setup test handlers and router
	th := setupTestHandlers()
	th.db.SetData("", []byte("statsDataJSON"))

	// Test valid request
	w := httptest.NewRecorder()
	r, _ := http.NewRequest("GET", "/", nil)
	th.h.getStats(w, r, nil)
	h := w.Result().Header
	data, _ := ioutil.ReadAll(w.Result().Body)
	assert.Equal(t, http.StatusOK, w.Result().StatusCode)
	assert.Equal(t, "application/json", h.Get("Content-Type"))
	assert.Equal(t, buildCacheControlHeader(defaultAPICacheMaxAge), h.Get("Cache-Control"))
	assert.Equal(t, []byte("statsDataJSON"), data)

	// Test introducing fake database error
	th.db.SetError("", testFakeError)
	w = httptest.NewRecorder()
	th.h.getStats(w, r, nil)
	assert.Equal(t, http.StatusInternalServerError, w.Result().StatusCode)
}

func TestGetPackagesUpdates(t *testing.T) {
	// Setup test handlers and router
	th := setupTestHandlers()
	th.db.SetData("", []byte("packagesUpdatesDataJSON"))

	// Test valid request
	w := httptest.NewRecorder()
	r, _ := http.NewRequest("GET", "/", nil)
	th.h.getPackagesUpdates(w, r, nil)
	h := w.Result().Header
	data, _ := ioutil.ReadAll(w.Result().Body)
	assert.Equal(t, http.StatusOK, w.Result().StatusCode)
	assert.Equal(t, "application/json", h.Get("Content-Type"))
	assert.Equal(t, buildCacheControlHeader(defaultAPICacheMaxAge), h.Get("Cache-Control"))
	assert.Equal(t, []byte("packagesUpdatesDataJSON"), data)

	// Test introducing fake database error
	th.db.SetError("", testFakeError)
	w = httptest.NewRecorder()
	th.h.getPackagesUpdates(w, r, nil)
	assert.Equal(t, http.StatusInternalServerError, w.Result().StatusCode)
}

func TestSearch(t *testing.T) {
	// Setup test handlers and router
	th := setupTestHandlers()
	th.db.SetData("", []byte("searchResultsDataJSON"))

	// Test some invalid requests
	badRequests := []struct {
		desc   string
		params string
	}{
		{"invalid limit", "limit=z"},
		{"invalid offset", "offset=z"},
		{"invalid facets", "facets=z"},
		{"invalid kind", "kind=z"},
		{"invalid kind (one of them)", "kind=0&kind=z"},
		{"invalid repo", "repo=repo1"},
	}
	for _, tc := range badRequests {
		t.Run("bad request: "+tc.desc, func(t *testing.T) {
			w := httptest.NewRecorder()
			r, _ := http.NewRequest("GET", "/?"+tc.params, nil)
			th.h.search(w, r, nil)
			assert.Equal(t, http.StatusBadRequest, w.Result().StatusCode)
		})
	}

	// Test valid request
	w := httptest.NewRecorder()
	r, _ := http.NewRequest("GET", "/", nil)
	th.h.search(w, r, nil)
	h := w.Result().Header
	data, _ := ioutil.ReadAll(w.Result().Body)
	assert.Equal(t, http.StatusOK, w.Result().StatusCode)
	assert.Equal(t, "application/json", h.Get("Content-Type"))
	assert.Equal(t, buildCacheControlHeader(defaultAPICacheMaxAge), h.Get("Cache-Control"))
	assert.Equal(t, []byte("searchResultsDataJSON"), data)

	// Test introducing fake database error
	th.db.SetError("", testFakeError)
	w = httptest.NewRecorder()
	th.h.search(w, r, nil)
	assert.Equal(t, http.StatusInternalServerError, w.Result().StatusCode)
}

func TestGetPackage(t *testing.T) {
	// Setup test handlers and router
	th := setupTestHandlers()
	th.db.SetData("", []byte("packageDataJSON"))

	// Test request for non existing package
	th.db.SetError("", pgx.ErrNoRows)
	w := httptest.NewRecorder()
	r, _ := http.NewRequest("GET", "/", nil)
	th.h.getPackage(w, r, nil)
	assert.Equal(t, http.StatusNotFound, w.Result().StatusCode)

	// Test request for existing package
	th.db.SetError("", nil)
	w = httptest.NewRecorder()
	r, _ = http.NewRequest("GET", "/", nil)
	th.h.getPackage(w, r, nil)
	h := w.Result().Header
	data, _ := ioutil.ReadAll(w.Result().Body)
	assert.Equal(t, http.StatusOK, w.Result().StatusCode)
	assert.Equal(t, "application/json", h.Get("Content-Type"))
	assert.Equal(t, buildCacheControlHeader(defaultAPICacheMaxAge), h.Get("Cache-Control"))
	assert.Equal(t, []byte("packageDataJSON"), data)

	// Test introducing fake database error
	th.db.SetError("", testFakeError)
	w = httptest.NewRecorder()
	th.h.getPackage(w, r, nil)
	assert.Equal(t, http.StatusInternalServerError, w.Result().StatusCode)
}

func TestGetPackageVersion(t *testing.T) {
	th := setupTestHandlers()
	th.db.SetData("", []byte("packageVersionDataJSON"))

	// Test request for non existing package and version
	th.db.SetError("", pgx.ErrNoRows)
	w := httptest.NewRecorder()
	r, _ := http.NewRequest("GET", "/", nil)
	th.h.getPackageVersion(w, r, nil)
	assert.Equal(t, http.StatusNotFound, w.Result().StatusCode)

	// Test request for existing package and version
	th.db.SetError("", nil)
	w = httptest.NewRecorder()
	r, _ = http.NewRequest("GET", "/", nil)
	th.h.getPackageVersion(w, r, nil)
	h := w.Result().Header
	data, _ := ioutil.ReadAll(w.Result().Body)
	assert.Equal(t, http.StatusOK, w.Result().StatusCode)
	assert.Equal(t, "application/json", h.Get("Content-Type"))
	assert.Equal(t, buildCacheControlHeader(defaultAPICacheMaxAge), h.Get("Cache-Control"))
	assert.Equal(t, []byte("packageVersionDataJSON"), data)

	// Test introducing fake database error
	th.db.SetError("", testFakeError)
	w = httptest.NewRecorder()
	th.h.getPackageVersion(w, r, nil)
	assert.Equal(t, http.StatusInternalServerError, w.Result().StatusCode)
}

func TestImage(t *testing.T) {
	th := setupTestHandlers()

	// Test requesting non existing image
	th.db.SetError("", pgx.ErrNoRows)
	w := httptest.NewRecorder()
	r, _ := http.NewRequest("GET", "/", nil)
	th.h.image(w, r, nil)
	assert.Equal(t, http.StatusNotFound, w.Result().StatusCode)

	// Test introducing fake database error
	th.db.SetError("", testFakeError)
	w = httptest.NewRecorder()
	th.h.image(w, r, nil)
	assert.Equal(t, http.StatusInternalServerError, w.Result().StatusCode)

	// Test requesting two existing images (png and svg)
	th.db.SetError("", nil)
	testCases := []struct {
		imgPath             string
		expectedContentType string
	}{
		{"testdata/image.png", "image/png"},
		{"testdata/image.svg", "image/svg+xml"},
	}
	for i, tc := range testCases {
		t.Run(fmt.Sprintf("Test %d: %s", i, tc.expectedContentType), func(t *testing.T) {
			imgData, err := ioutil.ReadFile(tc.imgPath)
			require.NoError(t, err)
			th.db.SetData("", imgData)

			w := httptest.NewRecorder()
			r, _ := http.NewRequest("GET", "/", nil)
			ps := httprouter.Params{
				httprouter.Param{Key: "image", Value: strconv.Itoa(i)},
			}
			th.h.image(w, r, ps)
			h := w.Result().Header
			data, _ := ioutil.ReadAll(w.Result().Body)
			assert.Equal(t, http.StatusOK, w.Result().StatusCode)
			assert.Equal(t, tc.expectedContentType, h.Get("Content-Type"))
			assert.Equal(t, "public, max-age=31536000", h.Get("Cache-Control"))
			assert.Equal(t, imgData, data)
		})
	}
}

func TestBasicAuth(t *testing.T) {
	th := setupTestHandlers()
	th.cfg.Set("server.basicAuth.enabled", true)
	th.cfg.Set("server.basicAuth.username", "test")
	th.cfg.Set("server.basicAuth.password", "test")

	// Test getting index file without providing basic auth credentials
	w := httptest.NewRecorder()
	r, _ := http.NewRequest("GET", "/", nil)
	th.h.basicAuth(http.HandlerFunc(th.h.serveIndex)).ServeHTTP(w, r)
	assert.Equal(t, http.StatusUnauthorized, w.Result().StatusCode)

	// Test getting index providing basic auth credentials
	w = httptest.NewRecorder()
	r.SetBasicAuth("test", "test")
	th.h.basicAuth(http.HandlerFunc(th.h.serveIndex)).ServeHTTP(w, r)
	assert.Equal(t, http.StatusOK, w.Result().StatusCode)
}

type testHandlers struct {
	cfg *viper.Viper
	db  *tests.DBMock
	h   *handlers
}

func setupTestHandlers() *testHandlers {
	cfg := viper.New()
	cfg.Set("server.webBuildPath", "testdata")
	db := &tests.DBMock{}
	hubApi := hub.New(db)
	imageStore := pg.NewImageStore(db)

	return &testHandlers{
		cfg: cfg,
		db:  db,
		h:   setupHandlers(cfg, hubApi, imageStore),
	}
}

func buildCacheControlHeader(cacheMaxAge time.Duration) string {
	return fmt.Sprintf("max-age=%d", int64(cacheMaxAge.Seconds()))
}
