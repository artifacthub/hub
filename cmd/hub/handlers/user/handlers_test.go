package user

import (
	"context"
	"io/ioutil"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/artifacthub/hub/internal/api"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/rs/zerolog"
	"github.com/spf13/viper"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
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

func TestGetAlias(t *testing.T) {
	dbQuery := "select get_user_profile($1::uuid)"

	t.Run("database query succeeded", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.db.On("QueryRow", dbQuery, mock.Anything).Return([]byte("dataJSON"), nil)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		hw.h.GetProfile(w, r)
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
		hw.h.GetProfile(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.db.AssertExpectations(t)
	})
}

func TestInjectUserID(t *testing.T) {
	dbQuery := `
	select user_id, floor(extract(epoch from created_at))
	from session where session_id = $1
	`

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
		hw := newHandlersWrapper()

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		hw.h.InjectUserID(checkUserID(nil)).ServeHTTP(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)
	})

	t.Run("invalid session cookie provided", func(t *testing.T) {
		hw := newHandlersWrapper()

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r.AddCookie(&http.Cookie{
			Name:  sessionCookieName,
			Value: "invalidValue",
		})
		hw.h.InjectUserID(checkUserID(nil)).ServeHTTP(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)
	})

	t.Run("error checking session", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.db.On("QueryRow", dbQuery, mock.Anything).Return(nil, tests.ErrFakeDatabaseFailure)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		encodedSessionID, _ := hw.h.sc.Encode(sessionCookieName, []byte("sessionID"))
		r.AddCookie(&http.Cookie{
			Name:  sessionCookieName,
			Value: encodedSessionID,
		})
		hw.h.InjectUserID(checkUserID(nil)).ServeHTTP(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		hw.db.AssertExpectations(t)
	})

	t.Run("invalid session provided", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.db.On("QueryRow", dbQuery, mock.Anything).Return([]interface{}{"userID", int64(1)}, nil)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		encodedSessionID, _ := hw.h.sc.Encode(sessionCookieName, []byte("sessionID"))
		r.AddCookie(&http.Cookie{
			Name:  sessionCookieName,
			Value: encodedSessionID,
		})
		hw.h.InjectUserID(checkUserID(nil)).ServeHTTP(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		hw.db.AssertExpectations(t)
	})

	t.Run("inject user id succeeded", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.db.On("QueryRow", dbQuery, mock.Anything).Return([]interface{}{
			"userID",
			time.Now().Unix(),
		}, nil)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		encodedSessionID, _ := hw.h.sc.Encode(sessionCookieName, []byte("sessionID"))
		r.AddCookie(&http.Cookie{
			Name:  sessionCookieName,
			Value: encodedSessionID,
		})
		hw.h.InjectUserID(checkUserID("userID")).ServeHTTP(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		hw.db.AssertExpectations(t)
	})
}

