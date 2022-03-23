package user

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"testing"
	"time"

	"github.com/artifacthub/hub/internal/email"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/jackc/pgx/v4"
	"github.com/pquerna/otp/totp"
	"github.com/satori/uuid"
	"github.com/spf13/viper"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
)

var cfg *viper.Viper

func init() {
	cfg = viper.New()
	cfg.Set("theme.siteName", "Artifact Hub")
}

func TestApproveSession(t *testing.T) {
	ctx := context.Background()
	sessionID := "sessionID"
	hashedSessionID := hash(sessionID)
	opts := totp.GenerateOpts{
		Issuer:      "Artifact Hub",
		AccountName: "test@email.com",
	}
	key, _ := totp.Generate(opts)
	code1 := "code1"
	tfaConfig := &hub.TFAConfig{
		Enabled:       true,
		URL:           key.URL(),
		RecoveryCodes: []string{code1},
	}
	tfaConfigJSON, _ := json.Marshal(tfaConfig)

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg    string
			sessionID string
			passcode  string
		}{
			{
				"sessionID not provided",
				"",
				"123456",
			},
			{
				"passcode not provided",
				"sessionID",
				"",
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				t.Parallel()
				m := NewManager(cfg, nil, nil)
				err := m.ApproveSession(ctx, tc.sessionID, tc.passcode)
				assert.True(t, errors.Is(err, hub.ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	t.Run("error getting user id from session", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getUserIDFromSessionIDDBQ, hashedSessionID).Return("", tests.ErrFakeDB)
		m := NewManager(cfg, db, nil)

		err := m.ApproveSession(ctx, sessionID, "123456")
		assert.Equal(t, tests.ErrFakeDB, err)
		db.AssertExpectations(t)
	})

	t.Run("error getting 2fa config from database", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getUserIDFromSessionIDDBQ, hash(sessionID)).Return("userID", nil)
		db.On("QueryRow", ctx, getTFAConfigDBQ, "userID").Return(nil, tests.ErrFakeDB)
		m := NewManager(cfg, db, nil)

		err := m.ApproveSession(ctx, sessionID, "123456")
		assert.Equal(t, tests.ErrFakeDB, err)
		db.AssertExpectations(t)
	})

	t.Run("invalid passcode provided", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getUserIDFromSessionIDDBQ, hash(sessionID)).Return("userID", nil)
		db.On("QueryRow", ctx, getTFAConfigDBQ, "userID").Return(tfaConfigJSON, nil)
		m := NewManager(cfg, db, nil)

		err := m.ApproveSession(ctx, sessionID, "123456")
		assert.Equal(t, errInvalidTFAPasscode, err)
		db.AssertExpectations(t)
	})

	t.Run("session approved successfully", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getUserIDFromSessionIDDBQ, hash(sessionID)).Return("userID", nil)
		db.On("QueryRow", ctx, getTFAConfigDBQ, "userID").Return(tfaConfigJSON, nil)
		db.On("Exec", ctx, approveSessionDBQ, hashedSessionID, "").Return(nil)
		m := NewManager(cfg, db, nil)

		passcode, _ := totp.GenerateCode(key.Secret(), time.Now())
		err := m.ApproveSession(ctx, sessionID, passcode)
		assert.Nil(t, err)
		db.AssertExpectations(t)
	})

	t.Run("session approved successfully (using valid recovery code)", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getUserIDFromSessionIDDBQ, hash(sessionID)).Return("userID", nil)
		db.On("QueryRow", ctx, getTFAConfigDBQ, "userID").Return(tfaConfigJSON, nil)
		db.On("Exec", ctx, approveSessionDBQ, hashedSessionID, code1).Return(nil)
		m := NewManager(cfg, db, nil)

		err := m.ApproveSession(ctx, sessionID, code1)
		assert.Nil(t, err)
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
				m := NewManager(cfg, nil, nil)
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
				m := NewManager(cfg, db, nil)

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
		m := NewManager(cfg, db, nil)

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
				m := NewManager(cfg, nil, nil)
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
		m := NewManager(cfg, db, nil)

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
		m := NewManager(cfg, db, nil)

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
		m := NewManager(cfg, db, nil)

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
		m := NewManager(cfg, db, nil)

		output, err := m.CheckCredentials(ctx, "email", "pass")
		assert.NoError(t, err)
		assert.True(t, output.Valid)
		assert.Equal(t, "userID", output.UserID)
		db.AssertExpectations(t)
	})
}

