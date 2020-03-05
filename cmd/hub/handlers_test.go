package main

import (
	"errors"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"strings"
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
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

var errFakeDatabaseFailure = errors.New("fake database failure")

func TestMain(m *testing.M) {
	zerolog.SetGlobalLevel(zerolog.Disabled)
	os.Exit(m.Run())
}

func TestServeIndex(t *testing.T) {
	th := setupTestHandlers()

	w := httptest.NewRecorder()
	r, _ := http.NewRequest("GET", "/", nil)
	th.h.serveIndex(w, r)
	resp := w.Result()
	defer resp.Body.Close()
	h := resp.Header
	data, _ := ioutil.ReadAll(resp.Body)

	assert.Equal(t, http.StatusOK, resp.StatusCode)
	assert.Equal(t, "no-store, no-cache, must-revalidate", h.Get("Cache-Control"))
	assert.Equal(t, []byte("indexHtmlData\n"), data)
}

func TestServeStaticFile(t *testing.T) {
	th := setupTestHandlers()
	s := httptest.NewServer(th.h.router)
	defer s.Close()

	t.Run("non existing static file", func(t *testing.T) {
		resp, err := http.Get(s.URL + "/static/test.js")
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusNotFound, resp.StatusCode)
	})

	t.Run("existing static file", func(t *testing.T) {
		resp, err := http.Get(s.URL + "/static/test.css")
		require.NoError(t, err)
		defer resp.Body.Close()
		h := resp.Header
		data, _ := ioutil.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, buildCacheControlHeader(staticCacheMaxAge), h.Get("Cache-Control"))
		assert.Equal(t, []byte("testCssData\n"), data)
	})
}

func TestGetStats(t *testing.T) {
	t.Run("valid request", func(t *testing.T) {
		th := setupTestHandlers()
		th.db.On(
			"QueryRow",
			"select get_stats()",
		).Return([]byte("statsDataJSON"), nil)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		th.h.getStats(w, r, nil)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := ioutil.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, buildCacheControlHeader(defaultAPICacheMaxAge), h.Get("Cache-Control"))
		assert.Equal(t, []byte("statsDataJSON"), data)
		th.db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		th := setupTestHandlers()
		th.db.On(
			"QueryRow",
			"select get_stats()",
		).Return(nil, errFakeDatabaseFailure)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		th.h.getStats(w, r, nil)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		th.db.AssertExpectations(t)
	})
}

func TestGetPackagesUpdates(t *testing.T) {
	t.Run("valid request", func(t *testing.T) {
		th := setupTestHandlers()
		th.db.On(
			"QueryRow",
			"select get_packages_updates()",
		).Return([]byte("packagesUpdatesDataJSON"), nil)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		th.h.getPackagesUpdates(w, r, nil)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := ioutil.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, buildCacheControlHeader(defaultAPICacheMaxAge), h.Get("Cache-Control"))
		assert.Equal(t, []byte("packagesUpdatesDataJSON"), data)
		th.db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		th := setupTestHandlers()
		th.db.On(
			"QueryRow",
			"select get_packages_updates()",
		).Return(nil, errFakeDatabaseFailure)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		th.h.getPackagesUpdates(w, r, nil)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		th.db.AssertExpectations(t)
	})
}

func TestSearch(t *testing.T) {
	t.Run("invalid requests", func(t *testing.T) {
		th := setupTestHandlers()

		badRequests := []struct {
			desc   string
			params string
		}{
			{"invalid limit", "limit=z"},
			{"invalid offset", "offset=z"},
			{"invalid facets", "facets=z"},
			{"invalid kind", "kind=z"},
			{"invalid kind (one of them)", "kind=0&kind=z"},
			{"invalid repo", "repo="},
		}
		for _, tc := range badRequests {
			tc := tc
			t.Run("bad request: "+tc.desc, func(t *testing.T) {
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("GET", "/?"+tc.params, nil)
				th.h.search(w, r, nil)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
			})
		}
		th.db.AssertExpectations(t)
	})

	t.Run("valid request", func(t *testing.T) {
		th := setupTestHandlers()
		th.db.On(
			"QueryRow",
			"select search_packages($1::jsonb)", mock.Anything,
		).Return([]byte("searchResultsDataJSON"), nil)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		th.h.search(w, r, nil)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := ioutil.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, buildCacheControlHeader(defaultAPICacheMaxAge), h.Get("Cache-Control"))
		assert.Equal(t, []byte("searchResultsDataJSON"), data)
		th.db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		th := setupTestHandlers()
		th.db.On(
			"QueryRow",
			"select search_packages($1::jsonb)", mock.Anything,
		).Return(nil, errFakeDatabaseFailure)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		th.h.search(w, r, nil)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		th.db.AssertExpectations(t)
	})
}

