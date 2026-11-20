package user

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/artifacthub/hub/internal/apikey"
	"github.com/artifacthub/hub/internal/handlers/helpers"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/artifacthub/hub/internal/user"
	"github.com/go-chi/chi/v5"
	"github.com/rs/zerolog"
	"github.com/spf13/viper"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

func TestMain(m *testing.M) {
	zerolog.SetGlobalLevel(zerolog.Disabled)
	os.Exit(m.Run())
}

func TestApproveSession(t *testing.T) {
	sessionID := "sessionID"

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			desc      string
			inputJSON string
		}{
			{
				"invalid input",
				`{"passcode": "123456" ...`,
			},
			{
				"no passcode provided",
				`{"passcode": ""}`,
			},
		}
		for _, tc := range testCases {
			t.Run(tc.desc, func(t *testing.T) {
				t.Parallel()
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("PUT", "/", strings.NewReader(tc.inputJSON))

				hw := newHandlersWrapper()
				hw.h.ApproveSession(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
			})
		}
	})

	t.Run("session cookie not provided", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		body := strings.NewReader(`{"passcode": "123456"}`)
		r, _ := http.NewRequest("PUT", "/", body)

		hw := newHandlersWrapper()
		hw.h.ApproveSession(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	})

	t.Run("invalid session cookie", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		body := strings.NewReader(`{"passcode": "123456"}`)
		r, _ := http.NewRequest("PUT", "/", body)
		r.AddCookie(newTestCookie(sessionCookieName, "invalidValue"))

		hw := newHandlersWrapper()
		hw.h.ApproveSession(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	})

	t.Run("error approving session", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		body := strings.NewReader(`{"passcode": "123456"}`)
		r, _ := http.NewRequest("PUT", "/", body)

		hw := newHandlersWrapper()
		hw.um.On("ApproveSession", r.Context(), sessionID, "123456").Return(tests.ErrFake)
		encodedSessionID, _ := hw.h.sc.Encode(sessionCookieName, sessionID)
		r.AddCookie(newTestCookie(sessionCookieName, encodedSessionID))
		hw.h.ApproveSession(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
	})

	t.Run("session not pending", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		body := strings.NewReader(`{"passcode": "123456"}`)
		r, _ := http.NewRequest("PUT", "/", body)

		hw := newHandlersWrapper()
		hw.um.On("ApproveSession", r.Context(), sessionID, "123456").Return(user.ErrSessionNotPending)
		encodedSessionID, _ := hw.h.sc.Encode(sessionCookieName, sessionID)
		r.AddCookie(newTestCookie(sessionCookieName, encodedSessionID))
		hw.h.ApproveSession(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := io.ReadAll(resp.Body)

		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, buildError(errInvalidSession.Error()), data)
		hw.um.AssertExpectations(t)
	})

	t.Run("too many attempts", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		body := strings.NewReader(`{"passcode": "123456"}`)
		r, _ := http.NewRequest("PUT", "/", body)

		hw := newHandlersWrapper()
		hw.um.On("ApproveSession", r.Context(), sessionID, "123456").
			Return(&hub.TooManyAttemptsError{RetryAfter: 30})
		encodedSessionID, _ := hw.h.sc.Encode(sessionCookieName, sessionID)
		r.AddCookie(newTestCookie(sessionCookieName, encodedSessionID))
		hw.h.ApproveSession(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := io.ReadAll(resp.Body)

		assert.Equal(t, http.StatusTooManyRequests, resp.StatusCode)
		assert.Equal(t, "30", h.Get("Retry-After"))
		assert.Equal(t, buildError(hub.ErrTooManyAttempts.Error()), data)
		hw.um.AssertExpectations(t)
	})

	t.Run("session approval succeeded", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		body := strings.NewReader(`{"passcode": "123456"}`)
		r, _ := http.NewRequest("PUT", "/", body)

		hw := newHandlersWrapper()
		hw.um.On("ApproveSession", r.Context(), sessionID, "123456").Return(nil)
		encodedSessionID, _ := hw.h.sc.Encode(sessionCookieName, sessionID)
		r.AddCookie(newTestCookie(sessionCookieName, encodedSessionID))
		hw.h.ApproveSession(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusNoContent, resp.StatusCode)
	})
}

func TestBasicAuth(t *testing.T) {
	hw := newHandlersWrapper()
	hw.cfg.Set("server.basicAuth.enabled", true)
	hw.cfg.Set("server.basicAuth.username", "test")
	hw.cfg.Set("server.basicAuth.password", "test")

	t.Run("without basic auth credentials", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		hw.h.BasicAuth(http.HandlerFunc(testsOK)).ServeHTTP(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	})

	t.Run("with basic auth credentials", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r.SetBasicAuth("test", "test")
		hw.h.BasicAuth(http.HandlerFunc(testsOK)).ServeHTTP(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)
	})
}