func TestCheckSession(t *testing.T) {
	ctx := context.Background()
	sessionID := "sessionID"
	hashedSessionID := hash(sessionID)

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg    string
			sessionID string
			duration  time.Duration
		}{
			{
				"session id not provided",
				"",
				10,
			},
			{
				"duration not provided",
				"sessionID",
				0,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				t.Parallel()
				m := NewManager(cfg, nil, nil)
				_, err := m.CheckSession(ctx, tc.sessionID, tc.duration)
				assert.True(t, errors.Is(err, hub.ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	t.Run("session not found in database", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getSessionDBQ, hashedSessionID).Return(nil, pgx.ErrNoRows)
		m := NewManager(cfg, db, nil)

		output, err := m.CheckSession(ctx, sessionID, 1*time.Hour)
		assert.NoError(t, err)
		assert.False(t, output.Valid)
		assert.Empty(t, output.UserID)
		db.AssertExpectations(t)
	})

	t.Run("error getting session from database", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getSessionDBQ, hashedSessionID).Return(nil, tests.ErrFakeDB)
		m := NewManager(cfg, db, nil)

		output, err := m.CheckSession(ctx, sessionID, 1*time.Hour)
		assert.Equal(t, tests.ErrFakeDB, err)
		assert.Nil(t, output)
		db.AssertExpectations(t)
	})

	t.Run("session has expired", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getSessionDBQ, hashedSessionID).Return([]interface{}{
			"userID",
			int64(1),
			true,
		}, nil)
		m := NewManager(cfg, db, nil)

		output, err := m.CheckSession(ctx, sessionID, 1*time.Hour)
		assert.NoError(t, err)
		assert.False(t, output.Valid)
		assert.Empty(t, output.UserID)
		db.AssertExpectations(t)
	})

	t.Run("session is not approved", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getSessionDBQ, hashedSessionID).Return([]interface{}{
			"userID",
			time.Now().Unix(),
			false,
		}, nil)
		m := NewManager(cfg, db, nil)

		output, err := m.CheckSession(ctx, sessionID, 1*time.Hour)
		assert.NoError(t, err)
		assert.False(t, output.Valid)
		assert.Empty(t, output.UserID)
		db.AssertExpectations(t)
	})

	t.Run("valid session", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getSessionDBQ, hashedSessionID).Return([]interface{}{
			"userID",
			time.Now().Unix(),
			true,
		}, nil)
		m := NewManager(cfg, db, nil)

		output, err := m.CheckSession(ctx, sessionID, 1*time.Hour)
		assert.NoError(t, err)
		assert.True(t, output.Valid)
		assert.Equal(t, "userID", output.UserID)
		db.AssertExpectations(t)
	})
}

func TestDeleteSession(t *testing.T) {
	ctx := context.Background()
	sessionID := "sessionID"
	hashedSessionID := hash(sessionID)

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg    string
			sessionID string
			duration  time.Duration
		}{
			{
				"session id not provided",
				"",
				10,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				t.Parallel()
				m := NewManager(cfg, nil, nil)
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
				db.On("Exec", ctx, deleteSessionDBQ, hashedSessionID).Return(tc.dbResponse)
				m := NewManager(cfg, db, nil)

				err := m.DeleteSession(ctx, sessionID)
				assert.Equal(t, tc.dbResponse, err)
				db.AssertExpectations(t)
			})
		}
	})
}

