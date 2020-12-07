package event

import (
	"context"
	"os"
	"testing"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMain(m *testing.M) {
	zerolog.SetGlobalLevel(zerolog.Disabled)
	os.Exit(m.Run())
}

func TestGetPending(t *testing.T) {
	ctx := context.Background()

	t.Run("database error", func(t *testing.T) {
		t.Parallel()
		tx := &tests.TXMock{}
		tx.On("QueryRow", ctx, getPendingEventDBQ).Return(nil, tests.ErrFakeDB)
		m := NewManager()

		dataJSON, err := m.GetPending(ctx, tx)
		assert.Equal(t, tests.ErrFakeDB, err)
		assert.Nil(t, dataJSON)
		tx.AssertExpectations(t)
	})

	t.Run("database query succeeded", func(t *testing.T) {
		t.Parallel()
		expectedEvent := &hub.Event{
			EventID:        "00000000-0000-0000-0000-000000000001",
			PackageVersion: "1.0.0",
			PackageID:      "00000000-0000-0000-0000-000000000001",
			EventKind:      hub.NewRelease,
		}

		tx := &tests.TXMock{}
		tx.On("QueryRow", ctx, getPendingEventDBQ).Return([]byte(`
		{
			"event_id": "00000000-0000-0000-0000-000000000001",
			"package_version": "1.0.0",
			"package_id": "00000000-0000-0000-0000-000000000001",
			"event_kind": 0
		}
		`), nil)
		m := NewManager()

		e, err := m.GetPending(ctx, tx)
		require.NoError(t, err)
		assert.Equal(t, expectedEvent, e)
		tx.AssertExpectations(t)
	})
}
