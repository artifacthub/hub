package webhook

import (
	"context"
	"io/ioutil"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/artifacthub/hub/cmd/hub/handlers/helpers"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/artifacthub/hub/internal/webhook"
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
				webhook.ErrInvalidInput,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("POST", "/", strings.NewReader(tc.webhookJSON))
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
				rctx := &chi.Context{
					URLParams: chi.RouteParams{
						Keys:   []string{"orgName"},
						Values: []string{"org1"},
					},
				}
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
		testCases := []struct {
			description        string
			err                error
			expectedStatusCode int
		}{
			{
				"add webhook succeeded",
				nil,
				http.StatusOK,
			},
			{
				"error adding webhook",
				tests.ErrFakeDatabaseFailure,
				http.StatusInternalServerError,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("POST", "/", strings.NewReader(webhookJSON))
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
				rctx := &chi.Context{
					URLParams: chi.RouteParams{
						Keys:   []string{"orgName"},
						Values: []string{"org1"},
					},
				}
				r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

				hw := newHandlersWrapper()
				hw.wm.On("Add", r.Context(), "org1", mock.Anything).Return(tc.err)
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
				webhook.ErrInvalidInput,
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
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("DELETE", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		hw := newHandlersWrapper()
		hw.wm.On("Delete", r.Context(), "000000001").Return(nil)
		hw.h.Delete(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)
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
				webhook.ErrInvalidInput,
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
		data, _ := ioutil.ReadAll(resp.Body)

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
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		hw := newHandlersWrapper()
		hw.wm.On("GetOwnedByOrgJSON", r.Context(), "org1").Return([]byte("dataJSON"), nil)
		hw.h.GetOwnedByOrg(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := ioutil.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
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
				webhook.ErrInvalidInput,
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
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("GET", "/", nil)
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
				r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

				hw := newHandlersWrapper()
				hw.wm.On("GetOwnedByOrgJSON", r.Context(), "org1").Return(nil, tc.err)
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
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

		hw := newHandlersWrapper()
		hw.wm.On("GetOwnedByUserJSON", r.Context()).Return(nil, tests.ErrFakeDatabaseFailure)
		hw.h.GetOwnedByUser(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.wm.AssertExpectations(t)
	})

	t.Run("get webhook owned by user succeeded", func(t *testing.T) {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

		hw := newHandlersWrapper()
		hw.wm.On("GetOwnedByUserJSON", r.Context()).Return([]byte("dataJSON"), nil)
		hw.h.GetOwnedByUser(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := ioutil.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(0), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.wm.AssertExpectations(t)
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
				webhook.ErrInvalidInput,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
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
		testCases := []struct {
			description        string
			err                error
			expectedStatusCode int
		}{
			{
				"webhook update succeeded",
				nil,
				http.StatusOK,
			},
			{
				"error updating webhook",
				tests.ErrFakeDatabaseFailure,
				http.StatusInternalServerError,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("PUT", "/", strings.NewReader(webhookJSON))
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

				hw := newHandlersWrapper()
				hw.wm.On("Update", r.Context(), mock.Anything).Return(tc.err)
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
		h:  NewHandlers(wm),
	}
}