func TestDeleteUser(t *testing.T) {
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")
	code := "code"
	codeHashed := hash(code)

	t.Run("user id not found in ctx", func(t *testing.T) {
		t.Parallel()
		m := NewManager(cfg, nil, nil)
		assert.Panics(t, func() {
			_ = m.DeleteUser(context.Background(), code)
		})
	})

	t.Run("database error", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, deleteUserDBQ, "userID", codeHashed).Return("", tests.ErrFakeDB)
		m := NewManager(cfg, db, nil)

		err := m.DeleteUser(ctx, code)
		assert.Equal(t, tests.ErrFakeDB, err)
		db.AssertExpectations(t)
	})

	t.Run("error sending account deleted email notification", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, deleteUserDBQ, "userID", codeHashed).Return("email", nil)
		es := &email.SenderMock{}
		es.On("SendEmail", mock.Anything).Return(email.ErrFakeSenderFailure)
		m := NewManager(cfg, db, es)

		err := m.DeleteUser(ctx, code)
		assert.Equal(t, email.ErrFakeSenderFailure, err)
		db.AssertExpectations(t)
	})

	t.Run("database query succeeded", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, deleteUserDBQ, "userID", codeHashed).Return("email", nil)
		es := &email.SenderMock{}
		es.On("SendEmail", mock.Anything).Return(nil)
		m := NewManager(cfg, db, es)

		err := m.DeleteUser(ctx, code)
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})
}

func TestDisableTFA(t *testing.T) {
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")
	opts := totp.GenerateOpts{
		Issuer:      "Artifact Hub",
		AccountName: "test@email.com",
	}
	key, _ := totp.Generate(opts)
	code1 := "code1"
	tfaConfig := &hub.TFAConfig{
		Enabled:       true,
		URL:           key.URL(),
		RecoveryCodes: []string{code1},
	}
	tfaConfigJSON, _ := json.Marshal(tfaConfig)

	t.Run("user id not found in ctx", func(t *testing.T) {
		t.Parallel()
		m := NewManager(cfg, nil, nil)
		assert.Panics(t, func() {
			_ = m.DisableTFA(ctx, "123456")
		})
	})

	t.Run("invalid input", func(t *testing.T) {
		t.Parallel()
		m := NewManager(cfg, nil, nil)
		err := m.DisableTFA(ctx, "")

		assert.True(t, errors.Is(err, hub.ErrInvalidInput))
	})

	t.Run("error getting 2fa config from database", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getTFAConfigDBQ, "userID").Return(nil, tests.ErrFakeDB)
		m := NewManager(cfg, db, nil)

		err := m.DisableTFA(ctx, "123456")
		assert.Equal(t, tests.ErrFakeDB, err)
		db.AssertExpectations(t)
	})

	t.Run("invalid passcode provided", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getTFAConfigDBQ, "userID").Return(tfaConfigJSON, nil)
		m := NewManager(cfg, db, nil)

		err := m.DisableTFA(ctx, "123456")
		assert.Equal(t, errInvalidTFAPasscode, err)
		db.AssertExpectations(t)
	})

	t.Run("error setting 2fa as disabled in the database", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getTFAConfigDBQ, "userID").Return(tfaConfigJSON, nil)
		db.On("Exec", ctx, disableTFADBQ, "userID").Return(tests.ErrFakeDB)
		m := NewManager(cfg, db, nil)

		passcode, _ := totp.GenerateCode(key.Secret(), time.Now())
		err := m.DisableTFA(ctx, passcode)
		assert.Equal(t, tests.ErrFakeDB, err)
		db.AssertExpectations(t)
	})

	t.Run("error sending 2fa enabled email notification", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getTFAConfigDBQ, "userID").Return(tfaConfigJSON, nil)
		db.On("Exec", ctx, disableTFADBQ, "userID").Return(nil)
		db.On("QueryRow", ctx, getUserEmailDBQ, "userID").Return("email", nil)
		es := &email.SenderMock{}
		es.On("SendEmail", mock.Anything).Return(email.ErrFakeSenderFailure)
		m := NewManager(cfg, db, es)

		passcode, _ := totp.GenerateCode(key.Secret(), time.Now())
		err := m.DisableTFA(ctx, passcode)
		assert.Equal(t, email.ErrFakeSenderFailure, err)
		db.AssertExpectations(t)
	})

	t.Run("2fa disabled successfully", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getTFAConfigDBQ, "userID").Return(tfaConfigJSON, nil)
		db.On("Exec", ctx, disableTFADBQ, "userID").Return(nil)
		db.On("QueryRow", ctx, getUserEmailDBQ, "userID").Return("email", nil)
		es := &email.SenderMock{}
		es.On("SendEmail", mock.Anything).Return(nil)
		m := NewManager(cfg, db, es)

		passcode, _ := totp.GenerateCode(key.Secret(), time.Now())
		err := m.DisableTFA(ctx, passcode)
		assert.Nil(t, err)
		db.AssertExpectations(t)
	})

	t.Run("2fa disabled successfully (using valid recovery code)", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getTFAConfigDBQ, "userID").Return(tfaConfigJSON, nil)
		db.On("Exec", ctx, disableTFADBQ, "userID").Return(nil)
		m := NewManager(cfg, db, nil)

		err := m.DisableTFA(ctx, code1)
		assert.Nil(t, err)
		db.AssertExpectations(t)
	})
}