func TestCheckPasswordStrength(t *testing.T) {
	t.Run("invalid input", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		body := strings.NewReader(`{..`)
		r, _ := http.NewRequest("POST", "/", body)

		hw := newHandlersWrapper()
		hw.h.CheckPasswordStrength(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("invalid passwords", func(t *testing.T) {
		passwords := []string{
			"invalid",
			"123",
			"weak12",
		}
		for _, pw := range passwords {
			t.Run(pw, func(t *testing.T) {
				t.Parallel()
				w := httptest.NewRecorder()
				body := strings.NewReader(fmt.Sprintf(`{"password": "%s"}`, pw))
				r, _ := http.NewRequest("POST", "/", body)

				hw := newHandlersWrapper()
				hw.h.CheckPasswordStrength(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
			})
		}
	})

	t.Run("valid passwords", func(t *testing.T) {
		passwords := []string{
			"12uuYbaT.",
			"this password should be valid too",
			"19s-8*s.Y",
			"yet123-another-ONE",
		}
		for _, pw := range passwords {
			t.Run(pw, func(t *testing.T) {
				t.Parallel()
				w := httptest.NewRecorder()
				body := strings.NewReader(fmt.Sprintf(`{"password": "%s"}`, pw))
				r, _ := http.NewRequest("POST", "/", body)

				hw := newHandlersWrapper()
				hw.h.CheckPasswordStrength(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, http.StatusNoContent, resp.StatusCode)
			})
		}
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
		hw.um.On("CheckAvailability", r.Context(), "invalid", "value").
			Return(false, hub.ErrInvalidInput)
		hw.h.CheckAvailability(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
		assert.Equal(t, helpers.BuildCacheControlHeader(0), h.Get("Cache-Control"))
		hw.um.AssertExpectations(t)
	})

	t.Run("valid input", func(t *testing.T) {
		t.Run("check availability succeeded", func(t *testing.T) {
			testCases := []struct {
				resourceKind string
				available    bool
			}{
				{
					"userAlias",
					true,
				},
			}
			for _, tc := range testCases {
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
					hw.um.On("CheckAvailability", r.Context(), tc.resourceKind, "value").Return(tc.available, nil)
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
					hw.um.AssertExpectations(t)
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
					Values: []string{"userAlias"},
				},
			}
			r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

			hw := newHandlersWrapper()
			hw.um.On("CheckAvailability", r.Context(), "userAlias", "value").Return(false, tests.ErrFakeDB)
			hw.h.CheckAvailability(w, r)
			resp := w.Result()
			defer resp.Body.Close()

			assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
			hw.um.AssertExpectations(t)
		})
	})
}

func TestDeleteUser(t *testing.T) {
	t.Run("invalid input", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		body := strings.NewReader(`code`)
		r, _ := http.NewRequest("DELETE", "/", body)

		hw := newHandlersWrapper()
		hw.h.DeleteUser(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
		hw.um.AssertExpectations(t)
	})

	t.Run("delete user failed (invalid code)", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		body := strings.NewReader(`{"code": "invalid"}`)
		r, _ := http.NewRequest("DELETE", "/", body)

		hw := newHandlersWrapper()
		hw.um.On("DeleteUser", r.Context(), "invalid").Return(user.ErrInvalidDeleteUserCode)
		hw.h.DeleteUser(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
		hw.um.AssertExpectations(t)
	})

	t.Run("delete user failed (db error)", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		body := strings.NewReader(`{"code": "code"}`)
		r, _ := http.NewRequest("DELETE", "/", body)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

		hw := newHandlersWrapper()
		hw.um.On("DeleteUser", r.Context(), "code").Return(tests.ErrFakeDB)
		hw.h.DeleteUser(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.um.AssertExpectations(t)
	})

	t.Run("delete user succeeded", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		body := strings.NewReader(`{"code": "code"}`)
		r, _ := http.NewRequest("DELETE", "/", body)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

		hw := newHandlersWrapper()
		hw.um.On("DeleteUser", r.Context(), "code").Return(nil)
		hw.h.DeleteUser(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusNoContent, resp.StatusCode)
		require.Len(t, resp.Cookies(), 1)
		cookie := resp.Cookies()[0]
		assert.Equal(t, sessionCookieName, cookie.Name)
		assert.Equal(t, "/", cookie.Path)
		assert.True(t, cookie.Expires.Before(time.Now().Add(-24*time.Hour)))
		hw.um.AssertExpectations(t)
	})
}

func TestDisableTFA(t *testing.T) {
	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			desc      string
			inputJSON string
		}{
			{
				"invalid input",
				`{"passcode": "123456" ...`,
			},
			{
				"no passcode provided",
				`{"passcode": ""}`,
			},
		}
		for _, tc := range testCases {
			t.Run(tc.desc, func(t *testing.T) {
				t.Parallel()
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("PUT", "/", strings.NewReader(tc.inputJSON))

				hw := newHandlersWrapper()
				hw.h.DisableTFA(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
			})
		}
	})

	t.Run("disable 2fa failed", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		body := strings.NewReader(`{"passcode": "123456"}`)
		r, _ := http.NewRequest("PUT", "/", body)

		hw := newHandlersWrapper()
		hw.um.On("DisableTFA", r.Context(), "123456").Return(tests.ErrFake)
		hw.h.DisableTFA(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.um.AssertExpectations(t)
	})

	t.Run("too many attempts", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		body := strings.NewReader(`{"passcode": "123456"}`)
		r, _ := http.NewRequest("PUT", "/", body)

		hw := newHandlersWrapper()
		hw.um.On("DisableTFA", r.Context(), "123456").Return(&hub.TooManyAttemptsError{RetryAfter: 30})
		hw.h.DisableTFA(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := io.ReadAll(resp.Body)

		assert.Equal(t, http.StatusTooManyRequests, resp.StatusCode)
		assert.Equal(t, "30", h.Get("Retry-After"))
		assert.Equal(t, buildError(hub.ErrTooManyAttempts.Error()), data)
		hw.um.AssertExpectations(t)
	})

	t.Run("disable 2fa succeeded", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		body := strings.NewReader(`{"passcode": "123456"}`)
		r, _ := http.NewRequest("PUT", "/", body)

		hw := newHandlersWrapper()
		hw.um.On("DisableTFA", r.Context(), "123456").Return(nil)
		hw.h.DisableTFA(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusNoContent, resp.StatusCode)
		hw.um.AssertExpectations(t)
	})
}

func TestEnableTFA(t *testing.T) {
	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			desc      string
			inputJSON string
		}{
			{
				"invalid input",
				`{"passcode": "123456" ...`,
			},
			{
				"no passcode provided",
				`{"passcode": ""}`,
			},
		}
		for _, tc := range testCases {
			t.Run(tc.desc, func(t *testing.T) {
				t.Parallel()
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("PUT", "/", strings.NewReader(tc.inputJSON))

				hw := newHandlersWrapper()
				hw.h.EnableTFA(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
			})
		}
	})

	t.Run("enable 2fa failed", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		body := strings.NewReader(`{"passcode": "123456"}`)
		r, _ := http.NewRequest("PUT", "/", body)

		hw := newHandlersWrapper()
		hw.um.On("EnableTFA", r.Context(), "123456").Return(tests.ErrFake)
		hw.h.EnableTFA(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.um.AssertExpectations(t)
	})

	t.Run("enable 2fa succeeded", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		body := strings.NewReader(`{"passcode": "123456"}`)
		r, _ := http.NewRequest("PUT", "/", body)

		hw := newHandlersWrapper()
		hw.um.On("EnableTFA", r.Context(), "123456").Return(nil)
		hw.h.EnableTFA(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusNoContent, resp.StatusCode)
		hw.um.AssertExpectations(t)
	})
}

func TestGetProfile(t *testing.T) {
	t.Run("error getting profile", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

		hw := newHandlersWrapper()
		hw.um.On("GetProfileJSON", r.Context()).Return(nil, tests.ErrFakeDB)
		hw.h.GetProfile(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.um.AssertExpectations(t)
	})

	t.Run("profile get succeeded", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

		hw := newHandlersWrapper()
		hw.um.On("GetProfileJSON", r.Context()).Return([]byte("dataJSON"), nil)
		hw.h.GetProfile(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := io.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(0), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.um.AssertExpectations(t)
	})
}

func TestInjectUserID(t *testing.T) {
	sessionID := "sessionID"

	checkUserID := func(expectedUserID interface{}) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			if expectedUserID == nil {
				assert.Nil(t, r.Context().Value(hub.UserIDKey))
			} else {
				assert.Equal(t, expectedUserID, r.Context().Value(hub.UserIDKey).(string))
			}
		}
	}

	t.Run("session cookie not provided", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)

		hw := newHandlersWrapper()
		hw.h.InjectUserID(checkUserID(nil)).ServeHTTP(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)
	})

	t.Run("invalid session cookie provided", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r.AddCookie(newTestCookie(sessionCookieName, "invalidValue"))

		hw := newHandlersWrapper()
		hw.h.InjectUserID(checkUserID(nil)).ServeHTTP(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)
	})

	t.Run("error checking session", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)

		hw := newHandlersWrapper()
		encodedSessionID, _ := hw.h.sc.Encode(sessionCookieName, sessionID)
		r.AddCookie(newTestCookie(sessionCookieName, encodedSessionID))
		hw.um.On("CheckSession", r.Context(), mock.Anything, mock.Anything).
			Return(nil, tests.ErrFakeDB)
		hw.h.InjectUserID(checkUserID(nil)).ServeHTTP(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		hw.um.AssertExpectations(t)
	})

	t.Run("invalid session provided", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)

		hw := newHandlersWrapper()
		hw.um.On("CheckSession", r.Context(), mock.Anything, mock.Anything).
			Return(&hub.CheckSessionOutput{UserID: "", Valid: false}, nil)

		encodedSessionID, _ := hw.h.sc.Encode(sessionCookieName, sessionID)
		r.AddCookie(newTestCookie(sessionCookieName, encodedSessionID))
		hw.h.InjectUserID(checkUserID(nil)).ServeHTTP(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		hw.um.AssertExpectations(t)
	})

	t.Run("inject user id succeeded", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)

		hw := newHandlersWrapper()
		hw.um.On("CheckSession", r.Context(), mock.Anything, mock.Anything).
			Return(&hub.CheckSessionOutput{UserID: "userID", Valid: true}, nil)
		encodedSessionID, _ := hw.h.sc.Encode(sessionCookieName, sessionID)
		r.AddCookie(newTestCookie(sessionCookieName, encodedSessionID))
		hw.h.InjectUserID(checkUserID("userID")).ServeHTTP(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		hw.um.AssertExpectations(t)
	})
}

