package apikey

import (
	"context"
	"crypto/sha512"
	"encoding/json"
	"errors"
	"fmt"
	"testing"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/jackc/pgx/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

const apiKeyID = "00000000-0000-0000-0000-000000000001"

func TestAdd(t *testing.T) {
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		t.Parallel()
		m := NewManager(nil)
		assert.Panics(t, func() {
			ak := &hub.APIKey{
				Name:   "apikey1",
				UserID: "userID",
			}
			_, _ = m.Add(context.Background(), ak)
		})
	})

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg string
			ak     *hub.APIKey
		}{
			{
				"name not provided",
				&hub.APIKey{
					Name: "",
				},
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				t.Parallel()
				m := NewManager(nil)

				keyInfoJSON, err := m.Add(ctx, tc.ak)
				assert.True(t, errors.Is(err, hub.ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
				assert.Empty(t, keyInfoJSON)
			})
		}
	})

	t.Run("database error", func(t *testing.T) {
		t.Parallel()
		ak := &hub.APIKey{
			Name:   "apikey1",
			UserID: "userID",
		}
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, addAPIKeyDBQ, mock.Anything).Return(nil, tests.ErrFakeDB)
		m := NewManager(db)

		output, err := m.Add(ctx, ak)
		assert.Equal(t, tests.ErrFakeDB, err)
		assert.Nil(t, output)
		db.AssertExpectations(t)
	})

	t.Run("add api key succeeded", func(t *testing.T) {
		t.Parallel()
		ak := &hub.APIKey{
			Name:   "apikey1",
			UserID: "userID",
		}
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, addAPIKeyDBQ, mock.Anything).Return("apiKeyID", nil)
		m := NewManager(db)

		output, err := m.Add(ctx, ak)
		assert.NoError(t, err)
		assert.Equal(t, "apiKeyID", output.APIKeyID)
		assert.NotEmpty(t, output.Secret)
		db.AssertExpectations(t)
	})
}

func TestCheck(t *testing.T) {
	ctx := context.Background()

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg       string
			apiKeyID     string
			apiKeySecret string
		}{
			{
				"api key id or secret not provided",
				"",
				"secret",
			},
			{
				"api key id or secret not provided",
				"key",
				"",
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				t.Parallel()
				m := NewManager(nil)
				_, err := m.Check(ctx, tc.apiKeyID, tc.apiKeySecret)
				assert.True(t, errors.Is(err, hub.ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	t.Run("key info not found in database", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getAPIKeyUserIDDBQ, "keyID").Return(nil, pgx.ErrNoRows)
		m := NewManager(db)

		output, err := m.Check(ctx, "keyID", "secret")
		assert.NoError(t, err)
		assert.False(t, output.Valid)
		assert.Empty(t, output.UserID)
		db.AssertExpectations(t)
	})

	t.Run("error getting key info from database", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getAPIKeyUserIDDBQ, "keyID").Return(nil, tests.ErrFakeDB)
		m := NewManager(db)

		output, err := m.Check(ctx, "keyID", "secret")
		assert.Equal(t, tests.ErrFakeDB, err)
		assert.Nil(t, output)
		db.AssertExpectations(t)
	})

	t.Run("invalid key", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		secretHashed := fmt.Sprintf("%x", sha512.Sum512([]byte("secret")))
		db.On("QueryRow", ctx, getAPIKeyUserIDDBQ, "keyID").Return([]interface{}{"userID", secretHashed}, nil)
		m := NewManager(db)

		output, err := m.Check(ctx, "keyID", "invalid-secret")
		assert.NoError(t, err)
		assert.False(t, output.Valid)
		assert.Empty(t, output.UserID)
		db.AssertExpectations(t)
	})

	t.Run("valid key", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		secretHashed := fmt.Sprintf("%x", sha512.Sum512([]byte("secret")))
		db.On("QueryRow", ctx, getAPIKeyUserIDDBQ, "keyID").Return([]interface{}{"userID", secretHashed}, nil)
		m := NewManager(db)

		output, err := m.Check(ctx, "keyID", "secret")
		assert.NoError(t, err)
		assert.True(t, output.Valid)
		assert.Equal(t, "userID", output.UserID)
		db.AssertExpectations(t)
	})
}

