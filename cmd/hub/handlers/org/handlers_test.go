package org

import (
	"context"
	"io/ioutil"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/artifacthub/hub/internal/api"
	"github.com/artifacthub/hub/internal/hub"
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
	dbQuery := "select add_organization($1::uuid, $2::jsonb)"

	t.Run("invalid organization provided", func(t *testing.T) {
		testCases := []struct {
			description string
			repoJSON    string
		}{
			{
				"no organization provided",
				"",
			},
			{
				"invalid json",
				"-",
			},
			{
				"missing name",
				`{"display_name": "Display Name"}`,
			},
			{
				"invalid name",
				`{"name": "_org"}`,
			},
			{
				"invalid name",
				`{"name": " org"}`,
			},
			{
				"invalid name",
				`{"name": "ORG"}`,
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

	t.Run("valid organization provided", func(t *testing.T) {
		orgJSON := `
		{
			"name": "org1",
			"display_name": "Organization 1",
			"description": "description"
		}
		`
		testCases := []struct {
			description        string
			dbResponse         interface{}
			expectedStatusCode int
		}{
			{
				"success",
				nil,
				http.StatusOK,
			},
			{
				"database error",
				tests.ErrFakeDatabaseFailure,
				http.StatusInternalServerError,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				hw := newHandlersWrapper()
				hw.db.On("Exec", dbQuery, mock.Anything, mock.Anything).Return(tc.dbResponse)

				w := httptest.NewRecorder()
				r, _ := http.NewRequest("POST", "/", strings.NewReader(orgJSON))
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
				hw.h.Add(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				hw.db.AssertExpectations(t)
			})
		}
	})
}

func TestAddMember(t *testing.T) {
	dbQueryAddMember := `select add_organization_member($1::uuid, $2::text, $3::text)`
	dbQueryGetUserEmail := `select email from "user" where alias = $1`

	t.Run("valid member provided", func(t *testing.T) {
		testCases := []struct {
			description        string
			dbResponse         interface{}
			expectedStatusCode int
		}{
			{
				"success",
				nil,
				http.StatusOK,
			},
			{
				"database error",
				tests.ErrFakeDatabaseFailure,
				http.StatusInternalServerError,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				hw := newHandlersWrapper()
				hw.db.On("Exec", dbQueryAddMember, mock.Anything, mock.Anything, mock.Anything).
					Return(tc.dbResponse)
				if tc.dbResponse == nil {
					hw.db.On("QueryRow", dbQueryGetUserEmail, mock.Anything).Return("email", nil)
					hw.es.On("SendEmail", mock.Anything).Return(nil)
					defer hw.es.AssertExpectations(t)
				}

				w := httptest.NewRecorder()
				r, _ := http.NewRequest("POST", "/", strings.NewReader("member=userAlias"))
				r.Header.Set("Content-Type", "application/x-www-form-urlencoded")
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
				hw.h.AddMember(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				hw.db.AssertExpectations(t)
			})
		}
	})
}

func TestConfirmMembership(t *testing.T) {
	dbQuery := "select confirm_organization_membership($1::uuid, $2::text)"

	t.Run("valid request", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.db.On("Exec", dbQuery, mock.Anything, mock.Anything, mock.Anything).Return(nil)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("PUT", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		hw.h.ConfirmMembership(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		hw.db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.db.On("Exec", dbQuery, mock.Anything, mock.Anything, mock.Anything).
			Return(tests.ErrFakeDatabaseFailure)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("PUT", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		hw.h.ConfirmMembership(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.db.AssertExpectations(t)
	})
}

func TestDeleteMember(t *testing.T) {
	dbQuery := "select delete_organization_member($1::uuid, $2::text, $3::text)"

	t.Run("valid request", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.db.On("Exec", dbQuery, mock.Anything, mock.Anything, mock.Anything).Return(nil)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("DELETE", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		hw.h.DeleteMember(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		hw.db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.db.On("Exec", dbQuery, mock.Anything, mock.Anything, mock.Anything).
			Return(tests.ErrFakeDatabaseFailure)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("DELETE", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		hw.h.DeleteMember(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.db.AssertExpectations(t)
	})
}

func TestGetByUser(t *testing.T) {
	dbQuery := "select get_user_organizations($1::uuid)"

	t.Run("valid request", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.db.On("QueryRow", dbQuery, mock.Anything).Return([]byte("dataJSON"), nil)

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
		assert.Equal(t, tests.BuildCacheControlHeader(0), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.db.On("QueryRow", dbQuery, mock.Anything).Return(nil, tests.ErrFakeDatabaseFailure)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		hw.h.GetByUser(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.db.AssertExpectations(t)
	})
}

func TestGetMembers(t *testing.T) {
	dbQuery := "select get_organization_members($1::uuid, $2::text)"

	t.Run("valid request", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.db.On("QueryRow", dbQuery, mock.Anything, mock.Anything).Return([]byte("dataJSON"), nil)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		hw.h.GetMembers(w, r)
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
		hw.h.GetMembers(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.db.AssertExpectations(t)
	})
}

func TestUpdate(t *testing.T) {
	dbQuery := "select update_organization($1::uuid, $2::jsonb)"

	t.Run("invalid organization provided", func(t *testing.T) {
		testCases := []struct {
			description string
			repoJSON    string
		}{
			{
				"no organization provided",
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

	t.Run("valid organization provided", func(t *testing.T) {
		orgJSON := `
		{
			"name": "org1",
			"display_name": "Organization 1 updated",
			"description": "description updated"
		}
		`
		testCases := []struct {
			description        string
			dbResponse         interface{}
			expectedStatusCode int
		}{
			{
				"success",
				nil,
				http.StatusOK,
			},
			{
				"database error",
				tests.ErrFakeDatabaseFailure,
				http.StatusInternalServerError,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				hw := newHandlersWrapper()
				hw.db.On("Exec", dbQuery, mock.Anything, mock.Anything).Return(tc.dbResponse)

				w := httptest.NewRecorder()
				r, _ := http.NewRequest("PUT", "/", strings.NewReader(orgJSON))
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
				hw.h.Update(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				hw.db.AssertExpectations(t)
			})
		}
	})
}

type handlersWrapper struct {
	db *tests.DBMock
	es *tests.EmailSenderMock
	h  *Handlers
}

func newHandlersWrapper() *handlersWrapper {
	db := &tests.DBMock{}
	es := &tests.EmailSenderMock{}
	hubAPI := api.New(db, es)

	return &handlersWrapper{
		db: db,
		es: es,
		h:  NewHandlers(hubAPI),
	}
}
