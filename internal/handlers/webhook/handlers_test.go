package webhook

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/artifacthub/hub/internal/handlers/helpers"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/notification"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/artifacthub/hub/internal/webhook"
	"github.com/go-chi/chi/v5"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
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
			webhookJSON string
			err         error
		}{
			{
				"no webhook provided",
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
				`{"url": "http://webhook1.url"}`,
				hub.ErrInvalidInput,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				t.Parallel()
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("POST", "/", strings.NewReader(tc.webhookJSON))
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
				r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

				hw := newHandlersWrapper()
				if tc.err != nil {
					hw.wm.On("Add", r.Context(), "org1", mock.Anything).Return(tc.err)
				}
				hw.h.Add(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
				hw.wm.AssertExpectations(t)
			})
		}
	})

	t.Run("valid webhook provided", func(t *testing.T) {
		webhookJSON := `
		{
			"name": "webhook1",
			"url": "http://webhook1.url",
			"event_kinds": [0],
			"packages": [
				{"package_id": "packageID"}
			]
		}
		`
		wh := &hub.Webhook{}
		_ = json.Unmarshal([]byte(webhookJSON), &wh)

		testCases := []struct {
			description        string
			err                error
			expectedStatusCode int
		}{
			{
				"add webhook succeeded",
				nil,
				http.StatusCreated,
			},
			{
				"error adding webhook (insufficient privilege)",
				hub.ErrInsufficientPrivilege,
				http.StatusForbidden,
			},
			{
				"error adding webhook (db error)",
				tests.ErrFakeDB,
				http.StatusInternalServerError,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				t.Parallel()
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("POST", "/", strings.NewReader(webhookJSON))
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
				r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

				hw := newHandlersWrapper()
				hw.wm.On("Add", r.Context(), "org1", wh).Return(tc.err)
				hw.h.Add(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				hw.wm.AssertExpectations(t)
			})
		}
	})
}

