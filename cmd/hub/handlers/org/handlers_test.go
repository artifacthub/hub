package org

import (
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/artifacthub/hub/cmd/hub/handlers/helpers"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/org"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/go-chi/chi"
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
	t.Run("invalid organization provided", func(t *testing.T) {
		testCases := []struct {
			description string
			orgJSON     string
			omErr       error
		}{
			{
				"no organization provided",
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
				`{"display_name": "Display Name"}`,
				org.ErrInvalidInput,
			},
			{
				"invalid name",
				`{"name": "_org"}`,
				org.ErrInvalidInput,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("POST", "/", strings.NewReader(tc.orgJSON))
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

				hw := newHandlersWrapper()
				if tc.omErr != nil {
					hw.om.On("Add", r.Context(), mock.Anything).Return(tc.omErr)
				}
				hw.h.Add(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
				hw.om.AssertExpectations(t)
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
		o := &hub.Organization{}
		_ = json.Unmarshal([]byte(orgJSON), &o)

		testCases := []struct {
			description        string
			err                error
			expectedStatusCode int
		}{
			{
				"add organization succeeded",
				nil,
				http.StatusOK,
			},
			{
				"error adding organization",
				tests.ErrFakeDatabaseFailure,
				http.StatusInternalServerError,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("POST", "/", strings.NewReader(orgJSON))
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

				hw := newHandlersWrapper()
				hw.om.On("Add", r.Context(), o).Return(tc.err)
				hw.h.Add(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				hw.om.AssertExpectations(t)
			})
		}
	})
}

func TestAddMember(t *testing.T) {
	testCases := []struct {
		omErr              error
		expectedStatusCode int
	}{
		{
			nil,
			http.StatusOK,
		},
		{
			org.ErrInvalidInput,
			http.StatusBadRequest,
		},
		{
			tests.ErrFakeDatabaseFailure,
			http.StatusInternalServerError,
		},
	}
	for _, tc := range testCases {
		tc := tc
		var desc string
		if tc.omErr != nil {
			desc = tc.omErr.Error()
		}
		t.Run(desc, func(t *testing.T) {
			w := httptest.NewRecorder()
			r, _ := http.NewRequest("POST", "/", nil)
			r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
			rctx := &chi.Context{
				URLParams: chi.RouteParams{
					Keys:   []string{"orgName", "userAlias"},
					Values: []string{"org1", "userAlias"},
				},
			}
			r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

			hw := newHandlersWrapper()
			hw.om.On("AddMember", r.Context(), "org1", "userAlias", "baseURL").Return(tc.omErr)
			hw.h.AddMember(w, r)
			resp := w.Result()
			defer resp.Body.Close()

			assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
			hw.om.AssertExpectations(t)
		})
	}
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
		hw.om.On("CheckAvailability", r.Context(), "invalid", "value").
			Return(false, org.ErrInvalidInput)
		hw.h.CheckAvailability(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
		assert.Equal(t, helpers.BuildCacheControlHeader(0), h.Get("Cache-Control"))
		hw.om.AssertExpectations(t)
	})

	t.Run("valid input", func(t *testing.T) {
		t.Run("check availability succeeded", func(t *testing.T) {
			testCases := []struct {
				resourceKind string
				available    bool
			}{
				{
					"organizationName",
					true,
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
					hw.om.On("CheckAvailability", r.Context(), tc.resourceKind, "value").
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
					hw.om.AssertExpectations(t)
				})
			}
		})

		t.Run("check availability failed", func(t *testing.T) {
			w := httptest.NewRecorder()
			r, _ := http.NewRequest("HEAD", "/?v=value", nil)
			rctx := &chi.Context{
				URLParams: chi.RouteParams{
					Keys:   []string{"resourceKind"},
					Values: []string{"organizationName"},
				},
			}
			r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

			hw := newHandlersWrapper()
			hw.om.On("CheckAvailability", r.Context(), "organizationName", "value").
				Return(false, tests.ErrFakeDatabaseFailure)
			hw.h.CheckAvailability(w, r)
			resp := w.Result()
			defer resp.Body.Close()

			assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
			hw.om.AssertExpectations(t)
		})
	})
}

func TestConfirmMembership(t *testing.T) {
	testCases := []struct {
		omErr              error
		expectedStatusCode int
	}{
		{
			nil,
			http.StatusOK,
		},
		{
			org.ErrInvalidInput,
			http.StatusBadRequest,
		},
		{
			tests.ErrFakeDatabaseFailure,
			http.StatusInternalServerError,
		},
	}
	for _, tc := range testCases {
		tc := tc
		var desc string
		if tc.omErr != nil {
			desc = tc.omErr.Error()
		}
		t.Run(desc, func(t *testing.T) {
			w := httptest.NewRecorder()
			r, _ := http.NewRequest("PUT", "/", nil)
			r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
			rctx := &chi.Context{
				URLParams: chi.RouteParams{
					Keys:   []string{"orgName"},
					Values: []string{"org1"},
				},
			}
			r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

			hw := newHandlersWrapper()
			hw.om.On("ConfirmMembership", r.Context(), "org1").Return(tc.omErr)
			hw.h.ConfirmMembership(w, r)
			resp := w.Result()
			defer resp.Body.Close()

			assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
			hw.om.AssertExpectations(t)
		})
	}
}

func TestDeleteMember(t *testing.T) {
	testCases := []struct {
		omErr              error
		expectedStatusCode int
	}{
		{
			nil,
			http.StatusOK,
		},
		{
			org.ErrInvalidInput,
			http.StatusBadRequest,
		},
		{
			tests.ErrFakeDatabaseFailure,
			http.StatusInternalServerError,
		},
	}
	for _, tc := range testCases {
		tc := tc
		var desc string
		if tc.omErr != nil {
			desc = tc.omErr.Error()
		}
		t.Run(desc, func(t *testing.T) {
			w := httptest.NewRecorder()
			r, _ := http.NewRequest("DELETE", "/", nil)
			r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
			rctx := &chi.Context{
				URLParams: chi.RouteParams{
					Keys:   []string{"orgName", "userAlias"},
					Values: []string{"org1", "userAlias"},
				},
			}
			r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

			hw := newHandlersWrapper()
			hw.om.On("DeleteMember", r.Context(), "org1", "userAlias").Return(tc.omErr)
			hw.h.DeleteMember(w, r)
			resp := w.Result()
			defer resp.Body.Close()

			assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
			hw.om.AssertExpectations(t)
		})
	}
}

func TestGet(t *testing.T) {
	rctx := &chi.Context{
		URLParams: chi.RouteParams{
			Keys:   []string{"orgName"},
			Values: []string{"org1"},
		},
	}

	t.Run("error getting organization", func(t *testing.T) {
		testCases := []struct {
			omErr              error
			expectedStatusCode int
		}{
			{
				org.ErrInvalidInput,
				http.StatusBadRequest,
			},
			{
				tests.ErrFakeDatabaseFailure,
				http.StatusInternalServerError,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.omErr.Error(), func(t *testing.T) {
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("GET", "/", nil)
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
				r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

				hw := newHandlersWrapper()
				hw.om.On("GetJSON", r.Context(), "org1").Return(nil, tc.omErr)
				hw.h.Get(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				hw.om.AssertExpectations(t)
			})
		}
	})

	t.Run("get organization succeeded", func(t *testing.T) {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		hw := newHandlersWrapper()
		hw.om.On("GetJSON", r.Context(), "org1").Return([]byte("dataJSON"), nil)
		hw.h.Get(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := ioutil.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(0), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.om.AssertExpectations(t)
	})
}

func TestGetByUser(t *testing.T) {
	t.Run("get user organizations succeeded", func(t *testing.T) {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

		hw := newHandlersWrapper()
		hw.om.On("GetByUserJSON", r.Context()).Return([]byte("dataJSON"), nil)
		hw.h.GetByUser(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := ioutil.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(0), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.om.AssertExpectations(t)
	})

	t.Run("error getting user organizations", func(t *testing.T) {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

		hw := newHandlersWrapper()
		hw.om.On("GetByUserJSON", r.Context()).Return(nil, tests.ErrFakeDatabaseFailure)
		hw.h.GetByUser(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.om.AssertExpectations(t)
	})
}

func TestGetMembers(t *testing.T) {
	rctx := &chi.Context{
		URLParams: chi.RouteParams{
			Keys:   []string{"orgName"},
			Values: []string{"org1"},
		},
	}

	t.Run("error getting organization members", func(t *testing.T) {
		testCases := []struct {
			omErr              error
			expectedStatusCode int
		}{
			{
				org.ErrInvalidInput,
				http.StatusBadRequest,
			},
			{
				tests.ErrFakeDatabaseFailure,
				http.StatusInternalServerError,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.omErr.Error(), func(t *testing.T) {
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("GET", "/", nil)
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
				r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

				hw := newHandlersWrapper()
				hw.om.On("GetMembersJSON", r.Context(), "org1").Return(nil, tc.omErr)
				hw.h.GetMembers(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				hw.om.AssertExpectations(t)
			})
		}
	})

	t.Run("get organization members succeeded", func(t *testing.T) {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		hw := newHandlersWrapper()
		hw.om.On("GetMembersJSON", r.Context(), "org1").Return([]byte("dataJSON"), nil)
		hw.h.GetMembers(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := ioutil.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(0), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.om.AssertExpectations(t)
	})
}

func TestUpdate(t *testing.T) {
	t.Run("invalid organization provided", func(t *testing.T) {
		testCases := []struct {
			description string
			orgJSON     string
			omErr       error
		}{
			{
				"no organization provided",
				"",
				nil,
			},
			{
				"invalid json",
				"-",
				nil,
			},
			{
				"invalid logo image id",
				`{"name": "org1", "logo_image_id": "invalid"}`,
				org.ErrInvalidInput,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("PUT", "/", strings.NewReader(tc.orgJSON))
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

				hw := newHandlersWrapper()
				if tc.omErr != nil {
					hw.om.On("Update", r.Context(), mock.Anything).Return(tc.omErr)
				}
				hw.h.Update(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
				hw.om.AssertExpectations(t)
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
		o := &hub.Organization{}
		_ = json.Unmarshal([]byte(orgJSON), &o)

		testCases := []struct {
			description        string
			err                error
			expectedStatusCode int
		}{
			{
				"organization update succeeded",
				nil,
				http.StatusOK,
			},
			{
				"error updating organization",
				tests.ErrFakeDatabaseFailure,
				http.StatusInternalServerError,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("PUT", "/", strings.NewReader(orgJSON))
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
				rctx := &chi.Context{
					URLParams: chi.RouteParams{
						Keys:   []string{"orgName"},
						Values: []string{"org1"},
					},
				}
				r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

				hw := newHandlersWrapper()
				hw.om.On("Update", r.Context(), o).Return(tc.err)
				hw.h.Update(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				hw.om.AssertExpectations(t)
			})
		}
	})
}

type handlersWrapper struct {
	cfg *viper.Viper
	om  *org.ManagerMock
	h   *Handlers
}

func newHandlersWrapper() *handlersWrapper {
	cfg := viper.New()
	cfg.Set("server.baseURL", "baseURL")
	om := &org.ManagerMock{}

	return &handlersWrapper{
		cfg: cfg,
		om:  om,
		h:   NewHandlers(om, cfg),
	}
}
