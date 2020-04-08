package chartrepo

import (
	"context"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/artifacthub/hub/cmd/hub/handlers/helpers"
	"github.com/artifacthub/hub/internal/chartrepo"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/go-chi/chi"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestMain(m *testing.M) {
	zerolog.SetGlobalLevel(zerolog.Disabled)
	os.Exit(m.Run())
}

func TestAdd(t *testing.T) {
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
			{
				"invalid name",
				`{"name": "1repo"}`,
			},
			{
				"invalid name",
				`{"name": "repo_underscore"}`,
			},
			{
				"invalid name",
				`{"name": "REPO_UPPERCASE"}`,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				hw := newHandlersWrapper()

				w := httptest.NewRecorder()
				r, _ := http.NewRequest("POST", "/", strings.NewReader(tc.repoJSON))
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
				hw.h.Add(w, r)
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
			err                error
			expectedStatusCode int
		}{
			{
				"add chart repository succeeded",
				nil,
				http.StatusOK,
			},
			{
				"error adding chart repository",
				tests.ErrFakeDatabaseFailure,
				http.StatusInternalServerError,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				hw := newHandlersWrapper()
				hw.rm.On("Add", mock.Anything, mock.Anything, mock.Anything).Return(tc.err)

				w := httptest.NewRecorder()
				r, _ := http.NewRequest("POST", "/", strings.NewReader(repoJSON))
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
				hw.h.Add(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				hw.rm.AssertExpectations(t)
			})
		}
	})
}

func TestCheckAvailability(t *testing.T) {
	t.Run("invalid resource kind", func(t *testing.T) {
		hw := newHandlersWrapper()

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("HEAD", "/?v=value", nil)
		rctx := &chi.Context{
			URLParams: chi.RouteParams{
				Keys:   []string{"resourceKind"},
				Values: []string{"invalidKind"},
			},
		}
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))
		hw.h.CheckAvailability(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("invalid value", func(t *testing.T) {
		hw := newHandlersWrapper()

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("HEAD", "/", nil)
		rctx := &chi.Context{
			URLParams: chi.RouteParams{
				Keys:   []string{"resourceKind"},
				Values: []string{"userAlias"},
			},
		}
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))
		hw.h.CheckAvailability(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("valid resource kind", func(t *testing.T) {
		t.Run("check availability succeeded", func(t *testing.T) {
			testCases := []struct {
				resourceKind string
				available    bool
			}{
				{
					"chartRepositoryName",
					true,
				},
				{
					"chartRepositoryURL",
					false,
				},
				{
					"userAlias",
					true,
				},
			}
			for _, tc := range testCases {
				tc := tc
				t.Run(fmt.Sprintf("resource kind: %s", tc.resourceKind), func(t *testing.T) {
					hw := newHandlersWrapper()
					hw.rm.On("CheckAvailability", mock.Anything, mock.Anything, mock.Anything).
						Return(tc.available, nil)

					w := httptest.NewRecorder()
					r, _ := http.NewRequest("HEAD", "/?v=value", nil)
					rctx := &chi.Context{
						URLParams: chi.RouteParams{
							Keys:   []string{"resourceKind"},
							Values: []string{tc.resourceKind},
						},
					}
					r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))
					hw.h.CheckAvailability(w, r)
					resp := w.Result()
					defer resp.Body.Close()

					if tc.available {
						assert.Equal(t, http.StatusNotFound, resp.StatusCode)
					} else {
						assert.Equal(t, http.StatusOK, resp.StatusCode)
					}
					hw.rm.AssertExpectations(t)
				})
			}
		})

		t.Run("check availability failed", func(t *testing.T) {
			hw := newHandlersWrapper()
			hw.rm.On("CheckAvailability", mock.Anything, mock.Anything, mock.Anything).
				Return(false, tests.ErrFakeDatabaseFailure)

			w := httptest.NewRecorder()
			r, _ := http.NewRequest("HEAD", "/?v=value", nil)
			rctx := &chi.Context{
				URLParams: chi.RouteParams{
					Keys:   []string{"resourceKind"},
					Values: []string{"userAlias"},
				},
			}
			r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))
			hw.h.CheckAvailability(w, r)
			resp := w.Result()
			defer resp.Body.Close()

			assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
			hw.rm.AssertExpectations(t)
		})
	})
}

func TestDelete(t *testing.T) {
	t.Run("delete chart repository succeeded", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.rm.On("Delete", mock.Anything, mock.Anything).Return(nil)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("DELETE", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		hw.h.Delete(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		hw.rm.AssertExpectations(t)
	})

	t.Run("error deleting chart repository", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.rm.On("Delete", mock.Anything, mock.Anything).Return(tests.ErrFakeDatabaseFailure)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("DELETE", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		hw.h.Delete(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.rm.AssertExpectations(t)
	})
}

func TestGetOwnedByOrg(t *testing.T) {
	t.Run("get chart repositories owned by organization succeeded", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.rm.On("GetOwnedByOrgJSON", mock.Anything, mock.Anything).Return([]byte("dataJSON"), nil)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		hw.h.GetOwnedByOrg(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := ioutil.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(0), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.rm.AssertExpectations(t)
	})

	t.Run("error getting chart repositories owned by organization", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.rm.On("GetOwnedByOrgJSON", mock.Anything, mock.Anything).Return(nil, tests.ErrFakeDatabaseFailure)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		hw.h.GetOwnedByOrg(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.rm.AssertExpectations(t)
	})
}

func TestGetOwnedByUser(t *testing.T) {
	t.Run("get chart repositories owned by user succeeded", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.rm.On("GetOwnedByUserJSON", mock.Anything).Return([]byte("dataJSON"), nil)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		hw.h.GetOwnedByUser(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := ioutil.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(0), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.rm.AssertExpectations(t)
	})

	t.Run("error getting chart repositories owned by user", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.rm.On("GetOwnedByUserJSON", mock.Anything).Return(nil, tests.ErrFakeDatabaseFailure)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		hw.h.GetOwnedByUser(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.rm.AssertExpectations(t)
	})
}

func TestUpdate(t *testing.T) {
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
				hw := newHandlersWrapper()

				w := httptest.NewRecorder()
				r, _ := http.NewRequest("PUT", "/", strings.NewReader(tc.repoJSON))
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
				hw.h.Update(w, r)
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
			err                error
			expectedStatusCode int
		}{
			{
				"chart repository update succeeded",
				nil,
				http.StatusOK,
			},
			{
				"error updating chart repository",
				tests.ErrFakeDatabaseFailure,
				http.StatusInternalServerError,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				hw := newHandlersWrapper()
				hw.rm.On("Update", mock.Anything, mock.Anything).Return(tc.err)

				w := httptest.NewRecorder()
				r, _ := http.NewRequest("PUT", "/", strings.NewReader(repoJSON))
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
				hw.h.Update(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				hw.rm.AssertExpectations(t)
			})
		}
	})
}

type handlersWrapper struct {
	rm *chartrepo.ManagerMock
	h  *Handlers
}

func newHandlersWrapper() *handlersWrapper {
	rm := &chartrepo.ManagerMock{}

	return &handlersWrapper{
		rm: rm,
		h:  NewHandlers(rm),
	}
}