func TestLogin(t *testing.T) {
	sessionID := "sessionID"

	t.Run("invalid", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		body := strings.NewReader(`{"email": "email" ...`)
		r, _ := http.NewRequest("POST", "/", body)

		hw := newHandlersWrapper()
		hw.h.Login(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("credentials not provided", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		body := strings.NewReader(`{}`)
		r, _ := http.NewRequest("POST", "/", body)

		hw := newHandlersWrapper()
		hw.um.On("CheckCredentials", r.Context(), "", "").Return(nil, hub.ErrInvalidInput)
		hw.h.Login(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("error checking credentials", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		body := strings.NewReader(`{"email": "email", "password": "pass"}`)
		r, _ := http.NewRequest("POST", "/", body)

		hw := newHandlersWrapper()
		hw.um.On("CheckCredentials", r.Context(), "email", "pass").Return(nil, tests.ErrFakeDB)
		hw.h.Login(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.um.AssertExpectations(t)
	})

	t.Run("too many attempts", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		body := strings.NewReader(`{"email": "email", "password": "pass"}`)
		r, _ := http.NewRequest("POST", "/", body)

		hw := newHandlersWrapper()
		hw.um.On("CheckCredentials", r.Context(), "email", "pass").
			Return(nil, &hub.TooManyAttemptsError{RetryAfter: 120})
		hw.h.Login(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := io.ReadAll(resp.Body)

		assert.Equal(t, http.StatusTooManyRequests, resp.StatusCode)
		assert.Equal(t, "120", h.Get("Retry-After"))
		assert.Equal(t, buildError(hub.ErrTooManyAttempts.Error()), data)
		assert.Empty(t, resp.Cookies())
		hw.um.AssertExpectations(t)
	})

	t.Run("invalid credentials provided", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		body := strings.NewReader(`{"email": "email", "password": "pass2"}`)
		r, _ := http.NewRequest("POST", "/", body)

		hw := newHandlersWrapper()
		hw.um.On("CheckCredentials", r.Context(), "email", "pass2").
			Return(&hub.CheckCredentialsOutput{Valid: false, UserID: ""}, nil)
		hw.h.Login(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
		hw.um.AssertExpectations(t)
	})

	t.Run("error registering session", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		body := strings.NewReader(`{"email": "email", "password": "pass"}`)
		r, _ := http.NewRequest("POST", "/", body)

		hw := newHandlersWrapper()
		hw.um.On("CheckCredentials", r.Context(), "email", "pass").
			Return(&hub.CheckCredentialsOutput{Valid: true, UserID: "userID", PasswordHash: "hash"}, nil)
		hw.um.On("RegisterSession", r.Context(), &hub.Session{UserID: "userID", PasswordHash: "hash"}).
			Return(nil, tests.ErrFakeDB)
		hw.h.Login(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		assert.Empty(t, resp.Cookies())
		hw.um.AssertExpectations(t)
	})

	t.Run("password changed since it was checked", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		body := strings.NewReader(`{"email": "email", "password": "pass"}`)
		r, _ := http.NewRequest("POST", "/", body)

		hw := newHandlersWrapper()
		hw.um.On("CheckCredentials", r.Context(), "email", "pass").
			Return(&hub.CheckCredentialsOutput{Valid: true, UserID: "userID", PasswordHash: "hash"}, nil)
		hw.um.On("RegisterSession", r.Context(), &hub.Session{UserID: "userID", PasswordHash: "hash"}).
			Return(nil, user.ErrPasswordChanged)
		hw.h.Login(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := io.ReadAll(resp.Body)

		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, buildError(""), data)
		assert.Empty(t, resp.Cookies())
		assert.Empty(t, h.Get(SessionApprovedHeader))
		hw.um.AssertExpectations(t)
	})

	t.Run("login succeeded", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		body := strings.NewReader(`{"email": "email", "password": "pass"}`)
		r, _ := http.NewRequest("POST", "/", body)

		hw := newHandlersWrapper()
		hw.um.On("CheckCredentials", r.Context(), "email", "pass").
			Return(&hub.CheckCredentialsOutput{Valid: true, UserID: "userID", PasswordHash: "hash"}, nil)
		hw.um.On("RegisterSession", r.Context(), &hub.Session{UserID: "userID", PasswordHash: "hash"}).
			Return(&hub.Session{
				SessionID: sessionID,
				Approved:  true,
			}, nil)
		hw.h.Login(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header

		assert.Equal(t, http.StatusNoContent, resp.StatusCode)
		require.Len(t, resp.Cookies(), 1)
		cookie := resp.Cookies()[0]
		assert.Equal(t, sessionCookieName, cookie.Name)
		assert.Equal(t, "/", cookie.Path)
		assert.True(t, cookie.HttpOnly)
		assert.False(t, cookie.Secure)
		var cookieSessionID string
		err := hw.h.sc.Decode(sessionCookieName, cookie.Value, &cookieSessionID)
		require.NoError(t, err)
		assert.Equal(t, sessionID, cookieSessionID)
		assert.Equal(t, "true", h.Get(SessionApprovedHeader))
		hw.um.AssertExpectations(t)
	})

	t.Run("login succeeded (2fa enabled)", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		body := strings.NewReader(`{"email": "email", "password": "pass"}`)
		r, _ := http.NewRequest("POST", "/", body)

		hw := newHandlersWrapper()
		hw.um.On("CheckCredentials", r.Context(), "email", "pass").
			Return(&hub.CheckCredentialsOutput{Valid: true, UserID: "userID", PasswordHash: "hash"}, nil)
		hw.um.On("RegisterSession", r.Context(), &hub.Session{UserID: "userID", PasswordHash: "hash"}).
			Return(&hub.Session{
				SessionID: sessionID,
				Approved:  false,
			}, nil)
		hw.h.Login(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header

		assert.Equal(t, http.StatusNoContent, resp.StatusCode)
		require.Len(t, resp.Cookies(), 1)
		cookie := resp.Cookies()[0]
		assert.Equal(t, sessionCookieName, cookie.Name)
		assert.Equal(t, "/", cookie.Path)
		assert.True(t, cookie.HttpOnly)
		assert.False(t, cookie.Secure)
		var cookieSessionID string
		err := hw.h.sc.Decode(sessionCookieName, cookie.Value, &cookieSessionID)
		require.NoError(t, err)
		assert.Equal(t, sessionID, cookieSessionID)
		assert.Equal(t, "false", h.Get(SessionApprovedHeader))
		hw.um.AssertExpectations(t)
	})
}

func TestLogout(t *testing.T) {
	t.Run("invalid or no session cookie provided", func(t *testing.T) {
		testCases := []struct {
			description string
			cookie      *http.Cookie
		}{
			{
				"invalid session cookie provided",
				nil,
			},
			{
				"no session cookie provided",
				newTestCookie(sessionCookieName, "invalidValue"),
			},
		}
		for _, tc := range testCases {
			t.Run(tc.description, func(t *testing.T) {
				t.Parallel()
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("GET", "/", nil)
				if tc.cookie != nil {
					r.AddCookie(tc.cookie)
				}

				hw := newHandlersWrapper()
				hw.h.Logout(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, http.StatusNoContent, resp.StatusCode)
				require.Len(t, resp.Cookies(), 1)
				cookie := resp.Cookies()[0]
				assert.Equal(t, sessionCookieName, cookie.Name)
				assert.True(t, cookie.Expires.Before(time.Now().Add(-24*time.Hour)))
			})
		}
	})

	t.Run("valid session cookie provided", func(t *testing.T) {
		testCases := []struct {
			description string
			err         interface{}
		}{
			{
				"session deleted successfully",
				nil,
			},
			{
				"error deleting session",
				tests.ErrFakeDB,
			},
		}
		for _, tc := range testCases {
			t.Run(tc.description, func(t *testing.T) {
				t.Parallel()
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("GET", "/", nil)

				hw := newHandlersWrapper()
				hw.um.On("DeleteSession", r.Context(), "sessionID").Return(tc.err)
				encodedSessionID, _ := hw.h.sc.Encode(sessionCookieName, "sessionID")
				r.AddCookie(newTestCookie(sessionCookieName, encodedSessionID))
				hw.h.Logout(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, http.StatusNoContent, resp.StatusCode)
				require.Len(t, resp.Cookies(), 1)
				cookie := resp.Cookies()[0]
				assert.Equal(t, sessionCookieName, cookie.Name)
				assert.Equal(t, "/", cookie.Path)
				assert.True(t, cookie.Expires.Before(time.Now().Add(-24*time.Hour)))
				hw.um.AssertExpectations(t)
			})
		}
	})
}

func TestOauthCallback(t *testing.T) {
	t.Run("invalid oauth code or state", func(t *testing.T) {
		state := &OauthState{
			Random:      "abcd",
			RedirectURL: "/",
		}

		testCases := []struct {
			description string
			url         string
			cookie      *http.Cookie
		}{
			{
				"oauth code not provided",
				"/",
				nil,
			},
			{
				"oauth state not provided",
				"/?code=1234",
				nil,
			},
			{
				"state cookie not provided",
				"/?code=1234&state=" + state.String(),
				nil,
			},
			{
				"invalid state cookie",
				"/?code=1234&state=" + state.String(),
				newTestCookie(oauthStateCookieName, "something not expected"),
			},
		}
		for _, tc := range testCases {
			t.Run(tc.description, func(t *testing.T) {
				t.Parallel()
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("GET", tc.url, nil)
				if tc.cookie != nil {
					r.AddCookie(tc.cookie)
				}

				hw := newHandlersWrapper()
				hw.h.OauthCallback(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, http.StatusSeeOther, resp.StatusCode)
				redirectURL, err := resp.Location()
				require.NoError(t, err)
				assert.Equal(t, oauthFailedURL, redirectURL.String())
			})
		}
	})

	t.Run("oauth provider requests use the oauth http client", func(t *testing.T) {
		state := &OauthState{
			Random:      "abcd",
			RedirectURL: "/",
		}
		tokenResponse := `{"access_token": "token", "token_type": "bearer"}`

		testCases := []struct {
			provider     string
			responses    map[string]string
			expectedUser *hub.User
		}{
			{
				"github",
				map[string]string{
					"POST https://github.com/login/oauth/access_token": tokenResponse,
					"GET https://api.github.com/user":                  `{"login": "alias", "name": "first"}`,
					"GET https://api.github.com/user/emails":           `[{"email": "alias@email.com", "primary": true, "verified": true}]`,
				},
				&hub.User{Alias: "alias", Email: "alias@email.com", FirstName: "first"},
			},
			{
				"google",
				map[string]string{
					"POST https://oauth2.googleapis.com/token": tokenResponse,
					"GET https://people.googleapis.com/v1/people/me": `{
						"names": [{"givenName": "first", "familyName": "last"}],
						"emailAddresses": [{"value": "alias@email.com", "metadata": {"primary": true, "verified": true}}]
					}`,
				},
				&hub.User{Alias: "alias", Email: "alias@email.com", FirstName: "first", LastName: "last"},
			},
		}
		for _, tc := range testCases {
			t.Run(tc.provider, func(t *testing.T) {
				t.Parallel()
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("GET", "/?code=1234&state="+state.String(), nil)
				r.AddCookie(newTestCookie(oauthStateCookieName, state.Random))
				rctx := &chi.Context{
					URLParams: chi.RouteParams{
						Keys:   []string{"provider"},
						Values: []string{tc.provider},
					},
				}
				r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

				hw := newHandlersWrapper()
				hw.h.oauthConfig["google"] = &oauth2.Config{Endpoint: google.Endpoint}
				require.NotNil(t, hw.h.oauthHTTPClient.Transport)
				assert.NotSame(t, http.DefaultTransport, hw.h.oauthHTTPClient.Transport)
				rt := &oauthProviderRoundTripper{responses: tc.responses}
				hw.h.oauthHTTPClient = &http.Client{Transport: rt}
				hw.um.On("CheckAvailability", mock.Anything, "userAlias", tc.expectedUser.Alias).Return(true, nil)
				hw.um.On("GetUserID", mock.Anything).Return("userID", nil)
				hw.um.On("RegisterSession", mock.Anything, mock.MatchedBy(func(s *hub.Session) bool {
					return s.UserID == "userID"
				})).Return(&hub.Session{SessionID: "sessionID"}, nil)
				hw.h.OauthCallback(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, http.StatusSeeOther, resp.StatusCode)
				redirectURL, err := resp.Location()
				require.NoError(t, err)
				assert.Equal(t, state.RedirectURL, redirectURL.String())
				expectedRequests := make([]string, 0, len(tc.responses))
				for request := range tc.responses {
					expectedRequests = append(expectedRequests, request)
				}
				assert.ElementsMatch(t, expectedRequests, rt.requests)
				hw.um.AssertExpectations(t)
			})
		}
	})
}

func TestOauthRedirect(t *testing.T) {
	t.Parallel()
	w := httptest.NewRecorder()
	r, _ := http.NewRequest("GET", "/", nil)
	rctx := &chi.Context{
		URLParams: chi.RouteParams{
			Keys:   []string{"provider"},
			Values: []string{"github"},
		},
	}
	r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

	hw := newHandlersWrapper()
	hw.h.OauthRedirect(w, r)
	resp := w.Result()
	defer resp.Body.Close()

	require.Len(t, resp.Cookies(), 1)
	assert.Equal(t, oauthStateCookieName, resp.Cookies()[0].Name)
	assert.NotEmpty(t, resp.Cookies()[0].Value)
	assert.Equal(t, "/", resp.Cookies()[0].Path)
	assert.True(t, resp.Cookies()[0].HttpOnly)
	assert.False(t, resp.Cookies()[0].Secure)
	assert.Equal(t, http.StatusSeeOther, resp.StatusCode)
	state := &OauthState{
		Random:      resp.Cookies()[0].Value,
		RedirectURL: "/",
	}
	expectedRedirectURL := hw.h.oauthConfig["github"].AuthCodeURL(state.String())
	redirectURL, err := resp.Location()
	require.NoError(t, err)
	assert.Equal(t, expectedRedirectURL, redirectURL.String())
}

func TestRegisterDeleteUserCode(t *testing.T) {
	t.Run("register delete user code failed", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("POST", "/", strings.NewReader(""))
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

		hw := newHandlersWrapper()
		hw.um.On("RegisterDeleteUserCode", r.Context()).Return(tests.ErrFakeDB)
		hw.h.RegisterDeleteUserCode(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.um.AssertExpectations(t)
	})

	t.Run("register delete user code succeeded", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("POST", "/", strings.NewReader(""))
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

		hw := newHandlersWrapper()
		hw.um.On("RegisterDeleteUserCode", r.Context()).Return(nil)
		hw.h.RegisterDeleteUserCode(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusCreated, resp.StatusCode)
		hw.um.AssertExpectations(t)
	})
}

func TestRegisterPasswordResetCode(t *testing.T) {
	t.Run("invalid input", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		body := strings.NewReader(`email`)
		r, _ := http.NewRequest("POST", "/", body)

		hw := newHandlersWrapper()
		hw.h.RegisterPasswordResetCode(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
		hw.um.AssertExpectations(t)
	})

	t.Run("register password reset code failed", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		body := strings.NewReader(`{"email": "email"}`)
		r, _ := http.NewRequest("POST", "/", body)

		hw := newHandlersWrapper()
		hw.um.On("RegisterPasswordResetCode", r.Context(), "email").Return(tests.ErrFakeDB)
		hw.h.RegisterPasswordResetCode(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusCreated, resp.StatusCode)
		hw.um.AssertExpectations(t)
	})

	t.Run("register password reset code succeeded", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		body := strings.NewReader(`{"email": "email"}`)
		r, _ := http.NewRequest("POST", "/", body)

		hw := newHandlersWrapper()
		hw.um.On("RegisterPasswordResetCode", r.Context(), "email").Return(nil)
		hw.h.RegisterPasswordResetCode(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusCreated, resp.StatusCode)
		hw.um.AssertExpectations(t)
	})
}