func TestDelete(t *testing.T) {
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		t.Parallel()
		m := NewManager(nil)
		assert.Panics(t, func() {
			_ = m.Delete(context.Background(), apiKeyID)
		})
	})

	t.Run("invalid input", func(t *testing.T) {
		t.Parallel()
		m := NewManager(nil)
		err := m.Delete(ctx, "")
		assert.True(t, errors.Is(err, hub.ErrInvalidInput))
	})

	t.Run("database error", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("Exec", ctx, deleteAPIKeyDBQ, "userID", apiKeyID).Return(tests.ErrFakeDB)
		m := NewManager(db)

		err := m.Delete(ctx, apiKeyID)
		assert.Equal(t, tests.ErrFakeDB, err)
		db.AssertExpectations(t)
	})

	t.Run("delete api key succeeded", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("Exec", ctx, deleteAPIKeyDBQ, "userID", apiKeyID).Return(nil)
		m := NewManager(db)

		err := m.Delete(ctx, apiKeyID)
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})
}

func TestGetJSON(t *testing.T) {
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		t.Parallel()
		m := NewManager(nil)
		assert.Panics(t, func() {
			_, _ = m.GetJSON(context.Background(), apiKeyID)
		})
	})

	t.Run("invalid input", func(t *testing.T) {
		t.Parallel()
		m := NewManager(nil)
		_, err := m.GetJSON(ctx, "")
		assert.True(t, errors.Is(err, hub.ErrInvalidInput))
	})

	t.Run("database error", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getAPIKeyDBQ, "userID", apiKeyID).Return(nil, tests.ErrFakeDB)
		m := NewManager(db)

		dataJSON, err := m.GetJSON(ctx, apiKeyID)
		assert.Equal(t, tests.ErrFakeDB, err)
		assert.Nil(t, dataJSON)
		db.AssertExpectations(t)
	})

	t.Run("api key data returned successfully", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getAPIKeyDBQ, "userID", apiKeyID).Return([]byte("dataJSON"), nil)
		m := NewManager(db)

		dataJSON, err := m.GetJSON(ctx, apiKeyID)
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), dataJSON)
		db.AssertExpectations(t)
	})
}

func TestGetOwnedByUserJSON(t *testing.T) {
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")
	p := &hub.Pagination{Limit: 10, Offset: 1}

	t.Run("user id not found in ctx", func(t *testing.T) {
		t.Parallel()
		m := NewManager(nil)
		assert.Panics(t, func() {
			_, _ = m.GetOwnedByUserJSON(context.Background(), p)
		})
	})

	t.Run("database error", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getUserAPIKeysDBQ, "userID", 10, 1).Return(nil, tests.ErrFakeDB)
		m := NewManager(db)

		result, err := m.GetOwnedByUserJSON(ctx, p)
		assert.Equal(t, tests.ErrFakeDB, err)
		assert.Nil(t, result)
		db.AssertExpectations(t)
	})

	t.Run("user api keys data returned successfully", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getUserAPIKeysDBQ, "userID", 10, 1).Return([]interface{}{[]byte("dataJSON"), 1}, nil)
		m := NewManager(db)

		result, err := m.GetOwnedByUserJSON(ctx, p)
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), result.Data)
		assert.Equal(t, 1, result.TotalCount)
		db.AssertExpectations(t)
	})
}

func TestUpdate(t *testing.T) {
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		t.Parallel()
		m := NewManager(nil)
		assert.Panics(t, func() {
			ak := &hub.APIKey{
				APIKeyID: apiKeyID,
				Name:     "apikey1-updated",
				UserID:   "userID",
			}
			_ = m.Update(context.Background(), ak)
		})
	})

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg string
			ak     *hub.APIKey
		}{
			{
				"invalid api key id",
				&hub.APIKey{
					APIKeyID: "",
				},
			},
			{
				"name not provided",
				&hub.APIKey{
					APIKeyID: apiKeyID,
					Name:     "",
				},
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				t.Parallel()
				m := NewManager(nil)

				err := m.Update(ctx, tc.ak)
				assert.True(t, errors.Is(err, hub.ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	t.Run("database error", func(t *testing.T) {
		t.Parallel()
		ak := &hub.APIKey{
			APIKeyID: apiKeyID,
			Name:     "apikey1-updated",
			UserID:   "userID",
		}
		akJSON, _ := json.Marshal(ak)
		db := &tests.DBMock{}
		db.On("Exec", ctx, updateAPIKeyDBQ, akJSON).Return(tests.ErrFakeDB)
		m := NewManager(db)

		err := m.Update(ctx, ak)
		assert.Equal(t, tests.ErrFakeDB, err)
		db.AssertExpectations(t)
	})

	t.Run("update api key succeeded", func(t *testing.T) {
		t.Parallel()
		ak := &hub.APIKey{
			APIKeyID: apiKeyID,
			Name:     "apikey1-updated",
			UserID:   "userID",
		}
		akJSON, _ := json.Marshal(ak)
		db := &tests.DBMock{}
		db.On("Exec", ctx, updateAPIKeyDBQ, akJSON).Return(nil)
		m := NewManager(db)

		err := m.Update(ctx, ak)
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})
}