func TestEnableTFA(t *testing.T) {
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")
	opts := totp.GenerateOpts{
		Issuer:      "Artifact Hub",
		AccountName: "test@email.com",
	}
	key, _ := totp.Generate(opts)
	tfaConfig := &hub.TFAConfig{
		Enabled: true,
		URL:     key.URL(),
	}
	tfaConfigJSON, _ := json.Marshal(tfaConfig)

	t.Run("user id not found in ctx", func(t *testing.T) {
		t.Parallel()
		m := NewManager(cfg, nil, nil)
		assert.Panics(t, func() {
			_ = m.EnableTFA(ctx, "123456")
		})
	})

	t.Run("invalid input", func(t *testing.T) {
		t.Parallel()
		m := NewManager(cfg, nil, nil)
		err := m.EnableTFA(ctx, "")

		assert.True(t, errors.Is(err, hub.ErrInvalidInput))
	})

	t.Run("error getting 2fa config from database", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getTFAConfigDBQ, "userID").Return(nil, tests.ErrFakeDB)
		m := NewManager(cfg, db, nil)

		err := m.EnableTFA(ctx, "123456")
		assert.Equal(t, tests.ErrFakeDB, err)
		db.AssertExpectations(t)
	})

	t.Run("invalid passcode provided", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getTFAConfigDBQ, "userID").Return(tfaConfigJSON, nil)
		m := NewManager(cfg, db, nil)

		err := m.EnableTFA(ctx, "123456")
		assert.Equal(t, errInvalidTFAPasscode, err)
		db.AssertExpectations(t)
	})

	t.Run("error setting 2fa as enabled in the database", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getTFAConfigDBQ, "userID").Return(tfaConfigJSON, nil)
		db.On("Exec", ctx, enableTFADBQ, "userID").Return(tests.ErrFakeDB)
		m := NewManager(cfg, db, nil)

		passcode, _ := totp.GenerateCode(key.Secret(), time.Now())
		err := m.EnableTFA(ctx, passcode)
		assert.Equal(t, tests.ErrFakeDB, err)
		db.AssertExpectations(t)
	})

	t.Run("error sending 2fa enabled email notification", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getTFAConfigDBQ, "userID").Return(tfaConfigJSON, nil)
		db.On("Exec", ctx, enableTFADBQ, "userID").Return(nil)
		db.On("QueryRow", ctx, getUserEmailDBQ, "userID").Return("email", nil)
		es := &email.SenderMock{}
		es.On("SendEmail", mock.Anything).Return(email.ErrFakeSenderFailure)
		m := NewManager(cfg, db, es)

		passcode, _ := totp.GenerateCode(key.Secret(), time.Now())
		err := m.EnableTFA(ctx, passcode)
		assert.Equal(t, email.ErrFakeSenderFailure, err)
		db.AssertExpectations(t)
	})

	t.Run("2fa enabled successfully", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getTFAConfigDBQ, "userID").Return(tfaConfigJSON, nil)
		db.On("Exec", ctx, enableTFADBQ, "userID").Return(nil)
		db.On("QueryRow", ctx, getUserEmailDBQ, "userID").Return("email", nil)
		es := &email.SenderMock{}
		es.On("SendEmail", mock.Anything).Return(nil)
		m := NewManager(cfg, db, es)

		passcode, _ := totp.GenerateCode(key.Secret(), time.Now())
		err := m.EnableTFA(ctx, passcode)
		assert.Nil(t, err)
		db.AssertExpectations(t)
	})
}

