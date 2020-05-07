package notification

import (
	"context"
	"testing"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/stretchr/testify/assert"
)

func TestGetPending(t *testing.T) {
	dbQuery := "select get_pending_notification()"
	ctx := context.Background()

	t.Run("database error", func(t *testing.T) {
		tx := &tests.TXMock{}
		tx.On("QueryRow", dbQuery).Return(nil, tests.ErrFakeDatabaseFailure)
		m := NewManager()

		dataJSON, err := m.GetPending(ctx, tx)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		assert.Nil(t, dataJSON)
		tx.AssertExpectations(t)
	})

	t.Run("database query succeeded", func(t *testing.T) {
		expectedNotification := &hub.Notification{
			NotificationID:   "00000000-0000-0000-0000-000000000001",
			PackageVersion:   "1.0.0",
			PackageID:        "00000000-0000-0000-0000-000000000001",
			NotificationKind: hub.NewRelease,
		}

		tx := &tests.TXMock{}
		tx.On("QueryRow", dbQuery).Return([]byte(`
		{
			"notification_id": "00000000-0000-0000-0000-000000000001",
			"package_version": "1.0.0",
			"package_id": "00000000-0000-0000-0000-000000000001",
			"notification_kind": 0
		}
		`), nil)
		m := NewManager()

		n, err := m.GetPending(context.Background(), tx)
		assert.NoError(t, err)
		assert.Equal(t, expectedNotification, n)
		tx.AssertExpectations(t)
	})
}