func TestDelete(t *testing.T) {
	rctx := &chi.Context{
		URLParams: chi.RouteParams{
			Keys:   []string{"webhookID"},
			Values: []string{"000000001"},
		},
	}

	t.Run("error deleting webhook", func(t *testing.T) {
		testCases := []struct {
			err                error
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
			t.Run(tc.err.Error(), func(t *testing.T) {
				t.Parallel()
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("DELETE", "/", nil)
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
				r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

				hw := newHandlersWrapper()
				hw.wm.On("Delete", r.Context(), "000000001").Return(tc.err)
				hw.h.Delete(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				hw.wm.AssertExpectations(t)
			})
		}
	})

	t.Run("delete webhook succeeded", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("DELETE", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		hw := newHandlersWrapper()
		hw.wm.On("Delete", r.Context(), "000000001").Return(nil)
		hw.h.Delete(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusNoContent, resp.StatusCode)
		hw.wm.AssertExpectations(t)
	})
}

func TestGet(t *testing.T) {
	rctx := &chi.Context{
		URLParams: chi.RouteParams{
			Keys:   []string{"webhookID"},
			Values: []string{"000000001"},
		},
	}

	t.Run("error getting webhook", func(t *testing.T) {
		testCases := []struct {
			err                error
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
			t.Run(tc.err.Error(), func(t *testing.T) {
				t.Parallel()
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("GET", "/", nil)
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
				r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

				hw := newHandlersWrapper()
				hw.wm.On("GetJSON", r.Context(), "000000001").Return(nil, tc.err)
				hw.h.Get(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				hw.wm.AssertExpectations(t)
			})
		}
	})

	t.Run("webhook get succeeded", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		hw := newHandlersWrapper()
		hw.wm.On("GetJSON", r.Context(), "000000001").Return([]byte("dataJSON"), nil)
		hw.h.Get(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := io.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(0), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.wm.AssertExpectations(t)
	})
}

func TestGetOwnedByOrg(t *testing.T) {
	rctx := &chi.Context{
		URLParams: chi.RouteParams{
			Keys:   []string{"orgName"},
			Values: []string{"org1"},
		},
	}

	t.Run("get webhooks owned by organization succeeded", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/?limit=10&offset=1", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		hw := newHandlersWrapper()
		hw.wm.On("GetOwnedByOrgJSON", r.Context(), "org1", &hub.Pagination{
			Limit:  10,
			Offset: 1,
		}).Return(&hub.JSONQueryResult{
			Data:       []byte("dataJSON"),
			TotalCount: 1,
		}, nil)
		hw.h.GetOwnedByOrg(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := io.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, h.Get(helpers.PaginationTotalCount), "1")
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(0), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.wm.AssertExpectations(t)
	})

	t.Run("error getting webhooks owned by organization", func(t *testing.T) {
		testCases := []struct {
			err                error
			expectedStatusCode int
		}{
			{
				hub.ErrInvalidInput,
				http.StatusBadRequest,
			},
			{
				tests.ErrFakeDB,
				http.StatusInternalServerError,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.err.Error(), func(t *testing.T) {
				t.Parallel()
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("GET", "/?limit=10&offset=1", nil)
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
				r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

				hw := newHandlersWrapper()
				hw.wm.On("GetOwnedByOrgJSON", r.Context(), "org1", &hub.Pagination{
					Limit:  10,
					Offset: 1,
				}).Return(nil, tc.err)
				hw.h.GetOwnedByOrg(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				hw.wm.AssertExpectations(t)
			})
		}
	})
}

func TestGetOwnedByUser(t *testing.T) {
	t.Run("error getting webhooks owned by user", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/?limit=10&offset=1", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

		hw := newHandlersWrapper()
		hw.wm.On("GetOwnedByUserJSON", r.Context(), &hub.Pagination{
			Limit:  10,
			Offset: 1,
		}).Return(nil, tests.ErrFakeDB)
		hw.h.GetOwnedByUser(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.wm.AssertExpectations(t)
	})

	t.Run("get webhook owned by user succeeded", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/?limit=10&offset=1", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

		hw := newHandlersWrapper()
		hw.wm.On("GetOwnedByUserJSON", r.Context(), &hub.Pagination{
			Limit:  10,
			Offset: 1,
		}).Return(&hub.JSONQueryResult{
			Data:       []byte("dataJSON"),
			TotalCount: 1,
		}, nil)
		hw.h.GetOwnedByUser(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := io.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, h.Get(helpers.PaginationTotalCount), "1")
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(0), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.wm.AssertExpectations(t)
	})
}

func TestTriggerTest(t *testing.T) {
	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			description string
			webhookJSON string
		}{
			{
				"no webhook provided",
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
				t.Parallel()
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("POST", "/", strings.NewReader(tc.webhookJSON))

				hw := newHandlersWrapper()
				hw.h.TriggerTest(w, r)
				resp := w.Result()
				defer resp.Body.Close()
				data, _ := io.ReadAll(resp.Body)

				assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
				assert.Equal(t, hub.ErrInvalidInput.Error(), getErrorMessage(t, data))
			})
		}
	})

	t.Run("invalid template", func(t *testing.T) {
		testCases := []struct {
			webhookJSON string
			err         string
		}{
			{
				`{
					"name": "webhook1",
					"url": "http://webhook1.url",
					"template": "{{ .."
				}`,
				"error parsing template",
			},
			{
				`{
					"name": "webhook1",
					"url": "http://webhook1.url",
					"template": "{{ .nonExistent }}"
				}`,
				"error executing template",
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.err, func(t *testing.T) {
				t.Parallel()
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("POST", "/", strings.NewReader(tc.webhookJSON))

				hw := newHandlersWrapper()
				hw.h.TriggerTest(w, r)
				resp := w.Result()
				defer resp.Body.Close()
				data, _ := io.ReadAll(resp.Body)

				assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
				assert.True(t, strings.HasPrefix(getErrorMessage(t, data), tc.err))
			})
		}
	})

	t.Run("error calling webhook endpoint", func(t *testing.T) {
		t.Parallel()
		webhookJSON := `
		{
			"name": "webhook1",
			"url": "http://webhook1.url"
		}
		`

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("POST", "/", strings.NewReader(webhookJSON))

		hw := newHandlersWrapper()
		hw.h.TriggerTest(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		data, _ := io.ReadAll(resp.Body)

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
		assert.True(t, strings.HasPrefix(getErrorMessage(t, data), "error doing request:"))
	})

	t.Run("received unexpected status code", func(t *testing.T) {
		t.Parallel()
		ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusNotFound)
		}))
		defer ts.Close()

		wh := &hub.Webhook{URL: ts.URL}
		webhookJSON, _ := json.Marshal(wh)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("POST", "/", bytes.NewReader(webhookJSON))

		hw := newHandlersWrapper()
		hw.h.TriggerTest(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		data, _ := io.ReadAll(resp.Body)

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
		assert.Equal(t, "received unexpected status code: 404", getErrorMessage(t, data))
	})

	t.Run("webhook endpoint call succeeded", func(t *testing.T) {
		testCases := []struct {
			id              string
			contentType     string
			template        string
			secret          string
			expectedPayload []byte
		}{
			{
				"1",
				"",
				"",
				"",
				[]byte(`
{
	"specversion" : "1.0",
	"id" : "00000000-0000-0000-0000-000000000001",
	"source" : "https://baseURL",
	"type" : "io.artifacthub.package.new-release",
	"datacontenttype" : "application/json",
	"data" : {
		"package": {
			"name": "sample-package",
			"version": "1.0.0",
			"url": "https://artifacthub.io/packages/helm/artifacthub/sample-package/1.0.0",
			"changes": ["Cool feature", "Bug fixed"],
			"containsSecurityUpdates": true,
			"prerelease": true,
			"repository": {
				"kind": "helm",
				"name": "repo1",
				"publisher": "org1"
			}
		}
	}
}
`),
			},
			{
				"2",
				"custom/type",
				"Package {{ .Package.Name }} {{ .Package.Version}} updated!",
				"very",
				[]byte("Package sample-package 1.0.0 updated!"),
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.id, func(t *testing.T) {
				t.Parallel()
				ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					contentType := tc.contentType
					if contentType == "" {
						contentType = notification.DefaultPayloadContentType
					}
					assert.Equal(t, "POST", r.Method)
					assert.Equal(t, contentType, r.Header.Get("Content-Type"))
					assert.Equal(t, tc.secret, r.Header.Get("X-ArtifactHub-Secret"))
					payload, _ := io.ReadAll(r.Body)
					assert.Equal(t, tc.expectedPayload, payload)
				}))
				defer ts.Close()

				wh := &hub.Webhook{
					ContentType: tc.contentType,
					Template:    tc.template,
					Secret:      tc.secret,
					URL:         ts.URL,
				}
				webhookJSON, _ := json.Marshal(wh)

				w := httptest.NewRecorder()
				r, _ := http.NewRequest("POST", "/", bytes.NewReader(webhookJSON))

				hw := newHandlersWrapper()
				hw.h.TriggerTest(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, http.StatusNoContent, resp.StatusCode)
			})
		}
	})
}