func TestGetProfile(t *testing.T) {
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		t.Parallel()
		m := NewManager(cfg, nil, nil)
		assert.Panics(t, func() {
			_, _ = m.GetProfile(context.Background())
		})
	})

	t.Run("database error", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getUserProfileDBQ, "userID").Return(nil, tests.ErrFakeDB)
		m := NewManager(cfg, db, nil)

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
			PasswordSet:    true,
			TFAEnabled:     true,
		}

		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getUserProfileDBQ, "userID").Return([]byte(`
		{
			"alias": "alias",
			"first_name": "first_name",
			"last_name": "last_name",
			"email": "email",
			"profile_image_id": "profile_image_id",
			"password_set": true,
			"tfa_enabled": true
		}
		`), nil)
		m := NewManager(cfg, db, nil)

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
		m := NewManager(cfg, nil, nil)
		assert.Panics(t, func() {
			_, _ = m.GetProfileJSON(context.Background())
		})
	})

	t.Run("database query succeeded", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getUserProfileDBQ, "userID").Return([]byte("dataJSON"), nil)
		m := NewManager(cfg, db, nil)

		data, err := m.GetProfileJSON(ctx)
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), data)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getUserProfileDBQ, "userID").Return(nil, tests.ErrFakeDB)
		m := NewManager(cfg, db, nil)

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
		m := NewManager(cfg, nil, nil)
		_, err := m.GetUserID(ctx, "")
		assert.True(t, errors.Is(err, hub.ErrInvalidInput))
	})

	t.Run("database query succeeded", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getUserIDFromEmailDBQ, "email").Return("userID", nil)
		m := NewManager(cfg, db, nil)

		userID, err := m.GetUserID(ctx, "email")
		assert.NoError(t, err)
		assert.Equal(t, "userID", userID)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getUserIDFromEmailDBQ, "email").Return("", tests.ErrFakeDB)
		m := NewManager(cfg, db, nil)

		userID, err := m.GetUserID(ctx, "email")
		assert.Equal(t, tests.ErrFakeDB, err)
		assert.Empty(t, userID)
		db.AssertExpectations(t)
	})
}

func TestRegisterDeleteUserCode(t *testing.T) {
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		t.Parallel()
		m := NewManager(cfg, nil, nil)
		assert.Panics(t, func() {
			_ = m.RegisterDeleteUserCode(context.Background())
		})
	})

	t.Run("database error registering user delete code", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("Exec", ctx, registerDeleteUserCodeDBQ, "userID", mock.Anything).Return(tests.ErrFakeDB)
		m := NewManager(cfg, db, nil)

		err := m.RegisterDeleteUserCode(ctx)
		assert.Equal(t, tests.ErrFakeDB, err)
		db.AssertExpectations(t)
	})

	t.Run("error sending user delete code email", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("Exec", ctx, registerDeleteUserCodeDBQ, "userID", mock.Anything).Return(nil)
		db.On("QueryRow", ctx, getUserEmailDBQ, "userID").Return("email", nil)
		es := &email.SenderMock{}
		es.On("SendEmail", mock.Anything).Return(email.ErrFakeSenderFailure)
		m := NewManager(cfg, db, es)

		err := m.RegisterDeleteUserCode(ctx)
		assert.Equal(t, email.ErrFakeSenderFailure, err)
		db.AssertExpectations(t)
	})

	t.Run("successful user delete code registration", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("Exec", ctx, registerDeleteUserCodeDBQ, "userID", mock.Anything).Return(nil)
		db.On("QueryRow", ctx, getUserEmailDBQ, "userID").Return("email", nil)
		es := &email.SenderMock{}
		es.On("SendEmail", mock.Anything).Return(nil)
		m := NewManager(cfg, db, es)

		err := m.RegisterDeleteUserCode(ctx)
		assert.Nil(t, err)
		db.AssertExpectations(t)
		es.AssertExpectations(t)
	})
}

