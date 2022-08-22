package subscription

import (
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
	"github.com/artifacthub/hub/internal/subscription"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/go-chi/chi/v5"
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
				hub.ErrInvalidInput,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				t.Parallel()
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("POST", "/", strings.NewReader(tc.subscriptionJSON))
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

				hw := newHandlersWrapper()
				if tc.smErr != nil {
					hw.sm.On("Add", r.Context(), mock.Anything).Return(tc.smErr)
				}
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
		s := &hub.Subscription{}
		_ = json.Unmarshal([]byte(subscriptionJSON), &s)

		testCases := []struct {
			description        string
			err                error
			expectedStatusCode int
		}{
			{
				"add subscription succeeded",
				nil,
				http.StatusCreated,
			},
			{
				"error adding subscription",
				tests.ErrFakeDB,
				http.StatusInternalServerError,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				t.Parallel()
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("POST", "/", strings.NewReader(subscriptionJSON))
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

				hw := newHandlersWrapper()
				hw.sm.On("Add", r.Context(), s).Return(tc.err)
				hw.h.Add(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				hw.sm.AssertExpectations(t)
			})
		}
	})
}

func TestAddOptOut(t *testing.T) {
	t.Run("invalid opt-out entry provided", func(t *testing.T) {
		testCases := []struct {
			description string
			optOutJSON  string
			smErr       error
		}{
			{
				"no opt-out provided",
				"",
				nil,
			},
			{
				"invalid json",
				"-",
				nil,
			},
			{
				"invalid repository id",
				`{"repository_id": "invalid"}`,
				hub.ErrInvalidInput,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				t.Parallel()
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("POST", "/", strings.NewReader(tc.optOutJSON))
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

				hw := newHandlersWrapper()
				if tc.smErr != nil {
					hw.sm.On("AddOptOut", r.Context(), mock.Anything).Return(tc.smErr)
				}
				hw.h.AddOptOut(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
				hw.sm.AssertExpectations(t)
			})
		}
	})

	t.Run("valid opt-out entry provided", func(t *testing.T) {
		optOutJSON := `
		{
			"repository_id": "00000000-0000-0000-0000-000000000001",
			"event_kind": 2
		}
		`
		o := &hub.OptOut{}
		_ = json.Unmarshal([]byte(optOutJSON), &o)

		testCases := []struct {
			description        string
			err                error
			expectedStatusCode int
		}{
			{
				"add opt-out succeeded",
				nil,
				http.StatusCreated,
			},
			{
				"error adding opt-out",
				tests.ErrFakeDB,
				http.StatusInternalServerError,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				t.Parallel()
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("POST", "/", strings.NewReader(optOutJSON))
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

				hw := newHandlersWrapper()
				hw.sm.On("AddOptOut", r.Context(), o).Return(tc.err)
				hw.h.AddOptOut(w, r)
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
			desc     string
			qsParams string
			smErr    error
		}{
			{
				"no qs params provided, invalid event kind",
				"",
				nil,
			},
			{
				"invalid event kind",
				"event_kind=invalid",
				nil,
			},
			{
				"invalid event kind (none provided)",
				"package_id=00000000-0000-0000-0000-000000000001",
				nil,
			},
			{
				"invalid package id",
				"package_id=invalid&event_kind=0",
				hub.ErrInvalidInput,
			},
			{
				"invalid event kind (no new release)",
				"package_id=00000000-0000-0000-0000-000000000001&event_kind=1",
				hub.ErrInvalidInput,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.desc, func(t *testing.T) {
				t.Parallel()
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("DELETE", "/?"+tc.qsParams, nil)
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

				hw := newHandlersWrapper()
				if tc.smErr != nil {
					hw.sm.On("Delete", r.Context(), mock.Anything).Return(tc.smErr)
				}
				hw.h.Delete(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
				hw.sm.AssertExpectations(t)
			})
		}
	})

	t.Run("valid subscription provided", func(t *testing.T) {
		s := &hub.Subscription{
			PackageID: "00000000-0000-0000-0000-000000000001",
			EventKind: hub.NewRelease,
		}
		qs := "package_id=00000000-0000-0000-0000-000000000001&event_kind=0"

		testCases := []struct {
			description        string
			err                error
			expectedStatusCode int
		}{
			{
				"delete subscription succeeded",
				nil,
				http.StatusNoContent,
			},
			{
				"error deleting subscription",
				tests.ErrFakeDB,
				http.StatusInternalServerError,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				t.Parallel()
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("DELETE", "/?"+qs, nil)
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

				hw := newHandlersWrapper()
				hw.sm.On("Delete", r.Context(), s).Return(tc.err)
				hw.h.Delete(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				hw.sm.AssertExpectations(t)
			})
		}
	})
}

func TestDeleteOptOut(t *testing.T) {
	optOutID := "00000000-0000-0000-0000-000000000001"
	rctx := &chi.Context{
		URLParams: chi.RouteParams{
			Keys:   []string{"optOutID"},
			Values: []string{optOutID},
		},
	}

	testCases := []struct {
		description        string
		err                error
		expectedStatusCode int
	}{
		{
			"delete opt-out entry succeeded",
			nil,
			http.StatusNoContent,
		},
		{
			"error deleting opt-out entry",
			tests.ErrFakeDB,
			http.StatusInternalServerError,
		},
	}
	for _, tc := range testCases {
		tc := tc
		t.Run(tc.description, func(t *testing.T) {
			t.Parallel()
			w := httptest.NewRecorder()
			r, _ := http.NewRequest("DELETE", "/", nil)
			r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
			r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

			hw := newHandlersWrapper()
			hw.sm.On("DeleteOptOut", r.Context(), optOutID).Return(tc.err)
			hw.h.DeleteOptOut(w, r)
			resp := w.Result()
			defer resp.Body.Close()

			assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
			hw.sm.AssertExpectations(t)
		})
	}
}

func TestGetByPackage(t *testing.T) {
	rctx := &chi.Context{
		URLParams: chi.RouteParams{
			Keys:   []string{"packageID"},
			Values: []string{"packageID"},
		},
	}

	t.Run("error getting package subscriptions", func(t *testing.T) {
		testCases := []struct {
			smErr              error
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
			t.Run(tc.smErr.Error(), func(t *testing.T) {
				t.Parallel()
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("GET", "/", nil)
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
				r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

				hw := newHandlersWrapper()
				hw.sm.On("GetByPackageJSON", r.Context(), "packageID").Return(nil, tc.smErr)
				hw.h.GetByPackage(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				hw.sm.AssertExpectations(t)
			})
		}
	})

	t.Run("get package subscriptions succeeded", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		hw := newHandlersWrapper()
		hw.sm.On("GetByPackageJSON", r.Context(), "packageID").Return([]byte("dataJSON"), nil)
		hw.h.GetByPackage(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := io.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(0), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.sm.AssertExpectations(t)
	})
}

func TestGetByUser(t *testing.T) {
	t.Run("error getting user subscriptions", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/?limit=10&offset=1", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

		hw := newHandlersWrapper()
		hw.sm.On("GetByUserJSON", r.Context(), &hub.Pagination{
			Limit:  10,
			Offset: 1,
		}).Return(nil, tests.ErrFakeDB)
		hw.h.GetByUser(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.sm.AssertExpectations(t)
	})

	t.Run("get user subscriptions succeeded", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/?limit=10&offset=1", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

		hw := newHandlersWrapper()
		hw.sm.On("GetByUserJSON", r.Context(), &hub.Pagination{
			Limit:  10,
			Offset: 1,
		}).Return(&hub.JSONQueryResult{
			Data:       []byte("dataJSON"),
			TotalCount: 1,
		}, nil)
		hw.h.GetByUser(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := io.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, h.Get(helpers.PaginationTotalCount), "1")
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(0), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.sm.AssertExpectations(t)
	})
}

func TestGetOptOutList(t *testing.T) {
	t.Run("error getting user opt-out entries", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/?limit=10&offset=1", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

		hw := newHandlersWrapper()
		hw.sm.On("GetOptOutListJSON", r.Context(), &hub.Pagination{
			Limit:  10,
			Offset: 1,
		}).Return(nil, tests.ErrFakeDB)
		hw.h.GetOptOutList(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.sm.AssertExpectations(t)
	})

	t.Run("get user opt-out entries succeeded", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/?limit=10&offset=1", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

		hw := newHandlersWrapper()
		hw.sm.On("GetOptOutListJSON", r.Context(), &hub.Pagination{
			Limit:  10,
			Offset: 1,
		}).Return(&hub.JSONQueryResult{
			Data:       []byte("dataJSON"),
			TotalCount: 1,
		}, nil)
		hw.h.GetOptOutList(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := io.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, h.Get(helpers.PaginationTotalCount), "1")
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
