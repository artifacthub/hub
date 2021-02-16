package user

import (
	"context"
	"errors"
	"fmt"
	"testing"
	"time"

	"github.com/artifacthub/hub/internal/email"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/jackc/pgx/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"golang.org/x/crypto/bcrypt"
)

func TestCheckAPIKey(t *testing.T) {
	ctx := context.Background()

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg string
			key    []byte
		}{
			{
				"key not provided",
				nil,
			},
			{
				"key not provided",
				[]byte(""),
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				t.Parallel()
				m := NewManager(nil, nil)
				_, err := m.CheckAPIKey(ctx, tc.key)
				assert.True(t, errors.Is(err, hub.ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	t.Run("key not found in database", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getAPIKeyUserIDDBQ, []byte("key")).Return(nil, pgx.ErrNoRows)
		m := NewManager(db, nil)

		output, err := m.CheckAPIKey(ctx, []byte("key"))
		assert.NoError(t, err)
		assert.False(t, output.Valid)
		assert.Empty(t, output.UserID)
		db.AssertExpectations(t)
	})

	t.Run("error getting key from database", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getAPIKeyUserIDDBQ, []byte("key")).Return(nil, tests.ErrFakeDB)
		m := NewManager(db, nil)

		output, err := m.CheckAPIKey(ctx, []byte("key"))
		assert.Equal(t, tests.ErrFakeDB, err)
		assert.Nil(t, output)
		db.AssertExpectations(t)
	})

	t.Run("valid key", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getAPIKeyUserIDDBQ, []byte("key")).Return("userID", nil)
		m := NewManager(db, nil)

		output, err := m.CheckAPIKey(ctx, []byte("key"))
		assert.NoError(t, err)
		assert.True(t, output.Valid)
		assert.Equal(t, "userID", output.UserID)
		db.AssertExpectations(t)
	})
}

func TestCheckAvailability(t *testing.T) {
	ctx := context.Background()

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg       string
			resourceKind string
			value        string
		}{
			{
				"invalid resource kind",
				"invalid",
				"value",
			},
			{
				"invalid value",
				"userAlias",
				"",
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				t.Parallel()
				m := NewManager(nil, nil)
				_, err := m.CheckAvailability(ctx, tc.resourceKind, tc.value)
				assert.True(t, errors.Is(err, hub.ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	t.Run("database query succeeded", func(t *testing.T) {
		testCases := []struct {
			resourceKind string
			dbQuery      string
			available    bool
		}{
			{
				"userAlias",
				checkUserAliasAvailDBQ,
				true,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(fmt.Sprintf("resource kind: %s", tc.resourceKind), func(t *testing.T) {
				t.Parallel()
				tc.dbQuery = fmt.Sprintf("select not exists (%s)", tc.dbQuery)
				db := &tests.DBMock{}
				db.On("QueryRow", ctx, tc.dbQuery, "value").Return(tc.available, nil)
				m := NewManager(db, nil)

				available, err := m.CheckAvailability(ctx, tc.resourceKind, "value")
				assert.NoError(t, err)
				assert.Equal(t, tc.available, available)
				db.AssertExpectations(t)
			})
		}
	})

	t.Run("database error", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		dbQuery := fmt.Sprintf(`select not exists (%s)`, checkUserAliasAvailDBQ)
		db.On("QueryRow", ctx, dbQuery, "value").Return(false, tests.ErrFakeDB)
		m := NewManager(db, nil)

		available, err := m.CheckAvailability(ctx, "userAlias", "value")
		assert.Equal(t, tests.ErrFakeDB, err)
		assert.False(t, available)
		db.AssertExpectations(t)
	})
}

func TestCheckCredentials(t *testing.T) {
	ctx := context.Background()

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg   string
			email    string
			password string
		}{
			{
				"email not provided",
				"",
				"password",
			},
			{
				"password not provided",
				"email",
				"",
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				t.Parallel()
				m := NewManager(nil, nil)
				_, err := m.CheckCredentials(ctx, tc.email, tc.password)
				assert.True(t, errors.Is(err, hub.ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	t.Run("credentials provided not found in database", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, checkUserCredsDBQ, "email").Return(nil, pgx.ErrNoRows)
		m := NewManager(db, nil)

		output, err := m.CheckCredentials(ctx, "email", "pass")
		assert.NoError(t, err)
		assert.False(t, output.Valid)
		assert.Empty(t, output.UserID)
		db.AssertExpectations(t)
	})

	t.Run("error getting credentials from database", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, checkUserCredsDBQ, "email").Return(nil, tests.ErrFakeDB)
		m := NewManager(db, nil)

		output, err := m.CheckCredentials(ctx, "email", "pass")
		assert.Equal(t, tests.ErrFakeDB, err)
		assert.Nil(t, output)
		db.AssertExpectations(t)
	})

	t.Run("invalid credentials provided", func(t *testing.T) {
		t.Parallel()
		pw, _ := bcrypt.GenerateFromPassword([]byte("pass"), bcrypt.DefaultCost)
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, checkUserCredsDBQ, "email").Return([]interface{}{"userID", string(pw)}, nil)
		m := NewManager(db, nil)

		output, err := m.CheckCredentials(ctx, "email", "pass2")
		assert.NoError(t, err)
		assert.False(t, output.Valid)
		assert.Empty(t, output.UserID)
		db.AssertExpectations(t)
	})

	t.Run("valid credentials provided", func(t *testing.T) {
		t.Parallel()
		pw, _ := bcrypt.GenerateFromPassword([]byte("pass"), bcrypt.DefaultCost)
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, checkUserCredsDBQ, "email").Return([]interface{}{"userID", string(pw)}, nil)
		m := NewManager(db, nil)

		output, err := m.CheckCredentials(ctx, "email", "pass")
		assert.NoError(t, err)
		assert.True(t, output.Valid)
		assert.Equal(t, "userID", output.UserID)
		db.AssertExpectations(t)
	})
}