func TestRegisterPasswordResetCode(t *testing.T) {
	ctx := context.Background()

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg    string
			userEmail string
		}{
			{
				"email not provided",
				"",
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				t.Parallel()
				es := &email.SenderMock{}
				m := NewManager(cfg, nil, es)

				err := m.RegisterPasswordResetCode(ctx, tc.userEmail)
				assert.True(t, errors.Is(err, hub.ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	t.Run("successful password reset code registration in database", func(t *testing.T) {
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
				db.On("Exec", ctx, registerPasswordResetCodeDBQ, "email@email.com", mock.Anything).Return(nil)
				es := &email.SenderMock{}
				es.On("SendEmail", mock.Anything).Return(tc.emailSenderResponse)
				m := NewManager(cfg, db, es)

				err := m.RegisterPasswordResetCode(ctx, "email@email.com")
				assert.Equal(t, tc.emailSenderResponse, err)
				db.AssertExpectations(t)
				es.AssertExpectations(t)
			})
		}
	})

	t.Run("database error registering password reset code", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("Exec", ctx, registerPasswordResetCodeDBQ, "email@email.com", mock.Anything).Return(tests.ErrFakeDB)
		m := NewManager(cfg, db, nil)

		err := m.RegisterPasswordResetCode(ctx, "email@email.com")
		assert.Equal(t, tests.ErrFakeDB, err)
		db.AssertExpectations(t)
	})
}

func TestRegisterSession(t *testing.T) {
	ctx := context.Background()
	userID := "00000000-0000-0000-0000-000000000001"

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
				m := NewManager(cfg, nil, nil)
				s := &hub.Session{UserID: tc.userID}
				_, err := m.RegisterSession(ctx, s)
				assert.True(t, errors.Is(err, hub.ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	t.Run("database error", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, registerSessionDBQ, mock.Anything).Return(nil, tests.ErrFakeDB)
		m := NewManager(cfg, db, nil)

		sIN := &hub.Session{UserID: userID}
		sOUT, err := m.RegisterSession(ctx, sIN)
		assert.Equal(t, tests.ErrFakeDB, err)
		assert.Nil(t, sOUT)
		db.AssertExpectations(t)
	})

	t.Run("successful session registration", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, registerSessionDBQ, mock.Anything).Return(true, nil)
		m := NewManager(cfg, db, nil)

		sIN := &hub.Session{
			UserID:    userID,
			IP:        "192.168.1.100",
			UserAgent: "Safari 13.0.5",
		}
		sOUT, err := m.RegisterSession(ctx, sIN)
		assert.NoError(t, err)
		assert.NotEmpty(t, sOUT.SessionID)
		assert.Equal(t, userID, sOUT.UserID)
		assert.True(t, sOUT.Approved)
		db.AssertExpectations(t)
	})
}

func TestRegisterUser(t *testing.T) {
	ctx := context.Background()
	password := "a66bV.Xp2" // #nosec

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
				"email not provided",
				&hub.User{Alias: "user1"},
			},
			{
				"invalid profile image id",
				&hub.User{Alias: "user1", Email: "email", ProfileImageID: "invalid"},
			},
			{
				"insecure password",
				&hub.User{Alias: "user1", Email: "email", Password: "hello"},
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				t.Parallel()
				es := &email.SenderMock{}
				m := NewManager(cfg, nil, es)

				err := m.RegisterUser(ctx, tc.user)
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
				m := NewManager(cfg, db, es)

				u := &hub.User{
					Alias:          "alias",
					FirstName:      "first_name",
					LastName:       "last_name",
					Email:          "email@email.com",
					Password:       password,
					ProfileImageID: "00000000-0000-0000-0000-000000000001",
				}
				err := m.RegisterUser(ctx, u)
				assert.Equal(t, tc.emailSenderResponse, err)
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
		m := NewManager(cfg, db, nil)

		u := &hub.User{
			Alias:    "alias",
			Email:    "email@email.com",
			Password: password,
		}
		err := m.RegisterUser(ctx, u)
		assert.Equal(t, tests.ErrFakeDB, err)
		db.AssertExpectations(t)
	})
}

