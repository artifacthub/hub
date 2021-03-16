package stats

import (
	"context"
	"testing"

	"github.com/artifacthub/hub/internal/tests"
	"github.com/stretchr/testify/assert"
)

func TestGetJSON(t *testing.T) {
	ctx := context.Background()

	t.Run("database query succeeded", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getStatsDBQ).Return([]byte("dataJSON"), nil)
		m := NewManager(db)

		dataJSON, err := m.GetJSON(ctx)
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), dataJSON)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getStatsDBQ).Return(nil, tests.ErrFakeDB)
		m := NewManager(db)

		dataJSON, err := m.GetJSON(ctx)
		assert.Equal(t, tests.ErrFakeDB, err)
		assert.Nil(t, dataJSON)
		db.AssertExpectations(t)
	})
}
