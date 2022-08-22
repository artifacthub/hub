package org

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/artifacthub/hub/internal/authz"
	"github.com/artifacthub/hub/internal/handlers/helpers"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/org"
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
				hub.ErrInvalidInput,
			},
			{
				"invalid name",
				`{"name": "_org"}`,
				hub.ErrInvalidInput,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				t.Parallel()
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
				http.StatusCreated,
			},
			{
				"error adding organization",
				tests.ErrFakeDB,
				http.StatusInternalServerError,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				t.Parallel()
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
			http.StatusCreated,
		},
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
		var desc string
		if tc.omErr != nil {
			desc = tc.omErr.Error()
		}
		t.Run(desc, func(t *testing.T) {
			t.Parallel()
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
			hw.om.On("AddMember", r.Context(), "org1", "userAlias").Return(tc.omErr)
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
		hw.om.On("CheckAvailability", r.Context(), "invalid", "value").
			Return(false, hub.ErrInvalidInput)
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
					hw.om.On("CheckAvailability", r.Context(), tc.resourceKind, "value").Return(tc.available, nil)
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
					hw.om.AssertExpectations(t)
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
					Values: []string{"organizationName"},
				},
			}
			r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

			hw := newHandlersWrapper()
			hw.om.On("CheckAvailability", r.Context(), "organizationName", "value").
				Return(false, tests.ErrFakeDB)
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
			http.StatusNoContent,
		},
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
		var desc string
		if tc.omErr != nil {
			desc = tc.omErr.Error()
		}
		t.Run(desc, func(t *testing.T) {
			t.Parallel()
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

func TestDelete(t *testing.T) {
	testCases := []struct {
		omErr              error
		expectedStatusCode int
	}{
		{
			nil,
			http.StatusNoContent,
		},
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
		var desc string
		if tc.omErr != nil {
			desc = tc.omErr.Error()
		}
		t.Run(desc, func(t *testing.T) {
			t.Parallel()
			w := httptest.NewRecorder()
			r, _ := http.NewRequest("DELETE", "/", nil)
			r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
			rctx := &chi.Context{
				URLParams: chi.RouteParams{
					Keys:   []string{"orgName"},
					Values: []string{"org1"},
				},
			}
			r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

			hw := newHandlersWrapper()
			hw.om.On("Delete", r.Context(), "org1").Return(tc.omErr)
			hw.h.Delete(w, r)
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
			http.StatusNoContent,
		},
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
		var desc string
		if tc.omErr != nil {
			desc = tc.omErr.Error()
		}
		t.Run(desc, func(t *testing.T) {
			t.Parallel()
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
			t.Run(tc.omErr.Error(), func(t *testing.T) {
				t.Parallel()
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
		t.Parallel()
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
		data, _ := io.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(0), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.om.AssertExpectations(t)
	})
}

func TestGetAuthorizationPolicy(t *testing.T) {
	rctx := &chi.Context{
		URLParams: chi.RouteParams{
			Keys:   []string{"orgName"},
			Values: []string{"org1"},
		},
	}

	t.Run("error getting authorization policy", func(t *testing.T) {
		testCases := []struct {
			omErr              error
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
			t.Run(tc.omErr.Error(), func(t *testing.T) {
				t.Parallel()
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("GET", "/", nil)
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
				r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

				hw := newHandlersWrapper()
				hw.om.On("GetAuthorizationPolicyJSON", r.Context(), "org1").Return(nil, tc.omErr)
				hw.h.GetAuthorizationPolicy(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				hw.om.AssertExpectations(t)
			})
		}
	})

	t.Run("get authorization policy succeeded", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		hw := newHandlersWrapper()
		hw.om.On("GetAuthorizationPolicyJSON", r.Context(), "org1").Return([]byte("dataJSON"), nil)
		hw.h.GetAuthorizationPolicy(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := io.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(0), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.om.AssertExpectations(t)
	})
}

func TestGetByUser(t *testing.T) {
	t.Run("get user organizations succeeded", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/?limit=10&offset=1", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

		hw := newHandlersWrapper()
		hw.om.On("GetByUserJSON", r.Context(), &hub.Pagination{
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
		hw.om.AssertExpectations(t)
	})

	t.Run("error getting user organizations", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/?limit=10&offset=1", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

		hw := newHandlersWrapper()
		hw.om.On("GetByUserJSON", r.Context(), &hub.Pagination{
			Limit:  10,
			Offset: 1,
		}).Return(nil, tests.ErrFakeDB)
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
			t.Run(tc.omErr.Error(), func(t *testing.T) {
				t.Parallel()
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("GET", "/?limit=10&offset=1", nil)
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
				r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

				hw := newHandlersWrapper()
				hw.om.On("GetMembersJSON", r.Context(), "org1", &hub.Pagination{
					Limit:  10,
					Offset: 1,
				}).Return(nil, tc.omErr)
				hw.h.GetMembers(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				hw.om.AssertExpectations(t)
			})
		}
	})

	t.Run("get organization members succeeded", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/?limit=10&offset=1", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		hw := newHandlersWrapper()
		hw.om.On("GetMembersJSON", r.Context(), "org1", &hub.Pagination{
			Limit:  10,
			Offset: 1,
		}).Return(&hub.JSONQueryResult{
			Data:       []byte("dataJSON"),
			TotalCount: 1,
		}, nil)
		hw.h.GetMembers(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := io.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, h.Get(helpers.PaginationTotalCount), "1")
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(0), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.om.AssertExpectations(t)
	})
}

func TestUpdate(t *testing.T) {
	rctx := &chi.Context{
		URLParams: chi.RouteParams{
			Keys:   []string{"orgName"},
			Values: []string{"org1"},
		},
	}

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
				hub.ErrInvalidInput,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				t.Parallel()
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("PUT", "/", strings.NewReader(tc.orgJSON))
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
				r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

				hw := newHandlersWrapper()
				if tc.omErr != nil {
					hw.om.On("Update", r.Context(), "org1", mock.Anything).Return(tc.omErr)
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
				http.StatusNoContent,
			},
			{
				"error updating organization (insufficiente privilege)",
				hub.ErrInsufficientPrivilege,
				http.StatusForbidden,
			},
			{
				"error updating organization (db error)",
				tests.ErrFakeDB,
				http.StatusInternalServerError,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				t.Parallel()
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("PUT", "/", strings.NewReader(orgJSON))
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
				r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

				hw := newHandlersWrapper()
				hw.om.On("Update", r.Context(), "org1", o).Return(tc.err)
				hw.h.Update(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				hw.om.AssertExpectations(t)
			})
		}
	})
}

func TestUpdateAuthorizationPolicy(t *testing.T) {
	rctx := &chi.Context{
		URLParams: chi.RouteParams{
			Keys:   []string{"orgName"},
			Values: []string{"org1"},
		},
	}

	t.Run("invalid authorization policy provided", func(t *testing.T) {
		testCases := []struct {
			description string
			policyJSON  string
			omErr       error
		}{
			{
				"no authorization policy provided",
				"",
				nil,
			},
			{
				"invalid json",
				"-",
				nil,
			},
			{
				"invalid policy data",
				`{"policy_data": "invalid"}`,
				hub.ErrInvalidInput,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				t.Parallel()
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("PUT", "/", strings.NewReader(tc.policyJSON))
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
				r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

				hw := newHandlersWrapper()
				if tc.omErr != nil {
					hw.om.On("UpdateAuthorizationPolicy", r.Context(), "org1", mock.Anything).Return(tc.omErr)
				}
				hw.h.UpdateAuthorizationPolicy(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
				hw.om.AssertExpectations(t)
			})
		}
	})

	t.Run("valid authorization policy provided", func(t *testing.T) {
		policyJSON := `
		{
			"authorization_enabled": true,
			"predefined_policy": "rbac.v1",
			"custom_policy": "",
			"policy_data": "{\"k\": \"v\"}"
		}
		`
		policy := &hub.AuthorizationPolicy{}
		_ = json.Unmarshal([]byte(policyJSON), &policy)

		testCases := []struct {
			description        string
			err                error
			expectedStatusCode int
		}{
			{
				"authorization policy update succeeded",
				nil,
				http.StatusNoContent,
			},
			{
				"error updating organization policy (insufficiente privilege)",
				hub.ErrInsufficientPrivilege,
				http.StatusForbidden,
			},
			{
				"error updating organization policy (db error)",
				tests.ErrFakeDB,
				http.StatusInternalServerError,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				t.Parallel()
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("PUT", "/", strings.NewReader(policyJSON))
				r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
				rctx := &chi.Context{
					URLParams: chi.RouteParams{
						Keys:   []string{"orgName"},
						Values: []string{"org1"},
					},
				}
				r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

				hw := newHandlersWrapper()
				hw.om.On("UpdateAuthorizationPolicy", r.Context(), "org1", policy).Return(tc.err)
				hw.h.UpdateAuthorizationPolicy(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				hw.om.AssertExpectations(t)
			})
		}
	})
}

func TestGetUserAllowedActions(t *testing.T) {
	rctx := &chi.Context{
		URLParams: chi.RouteParams{
			Keys:   []string{"orgName"},
			Values: []string{"org1"},
		},
	}

	t.Run("get allowed actions failed", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		hw := newHandlersWrapper()
		hw.az.On("GetAllowedActions", r.Context(), "userID", "org1").Return(nil, tests.ErrFake)
		hw.h.GetUserAllowedActions(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.om.AssertExpectations(t)
	})

	t.Run("get allowed actions succeeded", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		hw := newHandlersWrapper()
		hw.az.On("GetAllowedActions", r.Context(), "userID", "org1").Return([]hub.Action{
			hub.AddOrganizationMember,
			hub.DeleteOrganizationMember,
		}, nil)
		hw.h.GetUserAllowedActions(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := io.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(0), h.Get("Cache-Control"))
		assert.Equal(t, []byte(`["addOrganizationMember","deleteOrganizationMember"]`), data)
		hw.om.AssertExpectations(t)
	})
}

type handlersWrapper struct {
	cfg *viper.Viper
	om  *org.ManagerMock
	az  *authz.AuthorizerMock
	h   *Handlers
}

func newHandlersWrapper() *handlersWrapper {
	cfg := viper.New()
	cfg.Set("server.baseURL", "baseURL")
	om := &org.ManagerMock{}
	az := &authz.AuthorizerMock{}

	return &handlersWrapper{
		cfg: cfg,
		om:  om,
		az:  az,
		h:   NewHandlers(om, az, cfg),
	}
}