func TestResetPassword(t *testing.T) {
	ctx := context.Background()
	code := "code"
	codeHashed := hash(code)
	newPassword := "a66bV.Xp2" // #nosec

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg      string
			code        string
			newPassword string
		}{
			{
				"code not provided",
				"",
				newPassword,
			},
			{
				"new password not provided",
				code,
				"",
			},
			{
				"insecure password",
				code,
				"password",
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				t.Parallel()
				es := &email.SenderMock{}
				m := NewManager(cfg, nil, es)
				err := m.ResetPassword(ctx, tc.code, tc.newPassword)
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
				db.On("QueryRow", ctx, resetUserPasswordDBQ, codeHashed, mock.Anything).Return("", tc.dbErr)
				m := NewManager(cfg, db, nil)

				err := m.ResetPassword(ctx, code, newPassword)
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
				db.On("QueryRow", ctx, resetUserPasswordDBQ, codeHashed, mock.Anything).Return("email", nil)
				es := &email.SenderMock{}
				es.On("SendEmail", mock.Anything).Return(tc.emailSenderResponse)
				m := NewManager(cfg, db, es)

				err := m.ResetPassword(ctx, code, newPassword)
				assert.Equal(t, tc.emailSenderResponse, err)
				db.AssertExpectations(t)
				es.AssertExpectations(t)
			})
		}
	})
}

func TestSetupTFA(t *testing.T) {
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		t.Parallel()
		m := NewManager(cfg, nil, nil)
		assert.Panics(t, func() {
			_, _ = m.SetupTFA(context.Background())
		})
	})

	t.Run("error getting requesting user email", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getUserEmailDBQ, "userID").Return("", tests.ErrFakeDB)
		m := NewManager(cfg, db, nil)

		dataJSON, err := m.SetupTFA(ctx)
		assert.Nil(t, dataJSON)
		assert.Equal(t, tests.ErrFakeDB, err)
		db.AssertExpectations(t)
	})

	t.Run("error storing 2fa info in database", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getUserEmailDBQ, "userID").Return("email", nil)
		db.On("Exec", ctx, updateTFAInfoDBQ, "userID", mock.Anything, mock.Anything).Return(tests.ErrFake)
		m := NewManager(cfg, db, nil)

		dataJSON, err := m.SetupTFA(ctx)
		assert.Nil(t, dataJSON)
		assert.Equal(t, tests.ErrFake, err)
		db.AssertExpectations(t)
	})

	t.Run("setup 2fa succeeded", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getUserEmailDBQ, "userID").Return("email", nil)
		db.On("Exec", ctx, updateTFAInfoDBQ, "userID", mock.Anything, mock.Anything).Return(nil)
		m := NewManager(cfg, db, nil)

		dataJSON, err := m.SetupTFA(ctx)
		assert.NotNil(t, dataJSON)
		assert.Nil(t, err)
		var output *hub.SetupTFAOutput
		err = json.Unmarshal(dataJSON, &output)
		require.NoError(t, err)
		assert.NotEmpty(t, output.QRCode)
		assert.NotEmpty(t, output.Secret)
		for _, code := range output.RecoveryCodes {
			_, err := uuid.FromString(code)
			assert.NoError(t, err, code)
		}
		db.AssertExpectations(t)
	})
}