func TestCheckSession(t *testing.T) {
	ctx := context.Background()

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg    string
			sessionID []byte
			duration  time.Duration
		}{
			{
				"session id not provided",
				nil,
				10,
			},
			{
				"session id not provided",
				[]byte(""),
				10,
			},
			{
				"duration not provided",
				[]byte("sessionID"),
				0,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				t.Parallel()
				m := NewManager(nil, nil)
				_, err := m.CheckSession(ctx, tc.sessionID, tc.duration)
				assert.True(t, errors.Is(err, hub.ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	t.Run("session not found in database", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getSessionDBQ, []byte("sessionID")).Return(nil, pgx.ErrNoRows)
		m := NewManager(db, nil)

		output, err := m.CheckSession(ctx, []byte("sessionID"), 1*time.Hour)
		assert.NoError(t, err)
		assert.False(t, output.Valid)
		assert.Empty(t, output.UserID)
		db.AssertExpectations(t)
	})

	t.Run("error getting session from database", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getSessionDBQ, []byte("sessionID")).Return(nil, tests.ErrFakeDB)
		m := NewManager(db, nil)

		output, err := m.CheckSession(ctx, []byte("sessionID"), 1*time.Hour)
		assert.Equal(t, tests.ErrFakeDB, err)
		assert.Nil(t, output)
		db.AssertExpectations(t)
	})

	t.Run("session has expired", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getSessionDBQ, []byte("sessionID")).Return([]interface{}{"userID", int64(1)}, nil)
		m := NewManager(db, nil)

		output, err := m.CheckSession(ctx, []byte("sessionID"), 1*time.Hour)
		assert.NoError(t, err)
		assert.False(t, output.Valid)
		assert.Empty(t, output.UserID)
		db.AssertExpectations(t)
	})

	t.Run("valid session", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getSessionDBQ, []byte("sessionID")).Return([]interface{}{
			"userID",
			time.Now().Unix(),
		}, nil)
		m := NewManager(db, nil)

		output, err := m.CheckSession(ctx, []byte("sessionID"), 1*time.Hour)
		assert.NoError(t, err)
		assert.True(t, output.Valid)
		assert.Equal(t, "userID", output.UserID)
		db.AssertExpectations(t)
	})
}

