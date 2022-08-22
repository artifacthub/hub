package repo

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/artifacthub/hub/internal/handlers/helpers"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/repo"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/go-chi/chi/v5"
	"github.com/rs/zerolog"
	"github.com/spf13/viper"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestMain(m *testing.M) {
	zerolog.SetGlobalLevel(zerolog.Disabled)
	os.Exit(m.Run())
}

func TestAdd(t *testing.T) {
	rctx := &chi.Context{
		URLParams: chi.RouteParams{
			Keys:   []string{"orgName"},
			Values: []string{"org1"},
		},
	}

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			description string
			repoJSON    string
			rmErr       error
		}{
			{
				"no repository provided",
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
				hub.ErrInvalidInput,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				t.Parallel()
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("POST", "/", strings.NewReader(tc.repoJSON))
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
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

	t.Run("valid repository provided", func(t *testing.T) {
		repoJSON := `
		{
			"name": "repo1",
			"display_name": "Repository 1",
			"url": "https://repo1.url"
		}
		`
		repo := &hub.Repository{}
		_ = json.Unmarshal([]byte(repoJSON), &repo)

		testCases := []struct {
			description        string
			err                error
			expectedStatusCode int
		}{
			{
				"add repository succeeded",
				nil,
				http.StatusCreated,
			},
			{
				"error adding repository (insufficient privilege)",
				hub.ErrInsufficientPrivilege,
				http.StatusForbidden,
			},
			{
				"error adding repository (db error)",
				tests.ErrFakeDB,
				http.StatusInternalServerError,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				t.Parallel()
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("POST", "/", strings.NewReader(repoJSON))
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
				r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

				hw := newHandlersWrapper()
				hw.rm.On("Add", r.Context(), "org1", repo).Return(tc.err)
				hw.h.Add(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				hw.rm.AssertExpectations(t)
			})
		}
	})
}

func TestBadge(t *testing.T) {
	t.Run("badge info returned successfully", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		rctx := &chi.Context{
			URLParams: chi.RouteParams{
				Keys:   []string{"repoName"},
				Values: []string{"artifact-hub"},
			},
		}
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		hw := newHandlersWrapper()
		hw.h.Badge(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := io.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(helpers.DefaultAPICacheMaxAge), h.Get("Cache-Control"))
		assert.Equal(t, []byte(`{"color":"2D4857","label":"Artifact Hub","labelColor":"417598","logoSvg":"\u003csvg xmlns=\"http://www.w3.org/2000/svg\" width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#ffffff\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"feather feather-hexagon\"\u003e\u003cpath d=\"M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z\"\u003e\u003c/path\u003e\u003c/svg\u003e","logoWidth":18,"message":"artifact-hub","schemaVersion":1,"style":"flat"}`), data)
		hw.rm.AssertExpectations(t)
	})
}

func TestCheckAvailability(t *testing.T) {
	t.Run("invalid input", func(t *testing.T) {
		t.Parallel()
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
		hw.rm.On("CheckAvailability", r.Context(), "invalid", "value").Return(false, hub.ErrInvalidInput)
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
					"repositoryName",
					true,
				},
				{
					"repositoryURL",
					false,
				},
			}
			for _, tc := range testCases {
				tc := tc
				t.Run(fmt.Sprintf("resource kind: %s", tc.resourceKind), func(t *testing.T) {
					t.Parallel()
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
						assert.Equal(t, http.StatusNoContent, resp.StatusCode)
					}
					assert.Equal(t, helpers.BuildCacheControlHeader(0), h.Get("Cache-Control"))
					hw.rm.AssertExpectations(t)
				})
			}
		})

		t.Run("check availability failed", func(t *testing.T) {
			t.Parallel()
			w := httptest.NewRecorder()
			r, _ := http.NewRequest("HEAD", "/?v=value", nil)
			rctx := &chi.Context{
				URLParams: chi.RouteParams{
					Keys:   []string{"resourceKind"},
					Values: []string{"repositoryName"},
				},
			}
			r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

			hw := newHandlersWrapper()
			hw.rm.On("CheckAvailability", r.Context(), "repositoryName", "value").
				Return(false, tests.ErrFakeDB)
			hw.h.CheckAvailability(w, r)
			resp := w.Result()
			defer resp.Body.Close()

			assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
			hw.rm.AssertExpectations(t)
		})
	})
}