func TestUpdatePassword(t *testing.T) {
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")
	oldHashed, _ := bcrypt.GenerateFromPassword([]byte("old"), bcrypt.DefaultCost)
	new := "a66bV.Xp2"

	t.Run("user id not found in ctx", func(t *testing.T) {
		t.Parallel()
		m := NewManager(cfg, nil, nil)
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
			{
				"insecure password",
				"old",
				"new",
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				t.Parallel()
				m := NewManager(cfg, nil, nil)
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
		m := NewManager(cfg, db, nil)

		err := m.UpdatePassword(ctx, "old", new)
		assert.Equal(t, tests.ErrFakeDB, err)
		db.AssertExpectations(t)
	})

	t.Run("invalid user password provided", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getUserPasswordDBQ, "userID").Return(string(oldHashed), nil)
		m := NewManager(cfg, db, nil)

		err := m.UpdatePassword(ctx, "old2", new)
		assert.Error(t, err)
		db.AssertExpectations(t)
	})

	t.Run("database error updating password", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getUserPasswordDBQ, "userID").Return(string(oldHashed), nil)
		db.On("Exec", ctx, updateUserPasswordDBQ, "userID", mock.Anything, mock.Anything).
			Return(tests.ErrFakeDB)
		m := NewManager(cfg, db, nil)

		err := m.UpdatePassword(ctx, "old", new)
		assert.Equal(t, tests.ErrFakeDB, err)
		db.AssertExpectations(t)
	})

	t.Run("successful password update", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getUserPasswordDBQ, "userID").Return(string(oldHashed), nil)
		db.On("Exec", ctx, updateUserPasswordDBQ, "userID", mock.Anything, mock.Anything).Return(nil)
		m := NewManager(cfg, db, nil)

		err := m.UpdatePassword(ctx, "old", new)
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})
}

func TestUpdateProfile(t *testing.T) {
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		t.Parallel()
		m := NewManager(cfg, nil, nil)
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
				m := NewManager(cfg, nil, nil)
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
		m := NewManager(cfg, db, nil)

		err := m.UpdateProfile(ctx, &hub.User{Alias: "user1"})
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("Exec", ctx, updateUserProfileDBQ, "userID", mock.Anything).Return(tests.ErrFakeDB)
		m := NewManager(cfg, db, nil)

		err := m.UpdateProfile(ctx, &hub.User{Alias: "user1"})
		assert.Equal(t, tests.ErrFakeDB, err)
		db.AssertExpectations(t)
	})
}

func TestVerifyEmail(t *testing.T) {
	ctx := context.Background()

	t.Run("invalid input", func(t *testing.T) {
		t.Parallel()
		m := NewManager(cfg, nil, nil)
		_, err := m.VerifyEmail(ctx, "")
		assert.True(t, errors.Is(err, hub.ErrInvalidInput))
	})

	t.Run("successful email verification", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, verifyEmailDBQ, "emailVerificationCode").Return(true, nil)
		m := NewManager(cfg, db, nil)

		verified, err := m.VerifyEmail(ctx, "emailVerificationCode")
		assert.NoError(t, err)
		assert.True(t, verified)
		db.AssertExpectations(t)
	})

	t.Run("database error verifying email", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, verifyEmailDBQ, "emailVerificationCode").Return(false, tests.ErrFakeDB)
		m := NewManager(cfg, db, nil)

		verified, err := m.VerifyEmail(ctx, "emailVerificationCode")
		assert.Equal(t, tests.ErrFakeDB, err)
		assert.False(t, verified)
		db.AssertExpectations(t)
	})
}

func TestVerifyPasswordResetCode(t *testing.T) {
	ctx := context.Background()
	code := "code"
	codeHashed := hash(code)

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
				m := NewManager(cfg, nil, nil)
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
				db.On("Exec", ctx, verifyPasswordResetCodeDBQ, codeHashed).Return(tc.dbErr)
				m := NewManager(cfg, db, nil)

				err := m.VerifyPasswordResetCode(ctx, code)
				assert.Equal(t, tc.expectedErr, err)
				db.AssertExpectations(t)
			})
		}
	})

	t.Run("password code verified successfully in database", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("Exec", ctx, verifyPasswordResetCodeDBQ, codeHashed).Return(nil)
		m := NewManager(cfg, db, nil)

		err := m.VerifyPasswordResetCode(ctx, code)
		assert.Equal(t, nil, err)
		db.AssertExpectations(t)
	})
}