func TestLogin(t *testing.T) {
	dbQuery1 := `select user_id, password from "user" where email = $1`
	dbQuery2 := `select register_session($1::jsonb)`

	t.Run("credentials not provided", func(t *testing.T) {
		hw := newHandlersWrapper()

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("POST", "/", nil)
		hw.h.Login(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("error checking credentials", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.db.On("QueryRow", dbQuery1, mock.Anything).Return(nil, tests.ErrFakeDatabaseFailure)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("POST", "/", strings.NewReader("email=email&password=pass"))
		r.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		hw.h.Login(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.db.AssertExpectations(t)
	})

	t.Run("invalid credentials provided", func(t *testing.T) {
		hw := newHandlersWrapper()
		pw, _ := bcrypt.GenerateFromPassword([]byte("pass"), bcrypt.DefaultCost)
		hw.db.On("QueryRow", dbQuery1, mock.Anything).Return([]interface{}{"userID", string(pw)}, nil)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("POST", "/", strings.NewReader("email=email&password=pass2"))
		r.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		hw.h.Login(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
		hw.db.AssertExpectations(t)
	})

	t.Run("error registering session", func(t *testing.T) {
		hw := newHandlersWrapper()
		pw, _ := bcrypt.GenerateFromPassword([]byte("pass"), bcrypt.DefaultCost)
		hw.db.On("QueryRow", dbQuery1, mock.Anything).Return([]interface{}{"userID", string(pw)}, nil)
		hw.db.On("QueryRow", dbQuery2, mock.Anything).Return(nil, tests.ErrFakeDatabaseFailure)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("POST", "/", strings.NewReader("email=email&password=pass"))
		r.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		hw.h.Login(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.db.AssertExpectations(t)
	})

	t.Run("login succeeded", func(t *testing.T) {
		hw := newHandlersWrapper()
		pw, _ := bcrypt.GenerateFromPassword([]byte("pass"), bcrypt.DefaultCost)
		hw.db.On("QueryRow", dbQuery1, mock.Anything).Return([]interface{}{"userID", string(pw)}, nil)
		hw.db.On("QueryRow", dbQuery2, mock.Anything).Return([]byte("sessionID"), nil)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("POST", "/", strings.NewReader("email=email&password=pass"))
		r.Header.Set("Content-Type", "application/x-www-form-urlencoded")
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
		hw.db.AssertExpectations(t)
	})
}

func TestLogout(t *testing.T) {
	dbQuery := "delete from session where session_id = $1"

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
				hw := newHandlersWrapper()

				w := httptest.NewRecorder()
				r, _ := http.NewRequest("GET", "/", nil)
				if tc.cookie != nil {
					r.AddCookie(tc.cookie)
				}
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
			dbResponse  interface{}
		}{
			{
				"session deleted successfully from database",
				nil,
			},
			{
				"error deleting session from database",
				tests.ErrFakeDatabaseFailure,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				hw := newHandlersWrapper()
				hw.db.On("Exec", dbQuery, mock.Anything).Return(tc.dbResponse)

				w := httptest.NewRecorder()
				r, _ := http.NewRequest("GET", "/", nil)
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
				hw.db.AssertExpectations(t)
			})
		}
	})
}

func TestRegisterUser(t *testing.T) {
	dbQuery := "select register_user($1::jsonb)"

	t.Run("no user provided", func(t *testing.T) {
		hw := newHandlersWrapper()

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("POST", "/", strings.NewReader(""))
		hw.h.RegisterUser(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("invalid user provided", func(t *testing.T) {
		testCases := []struct {
			description string
			userJSON    string
		}{
			{
				"invalid json",
				"-",
			},
			{
				"missing alias",
				`{"email": "email", "password": "password"}`,
			},
			{
				"missing email",
				`{"alias": "alias", "password": "password"}`,
			},
			{
				"missing password",
				`{"alias": "alias", "email": "email"}`,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				hw := newHandlersWrapper()

				w := httptest.NewRecorder()
				r, _ := http.NewRequest("POST", "/", strings.NewReader(tc.userJSON))
				hw.h.RegisterUser(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
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
			dbResponse         []interface{}
			expectedStatusCode int
		}{
			{
				"registration succeeded",
				[]interface{}{"", nil},
				http.StatusOK,
			},
			{
				"database error",
				[]interface{}{"", tests.ErrFakeDatabaseFailure},
				http.StatusInternalServerError,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				hw := newHandlersWrapper()
				hw.db.On("QueryRow", dbQuery, mock.Anything).Return(tc.dbResponse...)
				hw.es.On("SendEmail", mock.Anything).Return(nil)

				w := httptest.NewRecorder()
				r, _ := http.NewRequest("POST", "/", strings.NewReader(userJSON))
				hw.h.RegisterUser(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				hw.db.AssertExpectations(t)
			})
		}
	})
}

func TestRequireLogin(t *testing.T) {
	dbQuery := `
	select user_id, floor(extract(epoch from created_at))
	from session where session_id = $1
	`

	t.Run("session cookie not provided", func(t *testing.T) {
		hw := newHandlersWrapper()

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		hw.h.RequireLogin(http.HandlerFunc(testsOK)).ServeHTTP(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	})

	t.Run("invalid session cookie provided", func(t *testing.T) {
		hw := newHandlersWrapper()

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		r.AddCookie(&http.Cookie{
			Name:  sessionCookieName,
			Value: "invalidValue",
		})
		hw.h.RequireLogin(http.HandlerFunc(testsOK)).ServeHTTP(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	})

	t.Run("error checking session", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.db.On("QueryRow", dbQuery, mock.Anything).Return(nil, tests.ErrFakeDatabaseFailure)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		encodedSessionID, _ := hw.h.sc.Encode(sessionCookieName, []byte("sessionID"))
		r.AddCookie(&http.Cookie{
			Name:  sessionCookieName,
			Value: encodedSessionID,
		})
		hw.h.RequireLogin(http.HandlerFunc(testsOK)).ServeHTTP(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.db.AssertExpectations(t)
	})

	t.Run("invalid session provided", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.db.On("QueryRow", dbQuery, mock.Anything).Return([]interface{}{"userID", int64(1)}, nil)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		encodedSessionID, _ := hw.h.sc.Encode(sessionCookieName, []byte("sessionID"))
		r.AddCookie(&http.Cookie{
			Name:  sessionCookieName,
			Value: encodedSessionID,
		})
		hw.h.RequireLogin(http.HandlerFunc(testsOK)).ServeHTTP(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
		hw.db.AssertExpectations(t)
	})

	t.Run("require login succeeded", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.db.On("QueryRow", dbQuery, mock.Anything).Return([]interface{}{
			"userID",
			time.Now().Unix(),
		}, nil)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("GET", "/", nil)
		encodedSessionID, _ := hw.h.sc.Encode(sessionCookieName, []byte("sessionID"))
		r.AddCookie(&http.Cookie{
			Name:  sessionCookieName,
			Value: encodedSessionID,
		})
		hw.h.RequireLogin(http.HandlerFunc(testsOK)).ServeHTTP(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		hw.db.AssertExpectations(t)
	})
}

func TestUpdatePassword(t *testing.T) {
	getPasswordDBQuery := `select password from "user" where user_id = $1`
	updatePasswordDBQuery := "select update_user_password($1::uuid, $2::text, $3::text)"
	oldHashed, _ := bcrypt.GenerateFromPassword([]byte("old"), bcrypt.DefaultCost)

	t.Run("no old password provided", func(t *testing.T) {
		hw := newHandlersWrapper()

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("PUT", "/", strings.NewReader("new=new"))
		r.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		hw.h.UpdatePassword(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("no new password provided", func(t *testing.T) {
		hw := newHandlersWrapper()

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("PUT", "/", strings.NewReader("old=old"))
		r.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		hw.h.UpdatePassword(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("invalid old password provided", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.db.On("QueryRow", getPasswordDBQuery, mock.Anything).Return(string(oldHashed), nil)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("PUT", "/", strings.NewReader("old=invalid&new=new"))
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		r.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		hw.h.UpdatePassword(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
		hw.db.AssertExpectations(t)
	})

	t.Run("database error updating password", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.db.On("QueryRow", getPasswordDBQuery, mock.Anything).Return(string(oldHashed), nil)
		hw.db.On("Exec", updatePasswordDBQuery, mock.Anything, mock.Anything, mock.Anything).
			Return(tests.ErrFakeDatabaseFailure)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("PUT", "/", strings.NewReader("old=old&new=new"))
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		r.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		hw.h.UpdatePassword(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.db.AssertExpectations(t)
	})

	t.Run("password updated successfully", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.db.On("QueryRow", getPasswordDBQuery, mock.Anything).Return(string(oldHashed), nil)
		hw.db.On("Exec", updatePasswordDBQuery, mock.Anything, mock.Anything, mock.Anything).Return(nil)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("PUT", "/", strings.NewReader("old=old&new=new"))
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		r.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		hw.h.UpdatePassword(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		hw.db.AssertExpectations(t)
	})
}

func TestUpdateProfile(t *testing.T) {
	dbQuery := "select update_user_profile($1::uuid, $2::jsonb)"
	userJSON := `{"first_name": "firstname", "last_name": "lastname"}`

	t.Run("no user provided", func(t *testing.T) {
		hw := newHandlersWrapper()

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("PUT", "/", strings.NewReader(""))
		hw.h.UpdateProfile(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("invalid user provided", func(t *testing.T) {
		hw := newHandlersWrapper()

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("PUT", "/", strings.NewReader("{invalid json"))
		hw.h.UpdateProfile(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("database error", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.db.On("Exec", dbQuery, mock.Anything, mock.Anything).Return(tests.ErrFakeDatabaseFailure)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("PUT", "/", strings.NewReader(userJSON))
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		hw.h.UpdateProfile(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
		hw.db.AssertExpectations(t)
	})

	t.Run("user profile updated successfully", func(t *testing.T) {
		hw := newHandlersWrapper()
		hw.db.On("Exec", dbQuery, mock.Anything, mock.Anything).Return(nil)

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("PUT", "/", strings.NewReader(userJSON))
		r = r.WithContext(context.WithValue(r.Context(), hub.UserIDKey, "userID"))
		hw.h.UpdateProfile(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		hw.db.AssertExpectations(t)
	})
}

func TestVerifyEmail(t *testing.T) {
	dbQuery := "select verify_email($1::uuid)"

	t.Run("no code provided", func(t *testing.T) {
		hw := newHandlersWrapper()

		w := httptest.NewRecorder()
		r, _ := http.NewRequest("POST", "/", nil)
		hw.h.VerifyEmail(w, r)
		resp := w.Result()
		defer resp.Body.Close()

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("code provided", func(t *testing.T) {
		testCases := []struct {
			description        string
			dbResponse         []interface{}
			expectedStatusCode int
		}{
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
				hw := newHandlersWrapper()
				hw.db.On("QueryRow", dbQuery, mock.Anything).Return(tc.dbResponse...)

				w := httptest.NewRecorder()
				r, _ := http.NewRequest("POST", "/", strings.NewReader("code=1234"))
				r.Header.Set("Content-Type", "application/x-www-form-urlencoded")
				hw.h.VerifyEmail(w, r)
				resp := w.Result()
				defer resp.Body.Close()

				assert.Equal(t, tc.expectedStatusCode, resp.StatusCode)
				hw.db.AssertExpectations(t)
			})
		}
	})
}

func testsOK(w http.ResponseWriter, r *http.Request) {}

type handlersWrapper struct {
	cfg *viper.Viper
	db  *tests.DBMock
	es  *tests.EmailSenderMock
	h   *Handlers
}

func newHandlersWrapper() *handlersWrapper {
	cfg := viper.New()
	db := &tests.DBMock{}
	es := &tests.EmailSenderMock{}
	hubAPI := api.New(db, es)

	return &handlersWrapper{
		cfg: cfg,
		db:  db,
		es:  es,
		h:   NewHandlers(hubAPI, cfg),
	}
}
