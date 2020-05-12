package subscription

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
	"github.com/artifacthub/hub/internal/subscription"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestMain(m *testing.M) {
	zerolog.SetGlobalLevel(zerolog.Disabled)
	os.Exit(m.Run())
}

func TestAdd(t *testing.T) {
	t.Run("invalid subscription provided", func(t *testing.T) {
		testCases := []struct {
			description      string
			subscriptionJSON string
			smErr            error
		}{
			{
				"no subscription provided",
				"",
				nil,
			},
			{
				"invalid json",
				"-",
				nil,
			},
			{
				"invalid package id",
				`{"package_id": "invalid"}`,
				subscription.ErrInvalidInput,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				hw := newHandlersWrapper()
				if tc.smErr != nil {
					hw.sm.On("Add", mock.Anything, mock.Anything).Return(tc.smErr)
				}

				w := httptest.NewRecorder()
				r, _ := http.NewRequest("POST", "/", strings.NewReader(tc.subscriptionJSON))
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
				hw.h.Add(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
				hw.sm.AssertExpectations(t)
			})
		}
	})

	t.Run("valid subscription provided", func(t *testing.T) {
		subscriptionJSON := `
		{
			"package_id": "00000000-0000-0000-0000-000000000001",
			"event_kind": 0
		}
		`
		testCases := []struct {
			description        string
			err                error
			expectedStatusCode int
		}{
			{
				"add subscription succeeded",
				nil,
				http.StatusOK,
			},
			{
				"error adding subscription",
				tests.ErrFakeDatabaseFailure,
				http.StatusInternalServerError,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				hw := newHandlersWrapper()
				hw.sm.On("Add", mock.Anything, mock.Anything).Return(tc.err)

				w := httptest.NewRecorder()
				r, _ := http.NewRequest("POST", "/", strings.NewReader(subscriptionJSON))
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
				hw.h.Add(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				hw.sm.AssertExpectations(t)
			})
		}
	})
}

func TestDelete(t *testing.T) {
	t.Run("invalid subscription provided", func(t *testing.T) {
		testCases := []struct {
			description      string
			subscriptionJSON string
			smErr            error
		}{
			{
				"no subscription provided",
				"",
				nil,
			},
			{
				"invalid json",
				"-",
				nil,
			},
			{
				"invalid package id",
				`{"package_id": "invalid"}`,
				subscription.ErrInvalidInput,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				hw := newHandlersWrapper()
				if tc.smErr != nil {
					hw.sm.On("Delete", mock.Anything, mock.Anything).Return(tc.smErr)
				}

				w := httptest.NewRecorder()
				r, _ := http.NewRequest("DELETE", "/", strings.NewReader(tc.subscriptionJSON))
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
				hw.h.Delete(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
				hw.sm.AssertExpectations(t)
			})
		}
	})

	t.Run("valid subscription provided", func(t *testing.T) {
		subscriptionJSON := `
		{
			"package_id": "00000000-0000-0000-0000-000000000001",
			"event_kind": 0
		}
		`
		testCases := []struct {
			description        string
			err                error
			expectedStatusCode int
		}{
			{
				"delete subscription succeeded",
				nil,
				http.StatusOK,
			},
			{
				"error deleting subscription",
				tests.ErrFakeDatabaseFailure,
				http.StatusInternalServerError,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				hw := newHandlersWrapper()
				hw.sm.On("Delete", mock.Anything, mock.Anything).Return(tc.err)

				w := httptest.NewRecorder()
				r, _ := http.NewRequest("DELETE", "/", strings.NewReader(subscriptionJSON))
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
				hw.h.Delete(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				hw.sm.AssertExpectations(t)
			})
		}
	})
}

func TestGetByPackage(t *testing.T) {
	t.Run("error getting package subscriptions", func(t *testing.T) {
		testCases := []struct {
			smErr              error
			expectedStatusCode int
		}{
			{
				subscription.ErrInvalidInput,
				http.StatusBadRequest,
			},
			{
				tests.ErrFakeDatabaseFailure,
				http.StatusInternalServerError,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.smErr.Error(), func(t *testing.T) {
				hw := newHandlersWrapper()
				hw.sm.On("GetByPackageJSON", mock.Anything, mock.Anything).Return(nil, tc.smErr)

				w := httptest.NewRecorder()
				r, _ := http.NewRequest("GET", "/", nil)
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
				hw.h.GetByPackage(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				hw.sm.AssertExpectations(t)
			})
		}
	})

	t.Run("get package subscriptions succeeded", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.sm.On("GetByPackageJSON", mock.Anything, mock.Anything).Return([]byte("dataJSON"), nil)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		hw.h.GetByPackage(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := ioutil.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(0), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.sm.AssertExpectations(t)
	})
}

func TestGetByUser(t *testing.T) {
	t.Run("error getting user subscriptions", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.sm.On("GetByUserJSON", mock.Anything).Return(nil, tests.ErrFakeDatabaseFailure)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		hw.h.GetByUser(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.sm.AssertExpectations(t)
	})

	t.Run("get user subscriptions succeeded", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.sm.On("GetByUserJSON", mock.Anything).Return([]byte("dataJSON"), nil)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		hw.h.GetByUser(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := ioutil.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(0), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.sm.AssertExpectations(t)
	})
}

type handlersWrapper struct {
	sm *subscription.ManagerMock
	h  *Handlers
}

func newHandlersWrapper() *handlersWrapper {
	sm := &subscription.ManagerMock{}

	return &handlersWrapper{
		sm: sm,
		h:  NewHandlers(sm),
	}
}