func TestRegisterUser(t *testing.T) {
	t.Run("sign up is disabled", func(t *testing.T) {
		userJSON := `{
			"alias": "alias",
			"first_name": "first_name",
			"last_name": "last_name",
			"email": "email",
			"password": "password"
		}`

		testCases := []struct {
			description        string
			user               string
			expectedStatusCode int
		}{
			{
				"signup disabled (empty user)",
				"",
				http.StatusForbidden,
			},
			{
				"signup disabled (valid user)",
				userJSON,
				http.StatusForbidden,
			},
		}
		for _, tc := range testCases {
			t.Run(tc.description, func(t *testing.T) {
				t.Parallel()
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("POST", "/", strings.NewReader(tc.user))

				hw := newHandlersWrapper()
				hw.cfg.Set("server.allowUserSignUp", false)

				hw.h.RegisterUser(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
			})
		}
	})

	t.Run("no user provided", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("POST", "/", strings.NewReader(""))

		hw := newHandlersWrapper()
		hw.h.RegisterUser(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("invalid user provided", func(t *testing.T) {
		testCases := []struct {
			description string
			userJSON    string
			umErr       error
		}{
			{
				"invalid json",
				"-",
				nil,
			},
			{
				"missing password",
				`{"alias": "alias", "email": "email"}`,
				nil,
			},
			{
				"missing alias",
				`{"email": "email", "password": "password"}`,
				hub.ErrInvalidInput,
			},
			{
				"missing email",
				`{"alias": "alias", "password": "password"}`,
				hub.ErrInvalidInput,
			},
		}
		for _, tc := range testCases {
			t.Run(tc.description, func(t *testing.T) {
				t.Parallel()
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("POST", "/", strings.NewReader(tc.userJSON))

				hw := newHandlersWrapper()
				if tc.umErr != nil {
					hw.um.On("RegisterUser", r.Context(), mock.Anything).Return(tc.umErr)
				}
				hw.h.RegisterUser(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
				hw.um.AssertExpectations(t)
			})
		}
	})

	t.Run("valid user provided", func(t *testing.T) {
		userJSON := `
		{
			"alias": "alias",
			"first_name": "first_name",
			"last_name": "last_name",
			"email": "email",
			"password": "password"
		}
		`
		u := &hub.User{}
		_ = json.Unmarshal([]byte(userJSON), &u)

		testCases := []struct {
			description        string
			umErr              error
			expectedStatusCode int
		}{
			{
				"registration succeeded",
				nil,
				http.StatusCreated,
			},
			{
				"registration failed",
				tests.ErrFakeDB,
				http.StatusInternalServerError,
			},
		}
		for _, tc := range testCases {
			t.Run(tc.description, func(t *testing.T) {
				t.Parallel()
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("POST", "/", strings.NewReader(userJSON))

				hw := newHandlersWrapper()
				hw.um.On("RegisterUser", r.Context(), u).Return(tc.umErr)
				hw.h.RegisterUser(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				hw.um.AssertExpectations(t)
			})
		}
	})
}

func TestRejectAPIKey(t *testing.T) {
	testCases := []struct {
		desc               string
		apiKeyID           string
		apiKeySecret       string
		expectedNextCalled bool
	}{
		{
			"api key id and secret provided",
			"keyID",
			"secret",
			false,
		},
		{
			"only api key id provided",
			"keyID",
			"",
			true,
		},
		{
			"only api key secret provided",
			"",
			"secret",
			true,
		},
		{
			"no api key provided",
			"",
			"",
			true,
		},
	}
	for _, tc := range testCases {
		t.Run(tc.desc, func(t *testing.T) {
			t.Parallel()
			w := httptest.NewRecorder()
			r, _ := http.NewRequest("POST", "/", nil)
			r.Header.Add(APIKeyIDHeader, tc.apiKeyID)
			r.Header.Add(APIKeySecretHeader, tc.apiKeySecret)

			hw := newHandlersWrapper()
			var nextCalled bool
			next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				nextCalled = true
			})
			hw.h.RejectAPIKey(next).ServeHTTP(w, r)
			resp := w.Result()
			defer resp.Body.Close()
			h := resp.Header
			data, _ := io.ReadAll(resp.Body)

			assert.Equal(t, tc.expectedNextCalled, nextCalled)
			if tc.expectedNextCalled {
				assert.Equal(t, http.StatusOK, resp.StatusCode)
			} else {
				assert.Equal(t, http.StatusForbidden, resp.StatusCode)
				assert.Equal(t, "application/json", h.Get("Content-Type"))
				assert.Equal(t, buildError(errAPIKeyNotAllowed.Error()), data)
			}
			hw.um.AssertExpectations(t)
			hw.am.AssertExpectations(t)
		})
	}
}

func TestRequireLogin(t *testing.T) {
	sessionID := "sessionID"

	t.Run("api key based authentication", func(t *testing.T) {
		apiKeyID := "keyID"
		apiKeySecret := "secret"

		t.Run("no api key id or secret provided", func(t *testing.T) {
			testCases := []struct {
				apiKeyID     string
				apiKeySecret string
			}{
				{
					"",
					"secret",
				},
				{
					"key",
					"",
				},
			}
			for i, tc := range testCases {
				t.Run(strconv.Itoa(i), func(t *testing.T) {
					t.Parallel()
					w := httptest.NewRecorder()
					r, _ := http.NewRequest("GET", "/", nil)
					r.Header.Add(APIKeyIDHeader, tc.apiKeyID)
					r.Header.Add(APIKeySecretHeader, tc.apiKeySecret)

					hw := newHandlersWrapper()
					hw.h.RequireLogin(http.HandlerFunc(testsOK)).ServeHTTP(w, r)
					resp := w.Result()
					defer resp.Body.Close()
					h := resp.Header
					data, _ := io.ReadAll(resp.Body)

					assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
					assert.Equal(t, "application/json", h.Get("Content-Type"))
					assert.Equal(t, buildError(""), data)
				})
			}
		})

		t.Run("error checking api key", func(t *testing.T) {
			t.Parallel()
			w := httptest.NewRecorder()
			r, _ := http.NewRequest("GET", "/", nil)
			r.Header.Add(APIKeyIDHeader, apiKeyID)
			r.Header.Add(APIKeySecretHeader, apiKeySecret)

			hw := newHandlersWrapper()
			hw.am.On("Check", r.Context(), apiKeyID, apiKeySecret).Return(nil, tests.ErrFakeDB)
			hw.h.RequireLogin(http.HandlerFunc(testsOK)).ServeHTTP(w, r)
			resp := w.Result()
			defer resp.Body.Close()
			h := resp.Header
			data, _ := io.ReadAll(resp.Body)

			assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
			assert.Equal(t, "application/json", h.Get("Content-Type"))
			assert.Equal(t, buildError(""), data)
			hw.um.AssertExpectations(t)
		})

		t.Run("invalid api key provided", func(t *testing.T) {
			t.Parallel()
			w := httptest.NewRecorder()
			r, _ := http.NewRequest("GET", "/", nil)
			r.Header.Add(APIKeyIDHeader, apiKeyID)
			r.Header.Add(APIKeySecretHeader, apiKeySecret)

			hw := newHandlersWrapper()
			hw.am.On("Check", r.Context(), apiKeyID, apiKeySecret).
				Return(&hub.CheckAPIKeyOutput{UserID: "", Valid: false}, nil)
			hw.h.RequireLogin(http.HandlerFunc(testsOK)).ServeHTTP(w, r)
			resp := w.Result()
			defer resp.Body.Close()
			h := resp.Header
			data, _ := io.ReadAll(resp.Body)

			assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
			assert.Equal(t, "application/json", h.Get("Content-Type"))
			assert.Equal(t, buildError(errInvalidAPIKey.Error()), data)
			hw.um.AssertExpectations(t)
		})

		t.Run("api key based authentication succeeded", func(t *testing.T) {
			t.Parallel()
			w := httptest.NewRecorder()
			r, _ := http.NewRequest("GET", "/", nil)
			r.Header.Add(APIKeyIDHeader, apiKeyID)
			r.Header.Add(APIKeySecretHeader, apiKeySecret)

			hw := newHandlersWrapper()
			hw.am.On("Check", r.Context(), apiKeyID, apiKeySecret).
				Return(&hub.CheckAPIKeyOutput{UserID: "userID", Valid: true}, nil)
			hw.h.RequireLogin(http.HandlerFunc(testsOK)).ServeHTTP(w, r)
			resp := w.Result()
			defer resp.Body.Close()

			assert.Equal(t, http.StatusOK, resp.StatusCode)
			hw.um.AssertExpectations(t)
		})
	})

	t.Run("session cookie based authentication", func(t *testing.T) {
		t.Run("invalid session cookie provided", func(t *testing.T) {
			t.Parallel()
			w := httptest.NewRecorder()
			r, _ := http.NewRequest("GET", "/", nil)
			r.AddCookie(newTestCookie(sessionCookieName, "invalidValue"))

			hw := newHandlersWrapper()
			hw.h.RequireLogin(http.HandlerFunc(testsOK)).ServeHTTP(w, r)
			resp := w.Result()
			defer resp.Body.Close()
			h := resp.Header
			data, _ := io.ReadAll(resp.Body)

			assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
			assert.Equal(t, "application/json", h.Get("Content-Type"))
			assert.Equal(t, buildError(errInvalidSession.Error()), data)
		})

		t.Run("error checking session", func(t *testing.T) {
			t.Parallel()
			w := httptest.NewRecorder()
			r, _ := http.NewRequest("GET", "/", nil)

			hw := newHandlersWrapper()
			hw.um.On("CheckSession", r.Context(), sessionID, sessionDuration).
				Return(nil, tests.ErrFakeDB)
			encodedSessionID, _ := hw.h.sc.Encode(sessionCookieName, sessionID)
			r.AddCookie(newTestCookie(sessionCookieName, encodedSessionID))
			hw.h.RequireLogin(http.HandlerFunc(testsOK)).ServeHTTP(w, r)
			resp := w.Result()
			defer resp.Body.Close()
			h := resp.Header
			data, _ := io.ReadAll(resp.Body)

			assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
			assert.Equal(t, "application/json", h.Get("Content-Type"))
			assert.Equal(t, buildError(""), data)
			hw.um.AssertExpectations(t)
		})

		t.Run("invalid session provided", func(t *testing.T) {
			t.Parallel()
			w := httptest.NewRecorder()
			r, _ := http.NewRequest("GET", "/", nil)

			hw := newHandlersWrapper()
			hw.um.On("CheckSession", r.Context(), sessionID, sessionDuration).
				Return(&hub.CheckSessionOutput{UserID: "", Valid: false}, nil)
			encodedSessionID, _ := hw.h.sc.Encode(sessionCookieName, sessionID)
			r.AddCookie(newTestCookie(sessionCookieName, encodedSessionID))
			hw.h.RequireLogin(http.HandlerFunc(testsOK)).ServeHTTP(w, r)
			resp := w.Result()
			defer resp.Body.Close()
			h := resp.Header
			data, _ := io.ReadAll(resp.Body)

			assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
			assert.Equal(t, "application/json", h.Get("Content-Type"))
			assert.Equal(t, buildError(errInvalidSession.Error()), data)
			hw.um.AssertExpectations(t)
		})

		t.Run("session cookie based authentication succeeded", func(t *testing.T) {
			t.Parallel()
			w := httptest.NewRecorder()
			r, _ := http.NewRequest("GET", "/", nil)

			hw := newHandlersWrapper()
			hw.um.On("CheckSession", r.Context(), sessionID, sessionDuration).
				Return(&hub.CheckSessionOutput{UserID: "userID", Valid: true}, nil)
			encodedSessionID, _ := hw.h.sc.Encode(sessionCookieName, sessionID)
			r.AddCookie(newTestCookie(sessionCookieName, encodedSessionID))
			hw.h.RequireLogin(http.HandlerFunc(testsOK)).ServeHTTP(w, r)
			resp := w.Result()
			defer resp.Body.Close()

			assert.Equal(t, http.StatusOK, resp.StatusCode)
			hw.um.AssertExpectations(t)
		})
	})

	t.Run("no authentication method used", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)

		hw := newHandlersWrapper()
		hw.h.RequireLogin(http.HandlerFunc(testsOK)).ServeHTTP(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := io.ReadAll(resp.Body)

		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, buildError(""), data)
	})
}

func TestResetPassword(t *testing.T) {
	sessionID := "sessionID"

	t.Run("invalid input", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		body := strings.NewReader(`code`)
		r, _ := http.NewRequest("PUT", "/", body)

		hw := newHandlersWrapper()
		hw.h.ResetPassword(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
		assert.Empty(t, resp.Cookies())
		assert.Empty(t, resp.Header.Get(SessionApprovedHeader))
		hw.um.AssertExpectations(t)
	})

	t.Run("password reset failed", func(t *testing.T) {
		testCases := []struct {
			description        string
			err                error
			expectedStatusCode int
		}{
			{
				"invalid code",
				user.ErrInvalidPasswordResetCode,
				http.StatusBadRequest,
			},
			{
				"database error",
				tests.ErrFakeDB,
				http.StatusInternalServerError,
			},
		}
		for _, tc := range testCases {
			t.Run(tc.description, func(t *testing.T) {
				t.Parallel()
				w := httptest.NewRecorder()
				body := strings.NewReader(`{"code": "code", "password": "password"}`)
				r, _ := http.NewRequest("PUT", "/", body)

				hw := newHandlersWrapper()
				hw.um.On("ResetPassword", r.Context(), "code", "password").Return(nil, tc.err)
				hw.h.ResetPassword(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				assert.Empty(t, resp.Cookies())
				assert.Empty(t, resp.Header.Get(SessionApprovedHeader))
				hw.um.AssertNotCalled(t, "RegisterSession", mock.Anything, mock.Anything)
				hw.um.AssertExpectations(t)
			})
		}
	})

	t.Run("password reset succeeded", func(t *testing.T) {
		testCases := []struct {
			description            string
			sessionCookie          string // "", "valid" or "undecodable"
			checkSessionOutput     *hub.CheckSessionOutput
			checkSessionErr        error
			resetPasswordOutput    *hub.ResetPasswordOutput
			registerSession        bool
			registeredSession      *hub.Session
			registerSessionErr     error
			expectedSignIn         bool
			expectedApprovedHeader string
		}{
			{
				description:            "no session cookie, session approved",
				resetPasswordOutput:    &hub.ResetPasswordOutput{UserID: "userID", PasswordHash: "hash"},
				registerSession:        true,
				registeredSession:      &hub.Session{SessionID: sessionID, Approved: true},
				expectedSignIn:         true,
				expectedApprovedHeader: "true",
			},
			{
				description:            "no session cookie, session pending approval",
				resetPasswordOutput:    &hub.ResetPasswordOutput{UserID: "userID", PasswordHash: "hash"},
				registerSession:        true,
				registeredSession:      &hub.Session{SessionID: sessionID, Approved: false},
				expectedSignIn:         true,
				expectedApprovedHeader: "false",
			},
			{
				description:            "approved session of the same user",
				sessionCookie:          "valid",
				checkSessionOutput:     &hub.CheckSessionOutput{Valid: true, UserID: "userID"},
				resetPasswordOutput:    &hub.ResetPasswordOutput{UserID: "userID", PasswordHash: "hash"},
				registerSession:        true,
				registeredSession:      &hub.Session{SessionID: sessionID, Approved: true},
				expectedSignIn:         true,
				expectedApprovedHeader: "true",
			},
			{
				description:         "approved session of another user",
				sessionCookie:       "valid",
				checkSessionOutput:  &hub.CheckSessionOutput{Valid: true, UserID: "otherUserID"},
				resetPasswordOutput: &hub.ResetPasswordOutput{UserID: "userID", PasswordHash: "hash"},
			},
			{
				description:            "session not valid",
				sessionCookie:          "valid",
				checkSessionOutput:     &hub.CheckSessionOutput{Valid: false},
				resetPasswordOutput:    &hub.ResetPasswordOutput{UserID: "userID", PasswordHash: "hash"},
				registerSession:        true,
				registeredSession:      &hub.Session{SessionID: sessionID, Approved: true},
				expectedSignIn:         true,
				expectedApprovedHeader: "true",
			},
			{
				description:            "undecodable session cookie",
				sessionCookie:          "undecodable",
				resetPasswordOutput:    &hub.ResetPasswordOutput{UserID: "userID", PasswordHash: "hash"},
				registerSession:        true,
				registeredSession:      &hub.Session{SessionID: sessionID, Approved: true},
				expectedSignIn:         true,
				expectedApprovedHeader: "true",
			},
			{
				description:         "error checking session",
				sessionCookie:       "valid",
				checkSessionErr:     tests.ErrFakeDB,
				resetPasswordOutput: &hub.ResetPasswordOutput{UserID: "userID", PasswordHash: "hash"},
			},
			{
				description:         "password changed again",
				resetPasswordOutput: &hub.ResetPasswordOutput{UserID: "userID", PasswordHash: "hash"},
				registerSession:     true,
				registerSessionErr:  user.ErrPasswordChanged,
			},
			{
				description:         "error registering session",
				resetPasswordOutput: &hub.ResetPasswordOutput{UserID: "userID", PasswordHash: "hash"},
				registerSession:     true,
				registerSessionErr:  tests.ErrFakeDB,
			},
			{
				description:         "user id not available",
				resetPasswordOutput: &hub.ResetPasswordOutput{UserID: "", PasswordHash: "hash"},
			},
		}
		for _, tc := range testCases {
			t.Run(tc.description, func(t *testing.T) {
				t.Parallel()
				w := httptest.NewRecorder()
				body := strings.NewReader(`{"code": "code", "password": "password"}`)
				r, _ := http.NewRequest("PUT", "/", body)

				hw := newHandlersWrapper()
				switch tc.sessionCookie {
				case "valid":
					encodedSessionID, _ := hw.h.sc.Encode(sessionCookieName, "currentSessionID")
					r.AddCookie(newTestCookie(sessionCookieName, encodedSessionID))
					hw.um.On("CheckSession", r.Context(), "currentSessionID", sessionDuration).
						Return(tc.checkSessionOutput, tc.checkSessionErr)
				case "undecodable":
					r.AddCookie(newTestCookie(sessionCookieName, "invalidValue"))
				}
				hw.um.On("ResetPassword", r.Context(), "code", "password").Return(tc.resetPasswordOutput, nil)
				if tc.registerSession {
					hw.um.On("RegisterSession", r.Context(), &hub.Session{UserID: "userID", PasswordHash: "hash"}).
						Return(tc.registeredSession, tc.registerSessionErr)
				}
				hw.h.ResetPassword(w, r)
				resp := w.Result()
				defer resp.Body.Close()
				h := resp.Header

				assert.Equal(t, http.StatusNoContent, resp.StatusCode)
				assert.Equal(t, tc.expectedApprovedHeader, h.Get(SessionApprovedHeader))
				if tc.expectedSignIn {
					require.Len(t, resp.Cookies(), 1)
					cookie := resp.Cookies()[0]
					assert.Equal(t, sessionCookieName, cookie.Name)
					assert.Equal(t, "/", cookie.Path)
					assert.True(t, cookie.HttpOnly)
					assert.False(t, cookie.Secure)
					var cookieSessionID string
					err := hw.h.sc.Decode(sessionCookieName, cookie.Value, &cookieSessionID)
					require.NoError(t, err)
					assert.Equal(t, sessionID, cookieSessionID)
				} else {
					assert.Empty(t, resp.Cookies())
				}
				if !tc.registerSession {
					hw.um.AssertNotCalled(t, "RegisterSession", mock.Anything, mock.Anything)
				}
				if tc.sessionCookie != "valid" {
					hw.um.AssertNotCalled(t, "CheckSession", mock.Anything, mock.Anything, mock.Anything)
				}
				hw.um.AssertExpectations(t)
			})
		}
	})
}

func TestSetupTFA(t *testing.T) {
	t.Run("2fa setup failed", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("POST", "/", nil)

		hw := newHandlersWrapper()
		hw.um.On("SetupTFA", r.Context()).Return(nil, tests.ErrFake)
		hw.h.SetupTFA(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.um.AssertExpectations(t)
	})

	t.Run("2fa setup succeeded", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("POST", "/", nil)

		hw := newHandlersWrapper()
		hw.um.On("SetupTFA", r.Context()).Return([]byte("dataJSON"), nil)
		hw.h.SetupTFA(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := io.ReadAll(resp.Body)

		assert.Equal(t, http.StatusCreated, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.um.AssertExpectations(t)
	})
}

func TestUpdatePassword(t *testing.T) {
	t.Run("no old password provided", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		body := strings.NewReader(`{"new": "new"}`)
		r, _ := http.NewRequest("PUT", "/", body)

		hw := newHandlersWrapper()
		hw.um.On("UpdatePassword", r.Context(), "", "new").Return(hub.ErrInvalidInput)
		hw.h.UpdatePassword(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
		hw.um.AssertExpectations(t)
	})

	t.Run("no new password provided", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		body := strings.NewReader(`{"old": "old"}`)
		r, _ := http.NewRequest("PUT", "/", body)

		hw := newHandlersWrapper()
		hw.um.On("UpdatePassword", r.Context(), "old", "").Return(hub.ErrInvalidInput)
		hw.h.UpdatePassword(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
		hw.um.AssertExpectations(t)
	})

	t.Run("invalid old password provided", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		body := strings.NewReader(`{"old": "invalid", "new": "new"}`)
		r, _ := http.NewRequest("PUT", "/", body)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

		hw := newHandlersWrapper()
		hw.um.On("UpdatePassword", r.Context(), "invalid", "new").
			Return(user.ErrInvalidPassword)
		hw.h.UpdatePassword(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
		hw.um.AssertExpectations(t)
	})

	t.Run("error updating password", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		body := strings.NewReader(`{"old": "old", "new": "new"}`)
		r, _ := http.NewRequest("PUT", "/", body)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

		hw := newHandlersWrapper()
		hw.um.On("UpdatePassword", r.Context(), "old", "new").
			Return(tests.ErrFakeDB)
		hw.h.UpdatePassword(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.um.AssertExpectations(t)
	})

	t.Run("too many attempts", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		body := strings.NewReader(`{"old": "old", "new": "new"}`)
		r, _ := http.NewRequest("PUT", "/", body)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

		hw := newHandlersWrapper()
		hw.um.On("UpdatePassword", r.Context(), "old", "new").
			Return(&hub.TooManyAttemptsError{RetryAfter: 30})
		hw.h.UpdatePassword(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := io.ReadAll(resp.Body)

		assert.Equal(t, http.StatusTooManyRequests, resp.StatusCode)
		assert.Equal(t, "30", h.Get("Retry-After"))
		assert.Equal(t, buildError(hub.ErrTooManyAttempts.Error()), data)
		hw.um.AssertExpectations(t)
	})

	t.Run("password updated successfully", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		body := strings.NewReader(`{"old": "old", "new": "new"}`)
		r, _ := http.NewRequest("PUT", "/", body)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

		hw := newHandlersWrapper()
		hw.um.On("UpdatePassword", r.Context(), "old", "new").Return(nil)
		hw.h.UpdatePassword(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusNoContent, resp.StatusCode)
		hw.um.AssertExpectations(t)
	})
}

func TestUpdateProfile(t *testing.T) {
	userJSON := `{"first_name": "firstname", "last_name": "lastname"}`
	u := &hub.User{}
	_ = json.Unmarshal([]byte(userJSON), &u)

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			desc     string
			userJSON string
			umErr    error
		}{
			{
				"no user provided",
				"",
				nil,
			},
			{
				"invalid user json",
				"{invalid json",
				nil,
			},
			{
				"alias not provided",
				"{}",
				hub.ErrInvalidInput,
			},
		}
		for _, tc := range testCases {
			t.Run(tc.desc, func(t *testing.T) {
				t.Parallel()
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("PUT", "/", strings.NewReader(tc.userJSON))

				hw := newHandlersWrapper()
				if tc.umErr != nil {
					hw.um.On("UpdateProfile", r.Context(), mock.Anything).Return(tc.umErr)
				}
				hw.h.UpdateProfile(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
				hw.um.AssertExpectations(t)
			})
		}
	})

	t.Run("error updating profile", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("PUT", "/", strings.NewReader(userJSON))
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

		hw := newHandlersWrapper()
		hw.um.On("UpdateProfile", r.Context(), u).Return(tests.ErrFakeDB)
		hw.h.UpdateProfile(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.um.AssertExpectations(t)
	})

	t.Run("user profile updated successfully", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("PUT", "/", strings.NewReader(userJSON))
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

		hw := newHandlersWrapper()
		hw.um.On("UpdateProfile", r.Context(), u).Return(nil)
		hw.h.UpdateProfile(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusNoContent, resp.StatusCode)
		hw.um.AssertExpectations(t)
	})
}

