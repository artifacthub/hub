package pkg

import (
	"context"
	"fmt"
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
	t.Run("get package failed", func(t *testing.T) {
		testCases := []struct {
			pmErr              error
			expectedStatusCode int
		}{
			{
				pkg.ErrInvalidInput,
				http.StatusBadRequest,
			},
			{
				pkg.ErrNotFound,
				http.StatusNotFound,
			},
			{
				tests.ErrFakeDatabaseFailure,
				http.StatusInternalServerError,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.pmErr.Error(), func(t *testing.T) {
				hw := newHandlersWrapper()
				hw.pm.On("GetJSON", mock.Anything, mock.Anything).Return(nil, tc.pmErr)

				w := httptest.NewRecorder()
				r, _ := http.NewRequest("GET", "/", nil)
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
				hw.h.Get(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				hw.pm.AssertExpectations(t)
			})
		}
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
		assert.Equal(t, helpers.BuildCacheControlHeader(helpers.DefaultAPICacheMaxAge), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
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

func TestGetStars(t *testing.T) {
	t.Run("get stars failed", func(t *testing.T) {
		testCases := []struct {
			err            error
			expectedStatus int
		}{
			{
				pkg.ErrInvalidInput,
				http.StatusBadRequest,
			},
			{
				tests.ErrFakeDatabaseFailure,
				http.StatusInternalServerError,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.err.Error(), func(t *testing.T) {
				hw := newHandlersWrapper()
				hw.pm.On("GetStarsJSON", mock.Anything, mock.Anything).Return(nil, tc.err)

				w := httptest.NewRecorder()
				r, _ := http.NewRequest("GET", "/", nil)
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
				hw.h.GetStars(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatus, resp.StatusCode)
				hw.pm.AssertExpectations(t)
			})
		}
	})

	t.Run("get stars succeeded", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.pm.On("GetStarsJSON", mock.Anything, mock.Anything).Return([]byte("dataJSON"), nil)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		hw.h.GetStars(w, r)
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
		assert.Equal(t, helpers.BuildCacheControlHeader(helpers.DefaultAPICacheMaxAge), h.Get("Cache-Control"))
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

func TestInjectIndexMeta(t *testing.T) {
	t.Run("get package failed", func(t *testing.T) {
		testCases := []struct {
			pmErr              error
			expectedStatusCode int
		}{
			{
				pkg.ErrInvalidInput,
				http.StatusBadRequest,
			},
			{
				pkg.ErrNotFound,
				http.StatusNotFound,
			},
			{
				tests.ErrFakeDatabaseFailure,
				http.StatusInternalServerError,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.pmErr.Error(), func(t *testing.T) {
				hw := newHandlersWrapper()
				hw.pm.On("GetJSON", mock.Anything, mock.Anything).Return(nil, tc.pmErr)

				w := httptest.NewRecorder()
				r, _ := http.NewRequest("GET", "/", nil)
				hw.h.InjectIndexMeta(http.HandlerFunc(testsOK)).ServeHTTP(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				hw.pm.AssertExpectations(t)
			})
		}
	})

	t.Run("get package succeeded", func(t *testing.T) {
		checkIndexMeta := func(expectedTitle, expectedDescription interface{}) http.HandlerFunc {
			return func(w http.ResponseWriter, r *http.Request) {
				assert.Equal(t, expectedTitle, r.Context().Value(hub.IndexMetaTitleKey).(string))
				assert.Equal(t, expectedDescription, r.Context().Value(hub.IndexMetaDescriptionKey).(string))
			}
		}
		testCases := []struct {
			dataJSON            string
			expectedTitle       string
			expectedDescription string
			expectedStatusCode  int
		}{
			{
				"{invalidJSON",
				"",
				"",
				http.StatusInternalServerError,
			},
			{
				`{
					"normalized_name": "pkg1",
					"version": "1.0.0",
					"description": "description",
					"organization_name": "org1",
					"chart_repository": {
						"name": "repo1"
					}
				}`,
				"pkg1 1.0.0 · org1/repo1",
				"description",
				http.StatusOK,
			},
			{
				`{
					"normalized_name": "pkg1",
					"version": "1.0.0",
					"user_alias": "user1",
					"chart_repository": {
						"name": "repo1"
					}
				}`,
				"pkg1 1.0.0 · user1/repo1",
				"",
				http.StatusOK,
			},
			{
				`{
					"normalized_name": "pkg1",
					"version": "1.0.0",
					"user_alias": "user1"
				}`,
				"pkg1 1.0.0 · user1",
				"",
				http.StatusOK,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.dataJSON, func(t *testing.T) {
				hw := newHandlersWrapper()
				hw.pm.On("GetJSON", mock.Anything, mock.Anything).Return([]byte(tc.dataJSON), nil)

				w := httptest.NewRecorder()
				r, _ := http.NewRequest("GET", "/", nil)
				hw.h.InjectIndexMeta(checkIndexMeta(tc.expectedTitle, tc.expectedDescription)).ServeHTTP(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				hw.pm.AssertExpectations(t)
			})
		}
	})
}

func TestSearch(t *testing.T) {
	t.Run("invalid request params", func(t *testing.T) {
		testCases := []struct {
			desc   string
			params string
		}{
			{"invalid limit", "limit=z"},
			{"invalid offset", "offset=z"},
			{"invalid facets", "facets=z"},
			{"invalid kind", "kind=z"},
			{"invalid kind (one of them)", "kind=0&kind=z"},
			{"invalid deprecated", "deprecated=z"},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(fmt.Sprintf("%s: %s", tc.desc, tc.params), func(t *testing.T) {
				hw := newHandlersWrapper()

				w := httptest.NewRecorder()
				r, _ := http.NewRequest("GET", "/?"+tc.params, nil)
				hw.h.Search(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
			})
		}
	})

	t.Run("invalid search input", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.pm.On("SearchJSON", mock.Anything, mock.Anything).Return(nil, pkg.ErrInvalidInput)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		hw.h.Search(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
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
		assert.Equal(t, helpers.BuildCacheControlHeader(helpers.DefaultAPICacheMaxAge), h.Get("Cache-Control"))
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
	t.Run("error toggling star", func(t *testing.T) {
		testCases := []struct {
			err            error
			expectedStatus int
		}{
			{
				pkg.ErrInvalidInput,
				http.StatusBadRequest,
			},
			{
				tests.ErrFakeDatabaseFailure,
				http.StatusInternalServerError,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.err.Error(), func(t *testing.T) {
				hw := newHandlersWrapper()
				hw.pm.On("ToggleStar", mock.Anything, mock.Anything).Return(tc.err)

				w := httptest.NewRecorder()
				r, _ := http.NewRequest("PUT", "/", nil)
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
				hw.h.ToggleStar(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatus, resp.StatusCode)
				hw.pm.AssertExpectations(t)
			})
		}
	})

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
}

func testsOK(w http.ResponseWriter, r *http.Request) {}

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