func TestDeleteSession(t *testing.T) {
	ctx := context.Background()

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg    string
			sessionID []byte
			duration  time.Duration
		}{
			{
				"session id not provided",
				nil,
				10,
			},
			{
				"session id not provided",
				[]byte(""),
				10,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				t.Parallel()
				m := NewManager(nil, nil)
				err := m.DeleteSession(ctx, tc.sessionID)
				assert.True(t, errors.Is(err, hub.ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	t.Run("valid input", func(t *testing.T) {
		testCases := []struct {
			description string
			dbResponse  interface{}
		}{
			{
				"session deleted successfully",
				nil,
			},
			{
				"error deleting session from database",
				tests.ErrFakeDB,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				t.Parallel()
				db := &tests.DBMock{}
				db.On("Exec", ctx, deleteSessionDBQ, []byte("sessionID")).Return(tc.dbResponse)
				m := NewManager(db, nil)

				err := m.DeleteSession(ctx, []byte("sessionID"))
				assert.Equal(t, tc.dbResponse, err)
				db.AssertExpectations(t)
			})
		}
	})
}

func TestGetProfile(t *testing.T) {
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		t.Parallel()
		m := NewManager(nil, nil)
		assert.Panics(t, func() {
			_, _ = m.GetProfile(context.Background())
		})
	})

	t.Run("database error", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getUserProfileDBQ, "userID").Return(nil, tests.ErrFakeDB)
		m := NewManager(db, nil)

		profile, err := m.GetProfile(ctx)
		assert.Equal(t, tests.ErrFakeDB, err)
		assert.Nil(t, profile)
		db.AssertExpectations(t)
	})

	t.Run("database query succeeded", func(t *testing.T) {
		t.Parallel()
		expectedProfile := &hub.User{
			Alias:          "alias",
			FirstName:      "first_name",
			LastName:       "last_name",
			Email:          "email",
			ProfileImageID: "profile_image_id",
		}

		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getUserProfileDBQ, "userID").Return([]byte(`
		{
			"alias": "alias",
			"first_name": "first_name",
			"last_name": "last_name",
			"email": "email",
			"profile_image_id": "profile_image_id"
		}
		`), nil)
		m := NewManager(db, nil)

		profile, err := m.GetProfile(ctx)
		assert.NoError(t, err)
		assert.Equal(t, expectedProfile, profile)
		db.AssertExpectations(t)
	})
}

func TestGetProfileJSON(t *testing.T) {
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		t.Parallel()
		m := NewManager(nil, nil)
		assert.Panics(t, func() {
			_, _ = m.GetProfileJSON(context.Background())
		})
	})

	t.Run("database query succeeded", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getUserProfileDBQ, "userID").Return([]byte("dataJSON"), nil)
		m := NewManager(db, nil)

		data, err := m.GetProfileJSON(ctx)
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), data)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getUserProfileDBQ, "userID").Return(nil, tests.ErrFakeDB)
		m := NewManager(db, nil)

		data, err := m.GetProfileJSON(ctx)
		assert.Equal(t, tests.ErrFakeDB, err)
		assert.Nil(t, data)
		db.AssertExpectations(t)
	})
}

func TestGetUserID(t *testing.T) {
	ctx := context.Background()

	t.Run("invalid input", func(t *testing.T) {
		t.Parallel()
		m := NewManager(nil, nil)
		_, err := m.GetUserID(ctx, "")
		assert.True(t, errors.Is(err, hub.ErrInvalidInput))
	})

	t.Run("database query succeeded", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getUserIDDBQ, "email").Return("userID", nil)
		m := NewManager(db, nil)

		userID, err := m.GetUserID(ctx, "email")
		assert.NoError(t, err)
		assert.Equal(t, "userID", userID)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getUserIDDBQ, "email").Return("", tests.ErrFakeDB)
		m := NewManager(db, nil)

		userID, err := m.GetUserID(ctx, "email")
		assert.Equal(t, tests.ErrFakeDB, err)
		assert.Empty(t, userID)
		db.AssertExpectations(t)
	})
}

func TestRegisterSession(t *testing.T) {
	ctx := context.Background()

	s := &hub.Session{
		UserID:    "00000000-0000-0000-0000-000000000001",
		IP:        "192.168.1.100",
		UserAgent: "Safari 13.0.5",
	}

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg string
			userID string
		}{
			{
				"user id not provided",
				"",
			},
			{
				"invalid user id",
				"invalid",
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				t.Parallel()
				m := NewManager(nil, nil)
				s := &hub.Session{UserID: tc.userID}
				_, err := m.RegisterSession(ctx, s)
				assert.True(t, errors.Is(err, hub.ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	t.Run("successful session registration", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, registerSessionDBQ, mock.Anything).Return([]byte("sessionID"), nil)
		m := NewManager(db, nil)

		sessionID, err := m.RegisterSession(ctx, s)
		assert.NoError(t, err)
		assert.Equal(t, []byte("sessionID"), sessionID)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, registerSessionDBQ, mock.Anything).Return(nil, tests.ErrFakeDB)
		m := NewManager(db, nil)

		sessionID, err := m.RegisterSession(ctx, s)
		assert.Equal(t, tests.ErrFakeDB, err)
		assert.Nil(t, sessionID)
		db.AssertExpectations(t)
	})
}

