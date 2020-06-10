package apikey

import (
	"context"
	"encoding/json"
	"errors"
	"testing"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/stretchr/testify/assert"
)

const apiKeyID = "00000000-0000-0000-0000-000000000001"

func TestAdd(t *testing.T) {
	dbQuery := "select add_api_key($1::jsonb)"
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")
	ak := &hub.APIKey{
		Name:   "apikey1",
		UserID: "userID",
	}
	akJSON, _ := json.Marshal(ak)

	t.Run("user id not found in ctx", func(t *testing.T) {
		m := NewManager(nil)
		assert.Panics(t, func() {
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
				m := NewManager(nil)

				dataJSON, err := m.Add(ctx, tc.ak)
				assert.True(t, errors.Is(err, hub.ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
				assert.Nil(t, dataJSON)
			})
		}
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, dbQuery, akJSON).Return(nil, tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		dataJSON, err := m.Add(ctx, ak)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		assert.Nil(t, dataJSON)
		db.AssertExpectations(t)
	})

	t.Run("add api key succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, dbQuery, akJSON).Return([]byte("key"), nil)
		m := NewManager(db)

		dataJSON, err := m.Add(ctx, ak)
		assert.NoError(t, err)
		assert.Equal(t, []byte("key"), dataJSON)
		db.AssertExpectations(t)
	})
}

func TestDelete(t *testing.T) {
	dbQuery := "select delete_api_key($1::uuid, $2::uuid)"
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		m := NewManager(nil)
		assert.Panics(t, func() {
			_ = m.Delete(context.Background(), apiKeyID)
		})
	})

	t.Run("invalid input", func(t *testing.T) {
		m := NewManager(nil)
		err := m.Delete(ctx, "")
		assert.True(t, errors.Is(err, hub.ErrInvalidInput))
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", ctx, dbQuery, "userID", apiKeyID).Return(tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		err := m.Delete(ctx, apiKeyID)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		db.AssertExpectations(t)
	})

	t.Run("delete api key succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", ctx, dbQuery, "userID", apiKeyID).Return(nil)
		m := NewManager(db)

		err := m.Delete(ctx, apiKeyID)
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})
}

func TestGetJSON(t *testing.T) {
	dbQuery := "select get_api_key($1::uuid, $2::uuid)"
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		m := NewManager(nil)
		assert.Panics(t, func() {
			_, _ = m.GetJSON(context.Background(), apiKeyID)
		})
	})

	t.Run("invalid input", func(t *testing.T) {
		m := NewManager(nil)
		_, err := m.GetJSON(ctx, "")
		assert.True(t, errors.Is(err, hub.ErrInvalidInput))
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, dbQuery, "userID", apiKeyID).Return(nil, tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		dataJSON, err := m.GetJSON(ctx, apiKeyID)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		assert.Nil(t, dataJSON)
		db.AssertExpectations(t)
	})

	t.Run("api key data returned successfully", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, dbQuery, "userID", apiKeyID).Return([]byte("dataJSON"), nil)
		m := NewManager(db)

		dataJSON, err := m.GetJSON(ctx, apiKeyID)
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), dataJSON)
		db.AssertExpectations(t)
	})
}

func TestGetOwnedByUserJSON(t *testing.T) {
	dbQuery := "select get_user_api_keys($1::uuid)"
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		m := NewManager(nil)
		assert.Panics(t, func() {
			_, _ = m.GetOwnedByUserJSON(context.Background())
		})
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, dbQuery, "userID").Return(nil, tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		dataJSON, err := m.GetOwnedByUserJSON(ctx)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		assert.Nil(t, dataJSON)
		db.AssertExpectations(t)
	})

	t.Run("user api keys data returned successfully", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, dbQuery, "userID").Return([]byte("dataJSON"), nil)
		m := NewManager(db)

		dataJSON, err := m.GetOwnedByUserJSON(ctx)
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), dataJSON)
		db.AssertExpectations(t)
	})
}

func TestUpdate(t *testing.T) {
	dbQuery := "select update_api_key($1::jsonb)"
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")
	ak := &hub.APIKey{
		APIKeyID: apiKeyID,
		Name:     "apikey1-updated",
		UserID:   "userID",
	}
	akJSON, _ := json.Marshal(ak)

	t.Run("user id not found in ctx", func(t *testing.T) {
		m := NewManager(nil)
		assert.Panics(t, func() {
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
				m := NewManager(nil)

				err := m.Update(ctx, tc.ak)
				assert.True(t, errors.Is(err, hub.ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", ctx, dbQuery, akJSON).Return(tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		err := m.Update(ctx, ak)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		db.AssertExpectations(t)
	})

	t.Run("update api key succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", ctx, dbQuery, akJSON).Return(nil)
		m := NewManager(db)

		err := m.Update(ctx, ak)
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})
}
