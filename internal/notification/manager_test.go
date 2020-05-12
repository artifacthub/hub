package notification

import (
	"context"
	"errors"
	"os"
	"testing"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const validUUID = "00000000-0000-0000-0000-000000000001"

var errFake = errors.New("fake error for tests")

func TestMain(m *testing.M) {
	zerolog.SetGlobalLevel(zerolog.Disabled)
	os.Exit(m.Run())
}

func TestAdd(t *testing.T) {
	dbQuery := `insert into notification (event_id, user_id) values ($1, $2)`

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg  string
			eventID string
			userID  string
		}{
			{
				"invalid event id",
				"invalid",
				validUUID,
			},
			{
				"invalid user id",
				validUUID,
				"invalid",
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				m := NewManager()
				err := m.Add(context.Background(), nil, tc.eventID, tc.userID)
				assert.True(t, errors.Is(err, ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	t.Run("database error", func(t *testing.T) {
		tx := &tests.TXMock{}
		tx.On("Exec", dbQuery, validUUID, validUUID).Return(tests.ErrFakeDatabaseFailure)
		m := NewManager()

		err := m.Add(context.Background(), tx, validUUID, validUUID)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		tx.AssertExpectations(t)
	})

	t.Run("database query succeeded", func(t *testing.T) {
		tx := &tests.TXMock{}
		tx.On("Exec", dbQuery, validUUID, validUUID).Return(nil)
		m := NewManager()

		err := m.Add(context.Background(), tx, validUUID, validUUID)
		assert.NoError(t, err)
		tx.AssertExpectations(t)
	})
}

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
			NotificationID: "notificationID",
			Event: &hub.Event{
				EventKind:      hub.NewRelease,
				PackageID:      "packageID",
				PackageVersion: "1.0.0",
			},
			User: &hub.User{
				Email: "user1@email.com",
			},
		}

		tx := &tests.TXMock{}
		tx.On("QueryRow", dbQuery).Return([]byte(`
		{
			"notification_id": "notificationID",
			"event": {
				"event_kind": 0,
				"package_id": "packageID",
				"package_version": "1.0.0"
			},
			"user": {
				"email": "user1@email.com"
			}
		}
		`), nil)
		m := NewManager()

		n, err := m.GetPending(context.Background(), tx)
		require.NoError(t, err)
		assert.Equal(t, expectedNotification, n)
		tx.AssertExpectations(t)
	})
}

func TestUpdateStatus(t *testing.T) {
	dbQuery := "select update_notification_status($1::uuid, $2::boolean, $3::text)"
	ctx := context.Background()
	notificationID := "00000000-0000-0000-0000-000000000001"

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg         string
			notificationID string
		}{
			{
				"invalid notification id",
				"invalid",
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				m := NewManager()
				err := m.UpdateStatus(ctx, nil, "invalidNotificationID", false, nil)
				assert.True(t, errors.Is(err, ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	t.Run("database error", func(t *testing.T) {
		tx := &tests.TXMock{}
		tx.On("Exec", dbQuery, notificationID, true, "").Return(tests.ErrFakeDatabaseFailure)
		m := NewManager()

		err := m.UpdateStatus(ctx, tx, notificationID, true, nil)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		tx.AssertExpectations(t)
	})

	t.Run("database query succeeded", func(t *testing.T) {
		tx := &tests.TXMock{}
		tx.On("Exec", dbQuery, notificationID, true, "").Return(nil)
		m := NewManager()

		err := m.UpdateStatus(ctx, tx, notificationID, true, nil)
		assert.NoError(t, err)
		tx.AssertExpectations(t)
	})
}