func TestGetPackage(t *testing.T) {
	t.Run("non existing package", func(t *testing.T) {
		th := setupTestHandlers()
		th.db.On(
			"QueryRow",
			"select get_package($1::jsonb)", mock.Anything,
		).Return(nil, pgx.ErrNoRows)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		th.h.getPackage(hub.Chart)(w, r, nil)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusNotFound, resp.StatusCode)
		th.db.AssertExpectations(t)
	})

	t.Run("existing package", func(t *testing.T) {
		th := setupTestHandlers()
		th.db.On(
			"QueryRow",
			"select get_package($1::jsonb)", mock.Anything,
		).Return([]byte("packageDataJSON"), nil)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		th.h.getPackage(hub.Chart)(w, r, nil)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := ioutil.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, buildCacheControlHeader(defaultAPICacheMaxAge), h.Get("Cache-Control"))
		assert.Equal(t, []byte("packageDataJSON"), data)
		th.db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		th := setupTestHandlers()
		th.db.On(
			"QueryRow",
			"select get_package($1::jsonb)", mock.Anything,
		).Return(nil, errFakeDatabaseFailure)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		th.h.getPackage(hub.Chart)(w, r, nil)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		th.db.AssertExpectations(t)
	})
}

func TestRegisterUser(t *testing.T) {
	t.Run("no user provided", func(t *testing.T) {
		th := setupTestHandlers()

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("POST", "/", strings.NewReader(""))
		th.h.registerUser(w, r, nil)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("invalid user provided", func(t *testing.T) {
		testCases := []struct {
			description string
			userJSON    string
		}{
			{
				"invalid json",
				"-",
			},
			{
				"missing alias",
				`{"email": "email", "password": "password"}`,
			},
			{
				"missing email",
				`{"alias": "alias", "password": "password"}`,
			},
			{
				"missing password",
				`{"alias": "alias", "email": "email"}`,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				th := setupTestHandlers()

				w := httptest.NewRecorder()
				r, _ := http.NewRequest("POST", "/", strings.NewReader(tc.userJSON))
				th.h.registerUser(w, r, nil)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
			})
		}
	})

	t.Run("valid user provided", func(t *testing.T) {
		userJSON := `
		{
			"alias": "alias",
			"first_name": "first_name",
			"last_name": "last_name",
			"email": "email",
			"password": "password"
		}
		`
		testCases := []struct {
			description        string
			dbResponse         []interface{}
			expectedStatusCode int
		}{
			{
				"registration succeeded",
				[]interface{}{"", nil},
				http.StatusOK,
			},
			{
				"database error",
				[]interface{}{"", errFakeDatabaseFailure},
				http.StatusInternalServerError,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				th := setupTestHandlers()
				th.db.On(
					"QueryRow",
					"select register_user($1::jsonb)", mock.Anything,
				).Return(tc.dbResponse...)
				th.es.On("SendEmail", mock.Anything).Return(nil)

				w := httptest.NewRecorder()
				r, _ := http.NewRequest("POST", "/", strings.NewReader(userJSON))
				th.h.registerUser(w, r, nil)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				th.db.AssertExpectations(t)
			})
		}
	})
}