func TestRegisterPasswordResetCode(t *testing.T) {
	ctx := context.Background()

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg    string
			userEmail string
			baseURL   string
		}{
			{
				"email not provided",
				"",
				"http://baseurl.com",
			},
			{
				"invalid base url",
				"email@email.com",
				"invalid",
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				t.Parallel()
				es := &email.SenderMock{}
				m := NewManager(nil, es)

				err := m.RegisterPasswordResetCode(ctx, tc.userEmail, tc.baseURL)
				assert.True(t, errors.Is(err, hub.ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	t.Run("successful password reset code registration in database", func(t *testing.T) {
		code := "passwordResetCode"
		testCases := []struct {
			description         string
			emailSenderResponse error
		}{
			{
				"password reset code sent successfully",
				nil,
			},
			{
				"error sending password reset code",
				email.ErrFakeSenderFailure,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				t.Parallel()
				db := &tests.DBMock{}
				db.On("QueryRow", ctx, registerPasswordResetCodeDBQ, "email@email.com").Return(&code, nil)
				es := &email.SenderMock{}
				es.On("SendEmail", mock.Anything).Return(tc.emailSenderResponse)
				m := NewManager(db, es)

				err := m.RegisterPasswordResetCode(ctx, "email@email.com", "http://baseurl.com")
				assert.Equal(t, tc.emailSenderResponse, err)
				db.AssertExpectations(t)
				es.AssertExpectations(t)
			})
		}
	})

	t.Run("database error registering password reset code", func(t *testing.T) {
		t.Parallel()
		code := ""
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, registerPasswordResetCodeDBQ, "email@email.com").Return(&code, tests.ErrFakeDB)
		m := NewManager(db, nil)

		err := m.RegisterPasswordResetCode(ctx, "email@email.com", "http://baseurl.com")
		assert.Equal(t, tests.ErrFakeDB, err)
		db.AssertExpectations(t)
	})
}

func TestRegisterUser(t *testing.T) {
	ctx := context.Background()

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg  string
			user    *hub.User
			baseURL string
		}{
			{
				"alias not provided",
				&hub.User{},
				"http://baseurl.com",
			},
			{
				"email not provided",
				&hub.User{Alias: "user1"},
				"http://baseurl.com",
			},
			{
				"invalid base url",
				&hub.User{Alias: "user1", Email: "email"},
				"invalid",
			},
			{
				"invalid profile image id",
				&hub.User{Alias: "user1", Email: "email", ProfileImageID: "invalid"},
				"http://baseurl.com",
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				t.Parallel()
				es := &email.SenderMock{}
				m := NewManager(nil, es)

				err := m.RegisterUser(ctx, tc.user, tc.baseURL)
				assert.True(t, errors.Is(err, hub.ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	t.Run("successful user registration in database", func(t *testing.T) {
		code := "emailVerificationCode"
		testCases := []struct {
			description         string
			emailSenderResponse error
		}{
			{
				"email verification code sent successfully",
				nil,
			},
			{
				"error sending email verification code",
				email.ErrFakeSenderFailure,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				t.Parallel()
				db := &tests.DBMock{}
				db.On("QueryRow", ctx, registerUserDBQ, mock.Anything).Return(&code, nil)
				es := &email.SenderMock{}
				es.On("SendEmail", mock.Anything).Return(tc.emailSenderResponse)
				m := NewManager(db, es)

				u := &hub.User{
					Alias:          "alias",
					FirstName:      "first_name",
					LastName:       "last_name",
					Email:          "email@email.com",
					Password:       "password",
					ProfileImageID: "00000000-0000-0000-0000-000000000001",
				}
				err := m.RegisterUser(ctx, u, "http://baseurl.com")
				assert.Equal(t, tc.emailSenderResponse, err)
				assert.NoError(t, bcrypt.CompareHashAndPassword([]byte(u.Password), []byte("password")))
				db.AssertExpectations(t)
				es.AssertExpectations(t)
			})
		}
	})

	t.Run("database error registering user", func(t *testing.T) {
		t.Parallel()
		code := ""
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, registerUserDBQ, mock.Anything).Return(&code, tests.ErrFakeDB)
		m := NewManager(db, nil)

		u := &hub.User{
			Alias: "alias",
			Email: "email@email.com",
		}
		err := m.RegisterUser(ctx, u, "http://baseurl.com")
		assert.Equal(t, tests.ErrFakeDB, err)
		db.AssertExpectations(t)
	})
}

func TestResetPassword(t *testing.T) {
	ctx := context.Background()

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg      string
			code        string
			newPassword string
			baseURL     string
		}{
			{
				"code not provided",
				"",
				"newPassword",
				"http://baseurl.com",
			},
			{
				"new password not provided",
				"code",
				"",
				"http://baseurl.com",
			},
			{
				"invalid base url",
				"code",
				"newPassword",
				"invalid",
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				t.Parallel()
				es := &email.SenderMock{}
				m := NewManager(nil, es)
				err := m.ResetPassword(ctx, tc.code, tc.newPassword, tc.baseURL)
				assert.True(t, errors.Is(err, hub.ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	t.Run("database error resetting password", func(t *testing.T) {
		testCases := []struct {
			dbErr       error
			expectedErr error
		}{
			{
				tests.ErrFake,
				tests.ErrFake,
			},
			{
				errInvalidPasswordResetCodeDB,
				ErrInvalidPasswordResetCode,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.dbErr.Error(), func(t *testing.T) {
				t.Parallel()
				db := &tests.DBMock{}
				db.On("QueryRow", ctx, resetUserPasswordDBQ, "code", mock.Anything).Return("", tc.dbErr)
				m := NewManager(db, nil)

				err := m.ResetPassword(ctx, "code", "newPassword", "http://baseurl.com")
				assert.Equal(t, tc.expectedErr, err)
				db.AssertExpectations(t)
			})
		}
	})

	t.Run("successful password reset in database", func(t *testing.T) {
		testCases := []struct {
			description         string
			emailSenderResponse error
		}{
			{
				"password reset success email sent successfully",
				nil,
			},
			{
				"error sending password reset success email",
				email.ErrFakeSenderFailure,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				t.Parallel()
				db := &tests.DBMock{}
				db.On("QueryRow", ctx, resetUserPasswordDBQ, "code", mock.Anything).Return("email", nil)
				es := &email.SenderMock{}
				es.On("SendEmail", mock.Anything).Return(tc.emailSenderResponse)
				m := NewManager(db, es)

				err := m.ResetPassword(ctx, "code", "newPassword", "http://baseurl.com")
				assert.Equal(t, tc.emailSenderResponse, err)
				db.AssertExpectations(t)
				es.AssertExpectations(t)
			})
		}
	})
}

func TestUpdatePassword(t *testing.T) {
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")
	oldHashed, _ := bcrypt.GenerateFromPassword([]byte("old"), bcrypt.DefaultCost)

	t.Run("user id not found in ctx", func(t *testing.T) {
		t.Parallel()
		m := NewManager(nil, nil)
		assert.Panics(t, func() {
			_ = m.UpdatePassword(context.Background(), "old", "new")
		})
	})

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg string
			old    string
			new    string
		}{
			{
				"old password not provided",
				"",
				"new",
			},
			{
				"new password not provided",
				"old",
				"",
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				t.Parallel()
				m := NewManager(nil, nil)
				err := m.UpdatePassword(ctx, tc.old, tc.new)
				assert.True(t, errors.Is(err, hub.ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	t.Run("database error getting user password", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getUserPasswordDBQ, "userID").Return("", tests.ErrFakeDB)
		m := NewManager(db, nil)

		err := m.UpdatePassword(ctx, "old", "new")
		assert.Equal(t, tests.ErrFakeDB, err)
		db.AssertExpectations(t)
	})

	t.Run("invalid user password provided", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getUserPasswordDBQ, "userID").Return(string(oldHashed), nil)
		m := NewManager(db, nil)

		err := m.UpdatePassword(ctx, "old2", "new")
		assert.Error(t, err)
		db.AssertExpectations(t)
	})

	t.Run("database error updating password", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getUserPasswordDBQ, "userID").Return(string(oldHashed), nil)
		db.On("Exec", ctx, updateUserPasswordDBQ, "userID", mock.Anything, mock.Anything).
			Return(tests.ErrFakeDB)
		m := NewManager(db, nil)

		err := m.UpdatePassword(ctx, "old", "new")
		assert.Equal(t, tests.ErrFakeDB, err)
		db.AssertExpectations(t)
	})

	t.Run("successful password update", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getUserPasswordDBQ, "userID").Return(string(oldHashed), nil)
		db.On("Exec", ctx, updateUserPasswordDBQ, "userID", mock.Anything, mock.Anything).Return(nil)
		m := NewManager(db, nil)

		err := m.UpdatePassword(ctx, "old", "new")
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})
}

