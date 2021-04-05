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
		akJSON, _ := json.Marshal(ak)
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, addAPIKeyDBQ, akJSON).Return(nil, tests.ErrFakeDB)
		m := NewManager(db)

		keyInfoJSON, err := m.Add(ctx, ak)
		assert.Equal(t, tests.ErrFakeDB, err)
		assert.Nil(t, keyInfoJSON)
		db.AssertExpectations(t)
	})

	t.Run("add api key succeeded", func(t *testing.T) {
		t.Parallel()
		ak := &hub.APIKey{
			Name:   "apikey1",
			UserID: "userID",
		}
		akJSON, _ := json.Marshal(ak)
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, addAPIKeyDBQ, akJSON).Return([]byte("keyInfoJSON"), nil)
		m := NewManager(db)

		keyInfoJSON, err := m.Add(ctx, ak)
		assert.NoError(t, err)
		assert.Equal(t, []byte("keyInfoJSON"), keyInfoJSON)
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

	t.Run("user id not found in ctx", func(t *testing.T) {
		t.Parallel()
		m := NewManager(nil)
		assert.Panics(t, func() {
			_, _ = m.GetOwnedByUserJSON(context.Background())
		})
	})

	t.Run("database error", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getUserAPIKeysDBQ, "userID").Return(nil, tests.ErrFakeDB)
		m := NewManager(db)

		dataJSON, err := m.GetOwnedByUserJSON(ctx)
		assert.Equal(t, tests.ErrFakeDB, err)
		assert.Nil(t, dataJSON)
		db.AssertExpectations(t)
	})

	t.Run("user api keys data returned successfully", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getUserAPIKeysDBQ, "userID").Return([]byte("dataJSON"), nil)
		m := NewManager(db)

		dataJSON, err := m.GetOwnedByUserJSON(ctx)
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), dataJSON)
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