func TestVerifyEmail(t *testing.T) {
	testCases := []struct {
		description        string
		response           []interface{}
		expectedStatusCode int
	}{
		{
			"code not provided",
			[]interface{}{false, hub.ErrInvalidInput},
			http.StatusBadRequest,
		},
		{
			"code not verified",
			[]interface{}{false, nil},
			http.StatusGone,
		},
		{
			"code verified",
			[]interface{}{true, nil},
			http.StatusNoContent,
		},
		{
			"database error",
			[]interface{}{false, tests.ErrFakeDB},
			http.StatusInternalServerError,
		},
	}
	for _, tc := range testCases {
		t.Run(tc.description, func(t *testing.T) {
			t.Parallel()
			w := httptest.NewRecorder()
			r, _ := http.NewRequest("POST", "/", strings.NewReader(`{"code": "1234"}`))

			hw := newHandlersWrapper()
			hw.um.On("VerifyEmail", r.Context(), "1234").Return(tc.response...)
			hw.h.VerifyEmail(w, r)
			resp := w.Result()
			defer resp.Body.Close()

			assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
			hw.um.AssertExpectations(t)
		})
	}
}

func TestVerifyPasswordResetCode(t *testing.T) {
	t.Run("invalid input", func(t *testing.T) {
		t.Parallel()
		w := httptest.NewRecorder()
		body := strings.NewReader(`code`)
		r, _ := http.NewRequest("POST", "/", body)

		hw := newHandlersWrapper()
		hw.h.VerifyPasswordResetCode(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
		hw.um.AssertExpectations(t)
	})

	t.Run("valid input", func(t *testing.T) {
		testCases := []struct {
			description        string
			email              string
			err                error
			expectedStatusCode int
		}{
			{
				"valid code",
				"user@email.com",
				nil,
				http.StatusOK,
			},
			{
				"invalid code",
				"",
				user.ErrInvalidPasswordResetCode,
				http.StatusGone,
			},
			{
				"database error",
				"",
				tests.ErrFakeDB,
				http.StatusInternalServerError,
			},
		}
		for _, tc := range testCases {
			t.Run(tc.description, func(t *testing.T) {
				t.Parallel()
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("POST", "/", strings.NewReader(`{"code": "code"}`))

				hw := newHandlersWrapper()
				hw.um.On("VerifyPasswordResetCode", r.Context(), "code").Return(tc.email, tc.err)
				hw.h.VerifyPasswordResetCode(w, r)
				resp := w.Result()
				defer resp.Body.Close()
				h := resp.Header
				data, _ := io.ReadAll(resp.Body)

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				if tc.err == nil {
					assert.Equal(t, "application/json", h.Get("Content-Type"))
					assert.Equal(t, []byte(`{"email":"user@email.com"}`), data)
				}
				hw.um.AssertExpectations(t)
			})
		}
	})
}

func testsOK(w http.ResponseWriter, r *http.Request) {}

// oauthProviderRoundTripper is an http.RoundTripper that replies to the
// requests sent to the oauth providers with the responses provided, keyed by
// the request method and url (without query). It records the requests made, and
// checks that the requests sent to the providers APIs include the access token.
type oauthProviderRoundTripper struct {
	responses map[string]string
	requests  []string
}

// RoundTrip implements the http.RoundTripper interface.
func (rt *oauthProviderRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	if req.Body != nil {
		defer req.Body.Close()
	}
	request := fmt.Sprintf("%s %s://%s%s", req.Method, req.URL.Scheme, req.URL.Host, req.URL.Path)
	rt.requests = append(rt.requests, request)
	statusCode := http.StatusOK
	body, ok := rt.responses[request]
	switch {
	case !ok:
		statusCode = http.StatusNotFound
	case req.Method == "GET" && req.Header.Get("Authorization") != "Bearer token":
		statusCode = http.StatusUnauthorized
	}
	return &http.Response{
		StatusCode: statusCode,
		Header:     http.Header{"Content-Type": []string{"application/json"}},
		Body:       io.NopCloser(strings.NewReader(body)),
		Request:    req,
	}, nil
}

type handlersWrapper struct {
	cfg *viper.Viper
	um  *user.ManagerMock
	am  *apikey.ManagerMock
	h   *Handlers
}

func newHandlersWrapper() *handlersWrapper {
	cfg := viper.New()
	cfg.Set("server.baseURL", "baseURL")
	cfg.Set("server.oauth.github", map[string]string{})
	cfg.Set("server.allowUserSignUp", true)
	cfg.Set("server.cookie.hashKey", "tests")

	um := &user.ManagerMock{}
	am := &apikey.ManagerMock{}
	h, _ := NewHandlers(context.Background(), um, am, cfg)

	return &handlersWrapper{
		cfg: cfg,
		um:  um,
		am:  am,
		h:   h,
	}
}

func buildError(msg string) []byte {
	data := map[string]interface{}{
		"message": msg,
	}
	dataJSON, _ := json.Marshal(data)
	return append(dataJSON, '\n')
}

func newTestCookie(name, value string) *http.Cookie {
	return &http.Cookie{
		Name:     name,
		Value:    value,
		Path:     "/",
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	}
}