func TestUpdateProfile(t *testing.T) {
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		t.Parallel()
		m := NewManager(nil, nil)
		assert.Panics(t, func() {
			_ = m.UpdateProfile(context.Background(), &hub.User{})
		})
	})

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg string
			user   *hub.User
		}{
			{
				"alias not provided",
				&hub.User{},
			},
			{
				"invalid profile image id",
				&hub.User{Alias: "user1", Email: "email", ProfileImageID: "invalid"},
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				t.Parallel()
				m := NewManager(nil, nil)
				err := m.UpdateProfile(ctx, tc.user)
				assert.True(t, errors.Is(err, hub.ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	t.Run("database query succeeded", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("Exec", ctx, updateUserProfileDBQ, "userID", mock.Anything).Return(nil)
		m := NewManager(db, nil)

		err := m.UpdateProfile(ctx, &hub.User{Alias: "user1"})
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("Exec", ctx, updateUserProfileDBQ, "userID", mock.Anything).Return(tests.ErrFakeDB)
		m := NewManager(db, nil)

		err := m.UpdateProfile(ctx, &hub.User{Alias: "user1"})
		assert.Equal(t, tests.ErrFakeDB, err)
		db.AssertExpectations(t)
	})
}

func TestVerifyEmail(t *testing.T) {
	ctx := context.Background()

	t.Run("invalid input", func(t *testing.T) {
		t.Parallel()
		m := NewManager(nil, nil)
		_, err := m.VerifyEmail(ctx, "")
		assert.True(t, errors.Is(err, hub.ErrInvalidInput))
	})

	t.Run("successful email verification", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, verifyEmailDBQ, "emailVerificationCode").Return(true, nil)
		m := NewManager(db, nil)

		verified, err := m.VerifyEmail(ctx, "emailVerificationCode")
		assert.NoError(t, err)
		assert.True(t, verified)
		db.AssertExpectations(t)
	})

	t.Run("database error verifying email", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, verifyEmailDBQ, "emailVerificationCode").Return(false, tests.ErrFakeDB)
		m := NewManager(db, nil)

		verified, err := m.VerifyEmail(ctx, "emailVerificationCode")
		assert.Equal(t, tests.ErrFakeDB, err)
		assert.False(t, verified)
		db.AssertExpectations(t)
	})
}

