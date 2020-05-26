package user

import (
	"context"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/artifacthub/hub/cmd/hub/handlers/helpers"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/artifacthub/hub/internal/user"
	"github.com/go-chi/chi"
	"github.com/rs/zerolog"
	"github.com/spf13/viper"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestMain(m *testing.M) {
	zerolog.SetGlobalLevel(zerolog.Disabled)
	os.Exit(m.Run())
}

func TestBasicAuth(t *testing.T) {
	hw := newHandlersWrapper()
	hw.cfg.Set("server.basicAuth.enabled", true)
	hw.cfg.Set("server.basicAuth.username", "test")
	hw.cfg.Set("server.basicAuth.password", "test")

	t.Run("without basic auth credentials", func(t *testing.T) {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		hw.h.BasicAuth(http.HandlerFunc(testsOK)).ServeHTTP(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	})

	t.Run("with basic auth credentials", func(t *testing.T) {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r.SetBasicAuth("test", "test")
		hw.h.BasicAuth(http.HandlerFunc(testsOK)).ServeHTTP(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)
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
		hw.um.On("CheckAvailability", r.Context(), "invalid", "value").
			Return(false, user.ErrInvalidInput)
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
					hw.um.On("CheckAvailability", r.Context(), mock.Anything, mock.Anything).
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
					hw.um.AssertExpectations(t)
				})
			}
		})

		t.Run("check availability failed", func(t *testing.T) {
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
			hw.um.On("CheckAvailability", r.Context(), mock.Anything, mock.Anything).
				Return(false, tests.ErrFakeDatabaseFailure)
			hw.h.CheckAvailability(w, r)
			resp := w.Result()
			defer resp.Body.Close()

			assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
			hw.um.AssertExpectations(t)
		})
	})
}

func TestGetProfile(t *testing.T) {
	t.Run("error getting profile", func(t *testing.T) {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

		hw := newHandlersWrapper()
		hw.um.On("GetProfileJSON", r.Context()).Return(nil, tests.ErrFakeDatabaseFailure)
		hw.h.GetProfile(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.um.AssertExpectations(t)
	})

	t.Run("profile get succeeded", func(t *testing.T) {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

		hw := newHandlersWrapper()
		hw.um.On("GetProfileJSON", r.Context()).Return([]byte("dataJSON"), nil)
		hw.h.GetProfile(w, r)
		resp := w.Result()
		defer resp.Body.Close()
		h := resp.Header
		data, _ := ioutil.ReadAll(resp.Body)

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		assert.Equal(t, "application/json", h.Get("Content-Type"))
		assert.Equal(t, helpers.BuildCacheControlHeader(0), h.Get("Cache-Control"))
		assert.Equal(t, []byte("dataJSON"), data)
		hw.um.AssertExpectations(t)
	})
}

func TestInjectUserID(t *testing.T) {
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
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)

		hw := newHandlersWrapper()
		hw.h.InjectUserID(checkUserID(nil)).ServeHTTP(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)
	})

	t.Run("invalid session cookie provided", func(t *testing.T) {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r.AddCookie(&http.Cookie{
			Name:  sessionCookieName,
			Value: "invalidValue",
		})

		hw := newHandlersWrapper()
		hw.h.InjectUserID(checkUserID(nil)).ServeHTTP(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)
	})

	t.Run("error checking session", func(t *testing.T) {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)

		hw := newHandlersWrapper()
		encodedSessionID, _ := hw.h.sc.Encode(sessionCookieName, []byte("sessionID"))
		r.AddCookie(&http.Cookie{
			Name:  sessionCookieName,
			Value: encodedSessionID,
		})
		hw.um.On("CheckSession", r.Context(), mock.Anything, mock.Anything).
			Return(nil, tests.ErrFakeDatabaseFailure)
		hw.h.InjectUserID(checkUserID(nil)).ServeHTTP(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		hw.um.AssertExpectations(t)
	})

	t.Run("invalid session provided", func(t *testing.T) {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)

		hw := newHandlersWrapper()
		hw.um.On("CheckSession", r.Context(), mock.Anything, mock.Anything).
			Return(&hub.CheckSessionOutput{UserID: "", Valid: false}, nil)

		encodedSessionID, _ := hw.h.sc.Encode(sessionCookieName, []byte("sessionID"))
		r.AddCookie(&http.Cookie{
			Name:  sessionCookieName,
			Value: encodedSessionID,
		})
		hw.h.InjectUserID(checkUserID(nil)).ServeHTTP(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		hw.um.AssertExpectations(t)
	})

	t.Run("inject user id succeeded", func(t *testing.T) {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)

		hw := newHandlersWrapper()
		hw.um.On("CheckSession", r.Context(), mock.Anything, mock.Anything).
			Return(&hub.CheckSessionOutput{UserID: "userID", Valid: true}, nil)
		encodedSessionID, _ := hw.h.sc.Encode(sessionCookieName, []byte("sessionID"))
		r.AddCookie(&http.Cookie{
			Name:  sessionCookieName,
			Value: encodedSessionID,
		})
		hw.h.InjectUserID(checkUserID("userID")).ServeHTTP(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		hw.um.AssertExpectations(t)
	})
}