func TestClaimOwnership(t *testing.T) {
	t.Run("invalid input - missing repo name", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("PUT", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

		hw := newHandlersWrapper()
		hw.rm.On("ClaimOwnership", r.Context(), "", "").Return(hub.ErrInvalidInput)
		hw.h.ClaimOwnership(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
		hw.rm.AssertExpectations(t)
	})

	t.Run("valid input", func(t *testing.T) {
		testCases := []struct {
			description        string
			err                error
			expectedStatusCode int
		}{
			{
				"repository ownership claim succeeded",
				nil,
				http.StatusNoContent,
			},
			{
				"error claiming repository ownership (insufficient privilege)",
				hub.ErrInsufficientPrivilege,
				http.StatusForbidden,
			},
			{
				"error claiming repository ownership (db error)",
				tests.ErrFakeDB,
				http.StatusInternalServerError,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				t.Parallel()
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("PUT", "/?org=org1", nil)
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
				rctx := &chi.Context{
					URLParams: chi.RouteParams{
						Keys:   []string{"repoName"},
						Values: []string{"repo1"},
					},
				}
				r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

				hw := newHandlersWrapper()
				hw.rm.On("ClaimOwnership", r.Context(), "repo1", "org1").Return(tc.err)
				hw.h.ClaimOwnership(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				hw.rm.AssertExpectations(t)
			})
		}
	})
}

func TestDelete(t *testing.T) {
	rctx := &chi.Context{
		URLParams: chi.RouteParams{
			Keys:   []string{"repoName"},
			Values: []string{"repo1"},
		},
	}

	t.Run("delete repository succeeded", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("DELETE", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		hw := newHandlersWrapper()
		hw.rm.On("Delete", r.Context(), "repo1").Return(nil)
		hw.h.Delete(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusNoContent, resp.StatusCode)
		hw.rm.AssertExpectations(t)
	})

	t.Run("error deleting repository", func(t *testing.T) {
		testCases := []struct {
			rmErr              error
			expectedStatusCode int
		}{
			{
				hub.ErrInvalidInput,
				http.StatusBadRequest,
			},
			{
				hub.ErrInsufficientPrivilege,
				http.StatusForbidden,
			},
			{
				tests.ErrFakeDB,
				http.StatusInternalServerError,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.rmErr.Error(), func(t *testing.T) {
				t.Parallel()
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

func TestSearch(t *testing.T) {
	t.Run("invalid request params", func(t *testing.T) {
		testCases := []struct {
			desc   string
			params string
		}{
			{"invalid limit", "limit=z"},
			{"invalid limit", "limit=100"},
			{"invalid offset", "offset=z"},
			{"invalid kind", "kind=z"},
			{"invalid kind (one of them)", "kind=0&kind=z"},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(fmt.Sprintf("%s: %s", tc.desc, tc.params), func(t *testing.T) {
				t.Parallel()
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("GET", "/?"+tc.params, nil)

				hw := newHandlersWrapper()
				hw.h.Search(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
			})
		}
	})

	t.Run("invalid search input", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)

		hw := newHandlersWrapper()
		hw.rm.On("SearchJSON", r.Context(), mock.Anything).Return(nil, hub.ErrInvalidInput)
		hw.h.Search(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
		hw.rm.AssertExpectations(t)
	})

	t.Run("valid authenticated request, search succeeded", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		v := url.Values{}
		v.Set("name", "n1")
		v.Add("user", "u1")
		v.Add("user", "u2")
		v.Add("org", "o1")
		v.Add("org", "o2")
		v.Add("kind", "0")
		v.Add("kind", "3")
		v.Set("limit", "10")
		v.Set("offset", "10")
		r, _ := http.NewRequest("GET", "/?"+v.Encode(), nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

		hw := newHandlersWrapper()
		hw.rm.On("SearchJSON", r.Context(), &hub.SearchRepositoryInput{
			Name:               "n1",
			Kinds:              []hub.RepositoryKind{hub.Helm, hub.OLM},
			Orgs:               []string{"o1", "o2"},
			Users:              []string{"u1", "u2"},
			IncludeCredentials: false,
			Limit:              10,
			Offset:             10,
		}).Return(&hub.JSONQueryResult{
			Data:       []byte("dataJSON"),
			TotalCount: 1,
		}, nil)
		hw.h.Search(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := io.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, h.Get(helpers.PaginationTotalCount), "1")
		assert.Equal(t, helpers.BuildCacheControlHeader(0), h.Get("Cache-Control"))
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.rm.AssertExpectations(t)
	})

	t.Run("valid unauthenticated request, search succeeded", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)

		hw := newHandlersWrapper()
		hw.rm.On("SearchJSON", r.Context(), &hub.SearchRepositoryInput{
			Kinds:  []hub.RepositoryKind{},
			Limit:  20,
			Offset: 0,
		}).Return(&hub.JSONQueryResult{
			Data:       []byte("dataJSON"),
			TotalCount: 1,
		}, nil)
		hw.h.Search(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := io.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, h.Get(helpers.PaginationTotalCount), "1")
		assert.Equal(t, helpers.BuildCacheControlHeader(1*time.Hour), h.Get("Cache-Control"))
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.rm.AssertExpectations(t)
	})

	t.Run("error searching repositories", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)

		hw := newHandlersWrapper()
		hw.rm.On("SearchJSON", r.Context(), mock.Anything).Return(nil, tests.ErrFakeDB)
		hw.h.Search(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.rm.AssertExpectations(t)
	})
}

func TestTransfer(t *testing.T) {
	t.Run("invalid input - missing repo name", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("PUT", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

		hw := newHandlersWrapper()
		hw.rm.On("Transfer", r.Context(), "", "", false).Return(hub.ErrInvalidInput)
		hw.h.Transfer(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
		hw.rm.AssertExpectations(t)
	})

	t.Run("valid input", func(t *testing.T) {
		testCases := []struct {
			description        string
			err                error
			expectedStatusCode int
		}{
			{
				"repository transfer succeeded",
				nil,
				http.StatusNoContent,
			},
			{
				"error transferring repository (insufficient privilege)",
				hub.ErrInsufficientPrivilege,
				http.StatusForbidden,
			},
			{
				"error transferring repository (db error)",
				tests.ErrFakeDB,
				http.StatusInternalServerError,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				t.Parallel()
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("PUT", "/?org=org1", nil)
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
				rctx := &chi.Context{
					URLParams: chi.RouteParams{
						Keys:   []string{"repoName"},
						Values: []string{"repo1"},
					},
				}
				r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

				hw := newHandlersWrapper()
				hw.rm.On("Transfer", r.Context(), "repo1", "org1", false).Return(tc.err)
				hw.h.Transfer(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				hw.rm.AssertExpectations(t)
			})
		}
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
				"no repository provided",
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
				hub.ErrInvalidInput,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				t.Parallel()
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

	t.Run("valid repository provided", func(t *testing.T) {
		repoJSON := `
		{
			"display_name": "Repository 1 updated",
			"url": "https://repo1.url/updated"
		}
		`
		repo := &hub.Repository{}
		_ = json.Unmarshal([]byte(repoJSON), &repo)

		testCases := []struct {
			description        string
			err                error
			expectedStatusCode int
		}{
			{
				"repository update succeeded",
				nil,
				http.StatusNoContent,
			},
			{
				"error updating repository (insufficient privilege)",
				hub.ErrInsufficientPrivilege,
				http.StatusForbidden,
			},
			{
				"error updating repository (db error)",
				tests.ErrFakeDB,
				http.StatusInternalServerError,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				t.Parallel()
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("PUT", "/", strings.NewReader(repoJSON))
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

				hw := newHandlersWrapper()
				hw.rm.On("Update", r.Context(), repo).Return(tc.err)
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
	cfg *viper.Viper
	rm  *repo.ManagerMock
	h   *Handlers
}

func newHandlersWrapper() *handlersWrapper {
	cfg := viper.New()
	cfg.Set("theme.colors.primary", "#417598")
	cfg.Set("theme.colors.secondary", "#2D4857")
	cfg.Set("theme.siteName", "Artifact Hub")
	rm := &repo.ManagerMock{}

	return &handlersWrapper{
		cfg: cfg,
		rm:  rm,
		h:   NewHandlers(cfg, rm),
	}
}