func TestVerifyEmail(t *testing.T) {
	t.Run("no code provided", func(t *testing.T) {
		th := setupTestHandlers()

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("POST", "/", nil)
		th.h.verifyEmail(w, r, nil)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("code provided", func(t *testing.T) {
		testCases := []struct {
			description        string
			dbResponse         []interface{}
			expectedStatusCode int
		}{
			{
				"code not verified",
				[]interface{}{false, nil},
				http.StatusGone,
			},
			{
				"code verified",
				[]interface{}{true, nil},
				http.StatusOK,
			},
			{
				"database error",
				[]interface{}{false, errFakeDatabaseFailure},
				http.StatusInternalServerError,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				th := setupTestHandlers()
				th.db.On(
					"QueryRow",
					"select verify_email($1::uuid)", mock.Anything,
				).Return(tc.dbResponse...)

				w := httptest.NewRecorder()
				r, _ := http.NewRequest("POST", "/", strings.NewReader("code=1234"))
				r.Header.Set("Content-Type", "application/x-www-form-urlencoded")
				th.h.verifyEmail(w, r, nil)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				th.db.AssertExpectations(t)
			})
		}
	})
}

func TestImage(t *testing.T) {
	t.Run("non existing image", func(t *testing.T) {
		th := setupTestHandlers()
		th.db.On(
			"QueryRow",
			"select get_image($1::uuid, $2::text)", mock.Anything, mock.Anything,
		).Return(nil, pgx.ErrNoRows)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		th.h.image(w, r, nil)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusNotFound, resp.StatusCode)
		th.db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		th := setupTestHandlers()
		th.db.On(
			"QueryRow",
			"select get_image($1::uuid, $2::text)", mock.Anything, mock.Anything,
		).Return(nil, errFakeDatabaseFailure)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		th.h.image(w, r, nil)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		th.db.AssertExpectations(t)
	})

	t.Run("existing images (png and svg)", func(t *testing.T) {
		testCases := []struct {
			imgPath             string
			expectedContentType string
		}{
			{"testdata/image.png", "image/png"},
			{"testdata/image.svg", "image/svg+xml"},
		}
		for i, tc := range testCases {
			i := i
			tc := tc
			t.Run(fmt.Sprintf("Test %d: %s", i, tc.expectedContentType), func(t *testing.T) {
				imgData, err := ioutil.ReadFile(tc.imgPath)
				require.NoError(t, err)
				th := setupTestHandlers()
				th.db.On(
					"QueryRow",
					"select get_image($1::uuid, $2::text)", mock.Anything, mock.Anything,
				).Return(imgData, nil)

				w := httptest.NewRecorder()
				r, _ := http.NewRequest("GET", "/", nil)
				ps := httprouter.Params{
					httprouter.Param{Key: "image", Value: strconv.Itoa(i)},
				}
				th.h.image(w, r, ps)
				resp := w.Result()
				defer resp.Body.Close()
				h := resp.Header
				data, _ := ioutil.ReadAll(resp.Body)

				assert.Equal(t, http.StatusOK, resp.StatusCode)
				assert.Equal(t, tc.expectedContentType, h.Get("Content-Type"))
				assert.Equal(t, "public, max-age=31536000", h.Get("Cache-Control"))
				assert.Equal(t, imgData, data)
				th.db.AssertExpectations(t)
			})
		}
	})
}

func TestBasicAuth(t *testing.T) {
	th := setupTestHandlers()
	th.cfg.Set("server.basicAuth.enabled", true)
	th.cfg.Set("server.basicAuth.username", "test")
	th.cfg.Set("server.basicAuth.password", "test")

	t.Run("without basic auth credentials", func(t *testing.T) {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		th.h.basicAuth(http.HandlerFunc(th.h.serveIndex)).ServeHTTP(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	})

	t.Run("with basic auth credentials", func(t *testing.T) {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r.SetBasicAuth("test", "test")
		th.h.basicAuth(http.HandlerFunc(th.h.serveIndex)).ServeHTTP(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)
	})
}

type testHandlers struct {
	cfg *viper.Viper
	db  *tests.DBMock
	es  *tests.EmailSenderMock
	h   *handlers
}

func setupTestHandlers() *testHandlers {
	cfg := viper.New()
	cfg.Set("server.webBuildPath", "testdata")
	db := &tests.DBMock{}
	es := &tests.EmailSenderMock{}
	hubAPI := hub.New(db, es)
	imageStore := pg.NewImageStore(db)

	return &testHandlers{
		cfg: cfg,
		db:  db,
		es:  es,
		h:   setupHandlers(cfg, hubAPI, imageStore),
	}
}

func buildCacheControlHeader(cacheMaxAge time.Duration) string {
	return fmt.Sprintf("max-age=%d", int64(cacheMaxAge.Seconds()))
}