func TestLogin(t *testing.T) {
	t.Run("credentials not provided", func(t *testing.T) {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("POST", "/", nil)

		hw := newHandlersWrapper()
		hw.h.Login(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("error checking credentials", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.um.On("CheckCredentials", mock.Anything, mock.Anything, mock.Anything).
			Return(nil, tests.ErrFakeDatabaseFailure)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("POST", "/", strings.NewReader("email=email&password=pass"))
		r.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		hw.h.Login(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.um.AssertExpectations(t)
	})

	t.Run("invalid credentials provided", func(t *testing.T) {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("POST", "/", strings.NewReader("email=email&password=pass2"))
		r.Header.Set("Content-Type", "application/x-www-form-urlencoded")

		hw := newHandlersWrapper()
		hw.um.On("CheckCredentials", r.Context(), mock.Anything, mock.Anything).
			Return(&hub.CheckCredentialsOutput{Valid: false, UserID: ""}, nil)
		hw.h.Login(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
		hw.um.AssertExpectations(t)
	})

	t.Run("error registering session", func(t *testing.T) {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("POST", "/", strings.NewReader("email=email&password=pass"))
		r.Header.Set("Content-Type", "application/x-www-form-urlencoded")

		hw := newHandlersWrapper()
		hw.um.On("CheckCredentials", r.Context(), mock.Anything, mock.Anything).
			Return(&hub.CheckCredentialsOutput{Valid: true, UserID: "userID"}, nil)
		hw.um.On("RegisterSession", r.Context(), mock.Anything).
			Return(nil, tests.ErrFakeDatabaseFailure)
		hw.h.Login(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.um.AssertExpectations(t)
	})

	t.Run("login succeeded", func(t *testing.T) {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("POST", "/", strings.NewReader("email=email&password=pass"))
		r.Header.Set("Content-Type", "application/x-www-form-urlencoded")

		hw := newHandlersWrapper()
		hw.um.On("CheckCredentials", r.Context(), mock.Anything, mock.Anything).
			Return(&hub.CheckCredentialsOutput{Valid: true, UserID: "userID"}, nil)
		hw.um.On("RegisterSession", r.Context(), mock.Anything).
			Return([]byte("sessionID"), nil)
		hw.h.Login(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		require.Len(t, resp.Cookies(), 1)
		cookie := resp.Cookies()[0]
		assert.Equal(t, sessionCookieName, cookie.Name)
		assert.Equal(t, "/", cookie.Path)
		assert.True(t, cookie.HttpOnly)
		assert.False(t, cookie.Secure)
		var sessionID []byte
		err := hw.h.sc.Decode(sessionCookieName, cookie.Value, &sessionID)
		require.NoError(t, err)
		assert.Equal(t, []byte("sessionID"), sessionID)
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
				&http.Cookie{
					Name:  sessionCookieName,
					Value: "invalidValue",
				},
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("GET", "/", nil)
				if tc.cookie != nil {
					r.AddCookie(tc.cookie)
				}

				hw := newHandlersWrapper()
				hw.h.Logout(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, http.StatusOK, resp.StatusCode)
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
				tests.ErrFakeDatabaseFailure,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("GET", "/", nil)

				hw := newHandlersWrapper()
				hw.um.On("DeleteSession", r.Context(), mock.Anything).Return(tc.err)
				encodedSessionID, _ := hw.h.sc.Encode(sessionCookieName, []byte("sessionID"))
				r.AddCookie(&http.Cookie{
					Name:  sessionCookieName,
					Value: encodedSessionID,
				})
				hw.h.Logout(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, http.StatusOK, resp.StatusCode)
				require.Len(t, resp.Cookies(), 1)
				cookie := resp.Cookies()[0]
				assert.Equal(t, sessionCookieName, cookie.Name)
				assert.True(t, cookie.Expires.Before(time.Now().Add(-24*time.Hour)))
				hw.um.AssertExpectations(t)
			})
		}
	})
}

func TestRegisterUser(t *testing.T) {
	t.Run("no user provided", func(t *testing.T) {
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
				user.ErrInvalidInput,
			},
			{
				"missing email",
				`{"alias": "alias", "password": "password"}`,
				user.ErrInvalidInput,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("POST", "/", strings.NewReader(tc.userJSON))

				hw := newHandlersWrapper()
				if tc.umErr != nil {
					hw.um.On("RegisterUser", r.Context(), mock.Anything, mock.Anything).Return(tc.umErr)
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
		testCases := []struct {
			description        string
			umErr              error
			expectedStatusCode int
		}{
			{
				"registration succeeded",
				nil,
				http.StatusOK,
			},
			{
				"registration failed",
				tests.ErrFakeDatabaseFailure,
				http.StatusInternalServerError,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				w := httptest.NewRecorder()
				r, _ := http.NewRequest("POST", "/", strings.NewReader(userJSON))

				hw := newHandlersWrapper()
				hw.um.On("RegisterUser", r.Context(), mock.Anything, mock.Anything).Return(tc.umErr)
				hw.h.RegisterUser(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				hw.um.AssertExpectations(t)
			})
		}
	})
}

func TestRequireLogin(t *testing.T) {
	t.Run("session cookie not provided", func(t *testing.T) {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)

		hw := newHandlersWrapper()
		hw.h.RequireLogin(http.HandlerFunc(testsOK)).ServeHTTP(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	})

	t.Run("invalid session cookie provided", func(t *testing.T) {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r.AddCookie(&http.Cookie{
			Name:  sessionCookieName,
			Value: "invalidValue",
		})

		hw := newHandlersWrapper()
		hw.h.RequireLogin(http.HandlerFunc(testsOK)).ServeHTTP(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	})

	t.Run("error checking session", func(t *testing.T) {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)

		hw := newHandlersWrapper()
		hw.um.On("CheckSession", r.Context(), mock.Anything, mock.Anything).
			Return(nil, tests.ErrFakeDatabaseFailure)
		encodedSessionID, _ := hw.h.sc.Encode(sessionCookieName, []byte("sessionID"))
		r.AddCookie(&http.Cookie{
			Name:  sessionCookieName,
			Value: encodedSessionID,
		})
		hw.h.RequireLogin(http.HandlerFunc(testsOK)).ServeHTTP(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.um.AssertExpectations(t)
	})

	t.Run("invalid session provided", func(t *testing.T) {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)

		hw := newHandlersWrapper()
		hw.um.On("CheckSession", r.Context(), mock.Anything, mock.Anything).
			Return(&hub.CheckSessionOutput{UserID: "", Valid: false}, nil)
		encodedSessionID, _ := hw.h.sc.Encode(sessionCookieName, []byte("sessionID"))
		r.AddCookie(&http.Cookie{
			Name:  sessionCookieName,
			Value: encodedSessionID,
		})
		hw.h.RequireLogin(http.HandlerFunc(testsOK)).ServeHTTP(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
		hw.um.AssertExpectations(t)
	})

	t.Run("require login succeeded", func(t *testing.T) {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)

		hw := newHandlersWrapper()
		hw.um.On("CheckSession", r.Context(), mock.Anything, mock.Anything).
			Return(&hub.CheckSessionOutput{UserID: "userID", Valid: true}, nil)
		encodedSessionID, _ := hw.h.sc.Encode(sessionCookieName, []byte("sessionID"))
		r.AddCookie(&http.Cookie{
			Name:  sessionCookieName,
			Value: encodedSessionID,
		})
		hw.h.RequireLogin(http.HandlerFunc(testsOK)).ServeHTTP(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		hw.um.AssertExpectations(t)
	})
}

func TestUpdatePassword(t *testing.T) {
	t.Run("no old password provided", func(t *testing.T) {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("PUT", "/", strings.NewReader("new=new"))
		r.Header.Set("Content-Type", "application/x-www-form-urlencoded")

		hw := newHandlersWrapper()
		hw.um.On("UpdatePassword", r.Context(), mock.Anything, mock.Anything).
			Return(user.ErrInvalidInput)
		hw.h.UpdatePassword(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
		hw.um.AssertExpectations(t)
	})

	t.Run("no new password provided", func(t *testing.T) {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("PUT", "/", strings.NewReader("old=old"))
		r.Header.Set("Content-Type", "application/x-www-form-urlencoded")

		hw := newHandlersWrapper()
		hw.um.On("UpdatePassword", r.Context(), mock.Anything, mock.Anything).
			Return(user.ErrInvalidInput)
		hw.h.UpdatePassword(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
		hw.um.AssertExpectations(t)
	})

	t.Run("invalid old password provided", func(t *testing.T) {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("PUT", "/", strings.NewReader("old=invalid&new=new"))
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		r.Header.Set("Content-Type", "application/x-www-form-urlencoded")

		hw := newHandlersWrapper()
		hw.um.On("UpdatePassword", r.Context(), mock.Anything, mock.Anything).
			Return(user.ErrInvalidPassword)
		hw.h.UpdatePassword(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
		hw.um.AssertExpectations(t)
	})

	t.Run("error updating password", func(t *testing.T) {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("PUT", "/", strings.NewReader("old=old&new=new"))
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		r.Header.Set("Content-Type", "application/x-www-form-urlencoded")

		hw := newHandlersWrapper()
		hw.um.On("UpdatePassword", r.Context(), mock.Anything, mock.Anything).
			Return(tests.ErrFakeDatabaseFailure)
		hw.h.UpdatePassword(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.um.AssertExpectations(t)
	})

	t.Run("password updated successfully", func(t *testing.T) {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("PUT", "/", strings.NewReader("old=old&new=new"))
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		r.Header.Set("Content-Type", "application/x-www-form-urlencoded")

		hw := newHandlersWrapper()
		hw.um.On("UpdatePassword", r.Context(), mock.Anything, mock.Anything).Return(nil)
		hw.h.UpdatePassword(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		hw.um.AssertExpectations(t)
	})
}

func TestUpdateProfile(t *testing.T) {
	userJSON := `{"first_name": "firstname", "last_name": "lastname"}`

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
				user.ErrInvalidInput,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.desc, func(t *testing.T) {
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
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("PUT", "/", strings.NewReader(userJSON))
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

		hw := newHandlersWrapper()
		hw.um.On("UpdateProfile", r.Context(), mock.Anything).Return(tests.ErrFakeDatabaseFailure)
		hw.h.UpdateProfile(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.um.AssertExpectations(t)
	})

	t.Run("user profile updated successfully", func(t *testing.T) {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest("PUT", "/", strings.NewReader(userJSON))
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))

		hw := newHandlersWrapper()
		hw.um.On("UpdateProfile", r.Context(), mock.Anything).Return(nil)
		hw.h.UpdateProfile(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)
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
			[]interface{}{false, user.ErrInvalidInput},
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
			http.StatusOK,
		},
		{
			"database error",
			[]interface{}{false, tests.ErrFakeDatabaseFailure},
			http.StatusInternalServerError,
		},
	}
	for _, tc := range testCases {
		tc := tc
		t.Run(tc.description, func(t *testing.T) {
			w := httptest.NewRecorder()
			r, _ := http.NewRequest("POST", "/", strings.NewReader("code=1234"))
			r.Header.Set("Content-Type", "application/x-www-form-urlencoded")

			hw := newHandlersWrapper()
			hw.um.On("VerifyEmail", r.Context(), mock.Anything).Return(tc.response...)
			hw.h.VerifyEmail(w, r)
			resp := w.Result()
			defer resp.Body.Close()

			assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
			hw.um.AssertExpectations(t)
		})
	}
}

func testsOK(w http.ResponseWriter, r *http.Request) {}

type handlersWrapper struct {
	cfg *viper.Viper
	um  *user.ManagerMock
	h   *Handlers
}

func newHandlersWrapper() *handlersWrapper {
	cfg := viper.New()
	um := &user.ManagerMock{}

	return &handlersWrapper{
		cfg: cfg,
		um:  um,
		h:   NewHandlers(um, cfg),
	}
}