func TestUpdate(t *testing.T) {
	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			description string
			webhookJSON string
			err         error
		}{
			{
				"no webhook provided",
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
				`{"url": "http://webhook1.url"}`,
				hub.ErrInvalidInput,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				t.Parallel()
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("PUT", "/", strings.NewReader(tc.webhookJSON))
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

				hw := newHandlersWrapper()
				if tc.err != nil {
					hw.wm.On("Update", r.Context(), mock.Anything).Return(tc.err)
				}
				hw.h.Update(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
				hw.wm.AssertExpectations(t)
			})
		}
	})

	t.Run("valid webhook provided", func(t *testing.T) {
		webhookJSON := `
		{
			"webhook_id": "000000001",
			"name": "webhook1",
			"url": "http://webhook1.url",
			"event_kinds": [0],
			"packages": [
				{"package_id": "packageID"}
			]
		}
		`
		wh := &hub.Webhook{}
		_ = json.Unmarshal([]byte(webhookJSON), &wh)

		testCases := []struct {
			description        string
			err                error
			expectedStatusCode int
		}{
			{
				"webhook update succeeded",
				nil,
				http.StatusNoContent,
			},
			{
				"error updating webhook (insufficient privilege)",
				hub.ErrInsufficientPrivilege,
				http.StatusForbidden,
			},
			{
				"error updating webhook (db error)",
				tests.ErrFakeDB,
				http.StatusInternalServerError,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				t.Parallel()
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("PUT", "/", strings.NewReader(webhookJSON))
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
				rctx := &chi.Context{
					URLParams: chi.RouteParams{
						Keys:   []string{"webhookID"},
						Values: []string{"000000001"},
					},
				}
				r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

				hw := newHandlersWrapper()
				hw.wm.On("Update", r.Context(), wh).Return(tc.err)
				hw.h.Update(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				hw.wm.AssertExpectations(t)
			})
		}
	})
}

type handlersWrapper struct {
	wm *webhook.ManagerMock
	h  *Handlers
}

func newHandlersWrapper() *handlersWrapper {
	wm := &webhook.ManagerMock{}

	return &handlersWrapper{
		wm: wm,
		h:  NewHandlers(wm, http.DefaultClient),
	}
}

func getErrorMessage(t *testing.T, data []byte) string {
	var m map[string]interface{}
	err := json.Unmarshal(data, &m)
	require.NoError(t, err)
	return m["message"].(string)
}
