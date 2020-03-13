package main

import (
	"context"
	"errors"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/cncf/hub/internal/hub"
	"github.com/cncf/hub/internal/img/pg"
	"github.com/cncf/hub/internal/tests"
	"github.com/go-chi/chi"
	"github.com/jackc/pgx/v4"
	"github.com/rs/zerolog"
	"github.com/spf13/viper"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
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

func TestGetPackagesStats(t *testing.T) {
	dbQuery := "select get_packages_stats()"

	t.Run("valid request", func(t *testing.T) {
		th := setupTestHandlers()
		th.db.On("QueryRow", dbQuery).Return([]byte("packagesStatsDataJSON"), nil)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		th.h.getPackagesStats(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := ioutil.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, buildCacheControlHeader(defaultAPICacheMaxAge), h.Get("Cache-Control"))
		assert.Equal(t, []byte("packagesStatsDataJSON"), data)
		th.db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		th := setupTestHandlers()
		th.db.On("QueryRow", dbQuery).Return(nil, errFakeDatabaseFailure)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		th.h.getPackagesStats(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		th.db.AssertExpectations(t)
	})
}

func TestGetPackagesUpdates(t *testing.T) {
	dbQuery := "select get_packages_updates()"

	t.Run("valid request", func(t *testing.T) {
		th := setupTestHandlers()
		th.db.On("QueryRow", dbQuery).Return([]byte("packagesUpdatesDataJSON"), nil)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		th.h.getPackagesUpdates(w, r)
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
		th.db.On("QueryRow", dbQuery).Return(nil, errFakeDatabaseFailure)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		th.h.getPackagesUpdates(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		th.db.AssertExpectations(t)
	})
}

func TestSearchPackages(t *testing.T) {
	dbQuery := "select search_packages($1::jsonb)"

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
			{"invalid deprecated", "deprecated=z"},
		}
		for _, tc := range badRequests {
			tc := tc
			t.Run("bad request: "+tc.desc, func(t *testing.T) {
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("GET", "/?"+tc.params, nil)
				th.h.searchPackages(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
			})
		}
		th.db.AssertExpectations(t)
	})

	t.Run("valid request", func(t *testing.T) {
		th := setupTestHandlers()
		th.db.On("QueryRow", dbQuery, mock.Anything).Return([]byte("searchResultsDataJSON"), nil)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		th.h.searchPackages(w, r)
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
		th.db.On("QueryRow", dbQuery, mock.Anything).Return(nil, errFakeDatabaseFailure)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		th.h.searchPackages(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		th.db.AssertExpectations(t)
	})
}

func TestGetPackage(t *testing.T) {
	dbQuery := "select get_package($1::jsonb)"

	t.Run("non existing package", func(t *testing.T) {
		th := setupTestHandlers()
		th.db.On("QueryRow", dbQuery, mock.Anything).Return(nil, pgx.ErrNoRows)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		th.h.getPackage(hub.Chart)(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusNotFound, resp.StatusCode)
		th.db.AssertExpectations(t)
	})

	t.Run("existing package", func(t *testing.T) {
		th := setupTestHandlers()
		th.db.On("QueryRow", dbQuery, mock.Anything).Return([]byte("packageDataJSON"), nil)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		th.h.getPackage(hub.Chart)(w, r)
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
		th.db.On("QueryRow", dbQuery, mock.Anything).Return(nil, errFakeDatabaseFailure)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		th.h.getPackage(hub.Chart)(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		th.db.AssertExpectations(t)
	})
}

func TestRegisterUser(t *testing.T) {
	dbQuery := "select register_user($1::jsonb)"

	t.Run("no user provided", func(t *testing.T) {
		th := setupTestHandlers()

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("POST", "/", strings.NewReader(""))
		th.h.registerUser(w, r)
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
				th.h.registerUser(w, r)
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
				th.db.On("QueryRow", dbQuery, mock.Anything).Return(tc.dbResponse...)
				th.es.On("SendEmail", mock.Anything).Return(nil)

				w := httptest.NewRecorder()
				r, _ := http.NewRequest("POST", "/", strings.NewReader(userJSON))
				th.h.registerUser(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				th.db.AssertExpectations(t)
			})
		}
	})
}

func TestVerifyEmail(t *testing.T) {
	dbQuery := "select verify_email($1::uuid)"

	t.Run("no code provided", func(t *testing.T) {
		th := setupTestHandlers()

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("POST", "/", nil)
		th.h.verifyEmail(w, r)
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
				th.db.On("QueryRow", dbQuery, mock.Anything).Return(tc.dbResponse...)

				w := httptest.NewRecorder()
				r, _ := http.NewRequest("POST", "/", strings.NewReader("code=1234"))
				r.Header.Set("Content-Type", "application/x-www-form-urlencoded")
				th.h.verifyEmail(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				th.db.AssertExpectations(t)
			})
		}
	})
}

