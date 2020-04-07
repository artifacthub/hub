package pkg

import (
	"context"
	"io/ioutil"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/artifacthub/hub/cmd/hub/handlers/helpers"
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
	t.Run("non existing package", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.pm.On("GetJSON", mock.Anything, mock.Anything).Return(nil, pkg.ErrNotFound)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		hw.h.Get(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusNotFound, resp.StatusCode)
		hw.pm.AssertExpectations(t)
	})

	t.Run("get package succeeded", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.pm.On("GetJSON", mock.Anything, mock.Anything).Return([]byte("dataJSON"), nil)

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
		assert.Equal(t, helpers.BuildCacheControlHeader(0), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.pm.AssertExpectations(t)
	})

	t.Run("error getting package", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.pm.On("GetJSON", mock.Anything, mock.Anything).Return(nil, tests.ErrFakeDatabaseFailure)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		hw.h.Get(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.pm.AssertExpectations(t)
	})
}

func TestGetStarredByUser(t *testing.T) {
	t.Run("get packages starred by user succeeded", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.pm.On("GetStarredByUserJSON", mock.Anything).Return([]byte("dataJSON"), nil)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		hw.h.GetStarredByUser(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := ioutil.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(0), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.pm.AssertExpectations(t)
	})

	t.Run("error getting packages starred by user", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.pm.On("GetStarredByUserJSON", mock.Anything).Return(nil, tests.ErrFakeDatabaseFailure)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		hw.h.GetStarredByUser(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.pm.AssertExpectations(t)
	})
}

func TestGetStats(t *testing.T) {
	t.Run("get stats succeeded", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.pm.On("GetStatsJSON", mock.Anything).Return([]byte("dataJSON"), nil)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		hw.h.GetStats(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := ioutil.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(helpers.DefaultAPICacheMaxAge), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.pm.AssertExpectations(t)
	})

	t.Run("error getting stats", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.pm.On("GetStatsJSON", mock.Anything).Return(nil, tests.ErrFakeDatabaseFailure)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		hw.h.GetStats(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.pm.AssertExpectations(t)
	})
}

func TestGetUpdates(t *testing.T) {
	t.Run("get updates succeeded", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.pm.On("GetUpdatesJSON", mock.Anything).Return([]byte("dataJSON"), nil)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		hw.h.GetUpdates(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := ioutil.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(0), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.pm.AssertExpectations(t)
	})

	t.Run("error getting updates", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.pm.On("GetUpdatesJSON", mock.Anything).Return(nil, tests.ErrFakeDatabaseFailure)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		hw.h.GetUpdates(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.pm.AssertExpectations(t)
	})
}

func TestSearch(t *testing.T) {
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
			{"invalid user", "user="},
			{"invalid organization", "org="},
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
	})

	t.Run("valid request, search succeeded", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.pm.On("SearchJSON", mock.Anything, mock.Anything).Return([]byte("dataJSON"), nil)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		hw.h.Search(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := ioutil.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(0), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.pm.AssertExpectations(t)
	})

	t.Run("error searching packages", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.pm.On("SearchJSON", mock.Anything, mock.Anything).Return(nil, tests.ErrFakeDatabaseFailure)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		hw.h.Search(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.pm.AssertExpectations(t)
	})
}

func TestToggleStar(t *testing.T) {
	t.Run("toggle star succeeded", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.pm.On("ToggleStar", mock.Anything, mock.Anything).Return(nil)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("PUT", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		hw.h.ToggleStar(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		hw.pm.AssertExpectations(t)
	})

	t.Run("error toggling star", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.pm.On("ToggleStar", mock.Anything, mock.Anything).Return(tests.ErrFakeDatabaseFailure)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("PUT", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		hw.h.ToggleStar(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.pm.AssertExpectations(t)
	})
}

type handlersWrapper struct {
	pm *pkg.ManagerMock
	h  *Handlers
}

func newHandlersWrapper() *handlersWrapper {
	pm := &pkg.ManagerMock{}

	return &handlersWrapper{
		pm: pm,
		h:  NewHandlers(pm),
	}
}