func TestVerifyPasswordResetCode(t *testing.T) {
	ctx := context.Background()

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg string
			code   string
		}{
			{
				"code not provided",
				"",
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				t.Parallel()
				m := NewManager(nil, nil)
				err := m.VerifyPasswordResetCode(ctx, tc.code)
				assert.True(t, errors.Is(err, hub.ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	t.Run("database error verifying password reset code", func(t *testing.T) {
		testCases := []struct {
			dbErr       error
			expectedErr error
		}{
			{
				tests.ErrFake,
				tests.ErrFake,
			},
			{
				errInvalidPasswordResetCodeDB,
				ErrInvalidPasswordResetCode,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.dbErr.Error(), func(t *testing.T) {
				t.Parallel()
				db := &tests.DBMock{}
				db.On("Exec", ctx, verifyPasswordResetCodeDBQ, "code").Return(tc.dbErr)
				m := NewManager(db, nil)

				err := m.VerifyPasswordResetCode(ctx, "code")
				assert.Equal(t, tc.expectedErr, err)
				db.AssertExpectations(t)
			})
		}
	})

	t.Run("password code verified successfully in database", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("Exec", ctx, verifyPasswordResetCodeDBQ, "code").Return(nil)
		m := NewManager(db, nil)

		err := m.VerifyPasswordResetCode(ctx, "code")
		assert.Equal(t, nil, err)
		db.AssertExpectations(t)
	})
}
