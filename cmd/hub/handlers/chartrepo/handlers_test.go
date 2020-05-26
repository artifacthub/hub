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
	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			description string
			repoJSON    string
			rmErr       error
		}{
			{
				"no chart repository provided",
				"",
				nil,
			},
			{
				"invalid json",
				"-",
				nil,
			},
			{
				"missing name",
				`{"url": "https://repo1.url"}`,
				chartrepo.ErrInvalidInput,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("POST", "/", strings.NewReader(tc.repoJSON))
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
				rctx := &chi.Context{
					URLParams: chi.RouteParams{
						Keys:   []string{"orgName"},
						Values: []string{"org1"},
					},
				}
				r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

				hw := newHandlersWrapper()
				if tc.rmErr != nil {
					hw.rm.On("Add", r.Context(), "org1", mock.Anything).Return(tc.rmErr)
				}
				hw.h.Add(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
				hw.rm.AssertExpectations(t)
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
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("POST", "/", strings.NewReader(repoJSON))
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
				rctx := &chi.Context{
					URLParams: chi.RouteParams{
						Keys:   []string{"orgName"},
						Values: []string{"org1"},
					},
				}
				r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

				hw := newHandlersWrapper()
				hw.rm.On("Add", r.Context(), "org1", mock.Anything).Return(tc.err)
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
	t.Run("invalid input", func(t *testing.T) {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("HEAD", "/?v=value", nil)
		rctx := &chi.Context{
			URLParams: chi.RouteParams{
				Keys:   []string{"resourceKind"},
				Values: []string{"invalid"},
			},
		}
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		hw := newHandlersWrapper()
		hw.rm.On("CheckAvailability", r.Context(), "invalid", "value").
			Return(false, chartrepo.ErrInvalidInput)
		hw.h.CheckAvailability(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
		assert.Equal(t, helpers.BuildCacheControlHeader(0), h.Get("Cache-Control"))
		hw.rm.AssertExpectations(t)
	})

	t.Run("valid input", func(t *testing.T) {
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
			}
			for _, tc := range testCases {
				tc := tc
				t.Run(fmt.Sprintf("resource kind: %s", tc.resourceKind), func(t *testing.T) {
					w := httptest.NewRecorder()
					r, _ := http.NewRequest("HEAD", "/?v=value", nil)
					rctx := &chi.Context{
						URLParams: chi.RouteParams{
							Keys:   []string{"resourceKind"},
							Values: []string{tc.resourceKind},
						},
					}
					r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

					hw := newHandlersWrapper()
					hw.rm.On("CheckAvailability", r.Context(), tc.resourceKind, "value").
						Return(tc.available, nil)
					hw.h.CheckAvailability(w, r)
					resp := w.Result()
					defer resp.Body.Close()
					h := resp.Header

					if tc.available {
						assert.Equal(t, http.StatusNotFound, resp.StatusCode)
					} else {
						assert.Equal(t, http.StatusOK, resp.StatusCode)
					}
					assert.Equal(t, helpers.BuildCacheControlHeader(0), h.Get("Cache-Control"))
					hw.rm.AssertExpectations(t)
				})
			}
		})

		t.Run("check availability failed", func(t *testing.T) {
			w := httptest.NewRecorder()
			r, _ := http.NewRequest("HEAD", "/?v=value", nil)
			rctx := &chi.Context{
				URLParams: chi.RouteParams{
					Keys:   []string{"resourceKind"},
					Values: []string{"chartRepositoryName"},
				},
			}
			r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

			hw := newHandlersWrapper()
			hw.rm.On("CheckAvailability", r.Context(), "chartRepositoryName", "value").
				Return(false, tests.ErrFakeDatabaseFailure)
			hw.h.CheckAvailability(w, r)
			resp := w.Result()
			defer resp.Body.Close()

			assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
			hw.rm.AssertExpectations(t)
		})
	})
}

func TestDelete(t *testing.T) {
	rctx := &chi.Context{
		URLParams: chi.RouteParams{
			Keys:   []string{"repoName"},
			Values: []string{"repo1"},
		},
	}

	t.Run("delete chart repository succeeded", func(t *testing.T) {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("DELETE", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		hw := newHandlersWrapper()
		hw.rm.On("Delete", r.Context(), "repo1").Return(nil)
		hw.h.Delete(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		hw.rm.AssertExpectations(t)
	})

	t.Run("error deleting chart repository", func(t *testing.T) {
		testCases := []struct {
			rmErr              error
			expectedStatusCode int
		}{
			{
				chartrepo.ErrInvalidInput,
				http.StatusBadRequest,
			},
			{
				tests.ErrFakeDatabaseFailure,
				http.StatusInternalServerError,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.rmErr.Error(), func(t *testing.T) {
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("DELETE", "/", nil)
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
				r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

				hw := newHandlersWrapper()
				hw.rm.On("Delete", r.Context(), "repo1").Return(tc.rmErr)
				hw.h.Delete(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				hw.rm.AssertExpectations(t)
			})
		}
	})
}

func TestGetOwnedByOrg(t *testing.T) {
	rctx := &chi.Context{
		URLParams: chi.RouteParams{
			Keys:   []string{"orgName"},
			Values: []string{"org1"},
		},
	}

	t.Run("get chart repositories owned by organization succeeded", func(t *testing.T) {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		hw := newHandlersWrapper()
		hw.rm.On("GetOwnedByOrgJSON", r.Context(), "org1").Return([]byte("dataJSON"), nil)
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
		testCases := []struct {
			rmErr              error
			expectedStatusCode int
		}{
			{
				chartrepo.ErrInvalidInput,
				http.StatusBadRequest,
			},
			{
				tests.ErrFakeDatabaseFailure,
				http.StatusInternalServerError,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.rmErr.Error(), func(t *testing.T) {
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("GET", "/", nil)
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
				r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

				hw := newHandlersWrapper()
				hw.rm.On("GetOwnedByOrgJSON", r.Context(), "org1").Return(nil, tc.rmErr)
				hw.h.GetOwnedByOrg(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				hw.rm.AssertExpectations(t)
			})
		}
	})
}

func TestGetOwnedByUser(t *testing.T) {
	t.Run("get chart repositories owned by user succeeded", func(t *testing.T) {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

		hw := newHandlersWrapper()
		hw.rm.On("GetOwnedByUserJSON", r.Context()).Return([]byte("dataJSON"), nil)
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
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

		hw := newHandlersWrapper()
		hw.rm.On("GetOwnedByUserJSON", r.Context()).Return(nil, tests.ErrFakeDatabaseFailure)
		hw.h.GetOwnedByUser(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.rm.AssertExpectations(t)
	})
}

func TestUpdate(t *testing.T) {
	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			description string
			repoJSON    string
			rmErr       error
		}{
			{
				"no chart repository provided",
				"",
				nil,
			},
			{
				"invalid json",
				"-",
				nil,
			},
			{
				"missing name",
				`{"url": "https://repo1.url"}`,
				chartrepo.ErrInvalidInput,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("PUT", "/", strings.NewReader(tc.repoJSON))
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

				hw := newHandlersWrapper()
				if tc.rmErr != nil {
					hw.rm.On("Update", r.Context(), mock.Anything).Return(tc.rmErr)
				}
				hw.h.Update(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
				hw.rm.AssertExpectations(t)
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
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("PUT", "/", strings.NewReader(repoJSON))
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

				hw := newHandlersWrapper()
				hw.rm.On("Update", r.Context(), mock.Anything).Return(tc.err)
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