func TestLogin(t *testing.T) {
	dbQuery1 := `select user_id, password from "user" where email = $1`
	dbQuery2 := `select register_session($1::jsonb)`

	t.Run("credentials not provided", func(t *testing.T) {
		th := setupTestHandlers()

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("POST", "/", nil)
		th.h.login(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("error checking credentials", func(t *testing.T) {
		th := setupTestHandlers()
		th.db.On("QueryRow", dbQuery1, mock.Anything).Return(nil, errFakeDatabaseFailure)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("POST", "/", strings.NewReader("email=email&password=pass"))
		r.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		th.h.login(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		th.db.AssertExpectations(t)
	})

	t.Run("invalid credentials provided", func(t *testing.T) {
		th := setupTestHandlers()
		pw, _ := bcrypt.GenerateFromPassword([]byte("pass"), bcrypt.DefaultCost)
		th.db.On("QueryRow", dbQuery1, mock.Anything).Return([]interface{}{"userID", string(pw)}, nil)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("POST", "/", strings.NewReader("email=email&password=pass2"))
		r.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		th.h.login(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
		th.db.AssertExpectations(t)
	})

	t.Run("error registering session", func(t *testing.T) {
		th := setupTestHandlers()
		pw, _ := bcrypt.GenerateFromPassword([]byte("pass"), bcrypt.DefaultCost)
		th.db.On("QueryRow", dbQuery1, mock.Anything).Return([]interface{}{"userID", string(pw)}, nil)
		th.db.On("QueryRow", dbQuery2, mock.Anything).Return(nil, errFakeDatabaseFailure)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("POST", "/", strings.NewReader("email=email&password=pass"))
		r.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		th.h.login(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		th.db.AssertExpectations(t)
	})

	t.Run("login succeeded", func(t *testing.T) {
		th := setupTestHandlers()
		pw, _ := bcrypt.GenerateFromPassword([]byte("pass"), bcrypt.DefaultCost)
		th.db.On("QueryRow", dbQuery1, mock.Anything).Return([]interface{}{"userID", string(pw)}, nil)
		th.db.On("QueryRow", dbQuery2, mock.Anything).Return([]byte("sessionID"), nil)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("POST", "/", strings.NewReader("email=email&password=pass"))
		r.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		th.h.login(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		require.Len(t, resp.Cookies(), 1)
		cookie := resp.Cookies()[0]
		assert.Equal(t, sessionCookieName, cookie.Name)
		assert.Equal(t, "/", cookie.Path)
		assert.True(t, cookie.HttpOnly)
		assert.False(t, cookie.Secure)
		var sessionID []byte
		err := th.h.sc.Decode(sessionCookieName, cookie.Value, &sessionID)
		require.NoError(t, err)
		assert.Equal(t, []byte("sessionID"), sessionID)
		th.db.AssertExpectations(t)
	})
}

func TestLogout(t *testing.T) {
	dbQuery := "delete from session where session_id = $1"

	t.Run("invalid or no session cookie provided", func(t *testing.T) {
		testCases := []struct {
			description string
			cookie      *http.Cookie
		}{
			{
				"invalid session cookie provided",
				nil,
			},
			{
				"no session cookie provided",
				&http.Cookie{
					Name:  sessionCookieName,
					Value: "invalidValue",
				},
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				th := setupTestHandlers()

				w := httptest.NewRecorder()
				r, _ := http.NewRequest("GET", "/", nil)
				if tc.cookie != nil {
					r.AddCookie(tc.cookie)
				}
				th.h.logout(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, http.StatusOK, resp.StatusCode)
				require.Len(t, resp.Cookies(), 1)
				cookie := resp.Cookies()[0]
				assert.Equal(t, sessionCookieName, cookie.Name)
				assert.True(t, cookie.Expires.Before(time.Now().Add(-24*time.Hour)))
			})
		}
	})

	t.Run("valid session cookie provided", func(t *testing.T) {
		testCases := []struct {
			description string
			dbResponse  interface{}
		}{
			{
				"session deleted successfully from database",
				nil,
			},
			{
				"error deleting session from database",
				errFakeDatabaseFailure,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				th := setupTestHandlers()
				th.db.On("Exec", dbQuery, mock.Anything).Return(tc.dbResponse)

				w := httptest.NewRecorder()
				r, _ := http.NewRequest("GET", "/", nil)
				encodedSessionID, _ := th.h.sc.Encode(sessionCookieName, []byte("sessionID"))
				r.AddCookie(&http.Cookie{
					Name:  sessionCookieName,
					Value: encodedSessionID,
				})
				th.h.logout(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, http.StatusOK, resp.StatusCode)
				require.Len(t, resp.Cookies(), 1)
				cookie := resp.Cookies()[0]
				assert.Equal(t, sessionCookieName, cookie.Name)
				assert.True(t, cookie.Expires.Before(time.Now().Add(-24*time.Hour)))
				th.db.AssertExpectations(t)
			})
		}
	})
}

func TestGetUserAlias(t *testing.T) {
	dbQuery := `select alias from "user" where user_id = $1`

	t.Run("database query succeeded", func(t *testing.T) {
		th := setupTestHandlers()
		th.db.On("QueryRow", dbQuery, mock.Anything).Return("alias", nil)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		th.h.getUserAlias(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := ioutil.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, buildCacheControlHeader(0), h.Get("Cache-Control"))
		assert.Equal(t, []byte(`{"alias": "alias"}`), data)
		th.db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		th := setupTestHandlers()
		th.db.On("QueryRow", dbQuery, mock.Anything).Return("", errFakeDatabaseFailure)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		th.h.getUserAlias(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		th.db.AssertExpectations(t)
	})
}

func TestGetChartRepositories(t *testing.T) {
	dbQuery := "select get_chart_repositories_by_user($1)"

	t.Run("valid request", func(t *testing.T) {
		th := setupTestHandlers()
		th.db.On("QueryRow", dbQuery, mock.Anything).Return([]byte("userChartRepositoriesJSON"), nil)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		th.h.getChartRepositories(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := ioutil.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, buildCacheControlHeader(defaultAPICacheMaxAge), h.Get("Cache-Control"))
		assert.Equal(t, []byte("userChartRepositoriesJSON"), data)
		th.db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		th := setupTestHandlers()
		th.db.On("QueryRow", dbQuery, mock.Anything).Return(nil, errFakeDatabaseFailure)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		th.h.getChartRepositories(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		th.db.AssertExpectations(t)
	})
}

func TestAddChartRepository(t *testing.T) {
	dbQuery := "select add_chart_repository($1::jsonb)"

	t.Run("invalid chart repository provided", func(t *testing.T) {
		testCases := []struct {
			description string
			repoJSON    string
		}{
			{
				"no chart repository provided",
				"",
			},
			{
				"invalid json",
				"-",
			},
			{
				"missing name",
				`{"url": "https://repo1.url"}`,
			},
			{
				"missing url",
				`{"name": "repo1"}`,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				th := setupTestHandlers()

				w := httptest.NewRecorder()
				r, _ := http.NewRequest("POST", "/", strings.NewReader(tc.repoJSON))
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
				th.h.addChartRepository(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
			})
		}
	})

	t.Run("valid chart repository provided", func(t *testing.T) {
		repoJSON := `
		{
			"name": "repo1",
			"display_name": "Repository 1",
			"url": "https://repo1.url"
		}
		`
		testCases := []struct {
			description        string
			dbResponse         interface{}
			expectedStatusCode int
		}{
			{
				"success",
				nil,
				http.StatusOK,
			},
			{
				"database error",
				errFakeDatabaseFailure,
				http.StatusInternalServerError,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				th := setupTestHandlers()
				th.db.On("Exec", dbQuery, mock.Anything).Return(tc.dbResponse)

				w := httptest.NewRecorder()
				r, _ := http.NewRequest("POST", "/", strings.NewReader(repoJSON))
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
				th.h.addChartRepository(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				th.db.AssertExpectations(t)
			})
		}
	})
}

func TestUpdateChartRepository(t *testing.T) {
	dbQuery := "select update_chart_repository($1::jsonb)"

	t.Run("invalid chart repository provided", func(t *testing.T) {
		testCases := []struct {
			description string
			repoJSON    string
		}{
			{
				"no chart repository provided",
				"",
			},
			{
				"invalid json",
				"-",
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				th := setupTestHandlers()

				w := httptest.NewRecorder()
				r, _ := http.NewRequest("PUT", "/", strings.NewReader(tc.repoJSON))
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
				th.h.updateChartRepository(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
			})
		}
	})

	t.Run("valid chart repository provided", func(t *testing.T) {
		repoJSON := `
		{
			"display_name": "Repository 1 updated",
			"url": "https://repo1.url/updated"
		}
		`
		testCases := []struct {
			description        string
			dbResponse         interface{}
			expectedStatusCode int
		}{
			{
				"success",
				nil,
				http.StatusOK,
			},
			{
				"database error",
				errFakeDatabaseFailure,
				http.StatusInternalServerError,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				th := setupTestHandlers()
				th.db.On("Exec", dbQuery, mock.Anything).Return(tc.dbResponse)

				w := httptest.NewRecorder()
				r, _ := http.NewRequest("PUT", "/", strings.NewReader(repoJSON))
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
				th.h.updateChartRepository(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				th.db.AssertExpectations(t)
			})
		}
	})
}

func TestDeleteChartRepository(t *testing.T) {
	dbQuery := "select delete_chart_repository($1::jsonb)"

	t.Run("valid request", func(t *testing.T) {
		th := setupTestHandlers()
		th.db.On("Exec", dbQuery, mock.Anything).Return(nil)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("DELETE", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		th.h.deleteChartRepository(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		th.db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		th := setupTestHandlers()
		th.db.On("Exec", dbQuery, mock.Anything).Return(errFakeDatabaseFailure)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("DELETE", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		th.h.deleteChartRepository(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		th.db.AssertExpectations(t)
	})
}

func TestRequireLogin(t *testing.T) {
	dbQuery := `
	select user_id, floor(extract(epoch from created_at))
	from session where session_id = $1
	`

	t.Run("session cookie not provided", func(t *testing.T) {
		th := setupTestHandlers()

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		th.h.requireLogin(http.HandlerFunc(th.h.serveIndex)).ServeHTTP(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	})

	t.Run("invalid session cookie provided", func(t *testing.T) {
		th := setupTestHandlers()

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r.AddCookie(&http.Cookie{
			Name:  sessionCookieName,
			Value: "invalidValue",
		})
		th.h.requireLogin(http.HandlerFunc(th.h.serveIndex)).ServeHTTP(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	})

	t.Run("error checking session", func(t *testing.T) {
		th := setupTestHandlers()
		th.db.On("QueryRow", dbQuery, mock.Anything).Return(nil, errFakeDatabaseFailure)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		encodedSessionID, _ := th.h.sc.Encode(sessionCookieName, []byte("sessionID"))
		r.AddCookie(&http.Cookie{
			Name:  sessionCookieName,
			Value: encodedSessionID,
		})
		th.h.requireLogin(http.HandlerFunc(th.h.serveIndex)).ServeHTTP(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		th.db.AssertExpectations(t)
	})

	t.Run("invalid session provided", func(t *testing.T) {
		th := setupTestHandlers()
		th.db.On("QueryRow", dbQuery, mock.Anything).Return([]interface{}{"userID", int64(1)}, nil)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		encodedSessionID, _ := th.h.sc.Encode(sessionCookieName, []byte("sessionID"))
		r.AddCookie(&http.Cookie{
			Name:  sessionCookieName,
			Value: encodedSessionID,
		})
		th.h.requireLogin(http.HandlerFunc(th.h.serveIndex)).ServeHTTP(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
		th.db.AssertExpectations(t)
	})

	t.Run("require login succeeded", func(t *testing.T) {
		th := setupTestHandlers()
		th.db.On("QueryRow", dbQuery, mock.Anything).Return([]interface{}{
			"userID",
			time.Now().Unix(),
		}, nil)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		encodedSessionID, _ := th.h.sc.Encode(sessionCookieName, []byte("sessionID"))
		r.AddCookie(&http.Cookie{
			Name:  sessionCookieName,
			Value: encodedSessionID,
		})
		th.h.requireLogin(http.HandlerFunc(th.h.serveIndex)).ServeHTTP(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		th.db.AssertExpectations(t)
	})
}

func TestImage(t *testing.T) {
	dbQuery := "select get_image($1::uuid, $2::text)"

	t.Run("non existing image", func(t *testing.T) {
		th := setupTestHandlers()
		th.db.On("QueryRow", dbQuery, mock.Anything, mock.Anything).Return(nil, pgx.ErrNoRows)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		th.h.image(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusNotFound, resp.StatusCode)
		th.db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		th := setupTestHandlers()
		th.db.On("QueryRow", dbQuery, mock.Anything, mock.Anything).Return(nil, errFakeDatabaseFailure)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		th.h.image(w, r)
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
				th.db.On("QueryRow", dbQuery, mock.Anything, mock.Anything).Return(imgData, nil)

				w := httptest.NewRecorder()
				r, _ := http.NewRequest("GET", "/", nil)
				th.h.image(w, r)
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

func TestCheckAvailability(t *testing.T) {
	t.Run("invalid resource kind", func(t *testing.T) {
		th := setupTestHandlers()

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("HEAD", "/?v=value", nil)
		rctx := &chi.Context{
			URLParams: chi.RouteParams{
				Keys:   []string{"resourceKind"},
				Values: []string{"invalidKind"},
			},
		}
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))
		th.h.checkAvailability(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("invalid value", func(t *testing.T) {
		th := setupTestHandlers()

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("HEAD", "/", nil)
		rctx := &chi.Context{
			URLParams: chi.RouteParams{
				Keys:   []string{"resourceKind"},
				Values: []string{"userAlias"},
			},
		}
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))
		th.h.checkAvailability(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("valid resource kind", func(t *testing.T) {
		t.Run("database query succeeded", func(t *testing.T) {
			testCases := []struct {
				resourceKind string
				dbQuery      string
				available    bool
			}{
				{
					"userAlias",
					`select user_id from "user" where alias = $1`,
					true,
				},
				{
					"chartRepositoryName",
					`select chart_repository_id from chart_repository where name = $1`,
					true,
				},
				{
					"chartRepositoryURL",
					`select chart_repository_id from chart_repository where url = $1`,
					false,
				},
			}
			for _, tc := range testCases {
				tc := tc
				t.Run(fmt.Sprintf("resource kind: %s", tc.resourceKind), func(t *testing.T) {
					tc.dbQuery = fmt.Sprintf("select not exists (%s)", tc.dbQuery)
					th := setupTestHandlers()
					th.db.On("QueryRow", tc.dbQuery, mock.Anything).Return(tc.available, nil)

					w := httptest.NewRecorder()
					r, _ := http.NewRequest("HEAD", "/?v=value", nil)
					rctx := &chi.Context{
						URLParams: chi.RouteParams{
							Keys:   []string{"resourceKind"},
							Values: []string{tc.resourceKind},
						},
					}
					r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))
					th.h.checkAvailability(w, r)
					resp := w.Result()
					defer resp.Body.Close()

					if tc.available {
						assert.Equal(t, http.StatusNotFound, resp.StatusCode)
					} else {
						assert.Equal(t, http.StatusOK, resp.StatusCode)
					}
					th.db.AssertExpectations(t)
				})
			}
		})

		t.Run("database query failed", func(t *testing.T) {
			th := setupTestHandlers()
			dbQuery := `select not exists (select user_id from "user" where alias = $1)`
			th.db.On("QueryRow", dbQuery, mock.Anything).Return(false, errFakeDatabaseFailure)

			w := httptest.NewRecorder()
			r, _ := http.NewRequest("HEAD", "/?v=value", nil)
			rctx := &chi.Context{
				URLParams: chi.RouteParams{
					Keys:   []string{"resourceKind"},
					Values: []string{"userAlias"},
				},
			}
			r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))
			th.h.checkAvailability(w, r)
			resp := w.Result()
			defer resp.Body.Close()

			assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
			th.db.AssertExpectations(t)
		})
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
