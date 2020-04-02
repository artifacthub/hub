package pkg

import (
	"context"
	"io/ioutil"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/artifacthub/hub/cmd/hub/handlers/helpers"
	"github.com/artifacthub/hub/internal/api"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/pkg"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestMain(m *testing.M) {
	zerolog.SetGlobalLevel(zerolog.Disabled)
	os.Exit(m.Run())
}

func TestGet(t *testing.T) {
	dbQuery := "select get_package($1::uuid, $2::jsonb)"

	t.Run("non existing package", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.db.On("QueryRow", dbQuery, mock.Anything, mock.Anything).Return(nil, pkg.ErrNotFound)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		hw.h.Get(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusNotFound, resp.StatusCode)
		hw.db.AssertExpectations(t)
	})

	t.Run("existing package", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.db.On("QueryRow", dbQuery, mock.Anything, mock.Anything).Return([]byte("dataJSON"), nil)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		hw.h.Get(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := ioutil.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, tests.BuildCacheControlHeader(0), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.db.On("QueryRow", dbQuery, mock.Anything, mock.Anything).Return(nil, tests.ErrFakeDatabaseFailure)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		hw.h.Get(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.db.AssertExpectations(t)
	})
}

func TestGetStats(t *testing.T) {
	dbQuery := "select get_packages_stats()"

	t.Run("valid request", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.db.On("QueryRow", dbQuery).Return([]byte("dataJSON"), nil)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		hw.h.GetStats(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := ioutil.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, tests.BuildCacheControlHeader(helpers.DefaultAPICacheMaxAge), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.db.On("QueryRow", dbQuery).Return(nil, tests.ErrFakeDatabaseFailure)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		hw.h.GetStats(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.db.AssertExpectations(t)
	})
}

func TestGetUpdates(t *testing.T) {
	dbQuery := "select get_packages_updates()"

	t.Run("valid request", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.db.On("QueryRow", dbQuery).Return([]byte("dataJSON"), nil)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		hw.h.GetUpdates(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := ioutil.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, tests.BuildCacheControlHeader(0), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.db.On("QueryRow", dbQuery).Return(nil, tests.ErrFakeDatabaseFailure)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		hw.h.GetUpdates(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.db.AssertExpectations(t)
	})
}

func TestSearch(t *testing.T) {
	dbQuery := "select search_packages($1::jsonb)"

	t.Run("invalid requests", func(t *testing.T) {
		hw := newHandlersWrapper()

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
				hw.h.Search(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
			})
		}
		hw.db.AssertExpectations(t)
	})

	t.Run("valid request", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.db.On("QueryRow", dbQuery, mock.Anything).Return([]byte("dataJSON"), nil)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		hw.h.Search(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := ioutil.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, tests.BuildCacheControlHeader(0), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.db.On("QueryRow", dbQuery, mock.Anything).Return(nil, tests.ErrFakeDatabaseFailure)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		hw.h.Search(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.db.AssertExpectations(t)
	})
}

func TestToggleStar(t *testing.T) {
	dbQuery := "select toggle_star($1::uuid, $2::uuid)"

	t.Run("valid request", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.db.On("Exec", dbQuery, mock.Anything, mock.Anything).Return(nil)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("PUT", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		hw.h.ToggleStar(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		hw.db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.db.On("Exec", dbQuery, mock.Anything, mock.Anything).Return(tests.ErrFakeDatabaseFailure)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("PUT", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		hw.h.ToggleStar(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.db.AssertExpectations(t)
	})
}

type handlersWrapper struct {
	db *tests.DBMock
	h  *Handlers
}

func newHandlersWrapper() *handlersWrapper {
	db := &tests.DBMock{}
	hubAPI := api.New(db, nil)

	return &handlersWrapper{
		db: db,
		h:  NewHandlers(hubAPI),
	}
}
