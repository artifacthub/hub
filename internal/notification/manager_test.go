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
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

const validUUID = "00000000-0000-0000-0000-000000000001"

func TestMain(m *testing.M) {
	zerolog.SetGlobalLevel(zerolog.Disabled)
	os.Exit(m.Run())
}

func TestAdd(t *testing.T) {
	ctx := context.Background()

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg string
			n      *hub.Notification
		}{
			{
				"invalid event id",
				&hub.Notification{
					Event: &hub.Event{EventID: "invalid"},
				},
			},
			{
				"user or webhook must be provided",
				&hub.Notification{
					Event: &hub.Event{EventID: validUUID},
				},
			},
			{
				"both user and webhook were provided",
				&hub.Notification{
					Event:   &hub.Event{EventID: validUUID},
					User:    &hub.User{UserID: validUUID},
					Webhook: &hub.Webhook{WebhookID: validUUID},
				},
			},
			{
				"invalid user id",
				&hub.Notification{
					Event: &hub.Event{EventID: validUUID},
					User:  &hub.User{UserID: ""},
				},
			},
			{
				"invalid webhook id",
				&hub.Notification{
					Event:   &hub.Event{EventID: validUUID},
					Webhook: &hub.Webhook{WebhookID: ""},
				},
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				t.Parallel()
				m := NewManager()
				err := m.Add(context.Background(), nil, tc.n)
				assert.True(t, errors.Is(err, hub.ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	n := &hub.Notification{
		Event: &hub.Event{EventID: validUUID},
		User:  &hub.User{UserID: validUUID},
	}

	t.Run("database error", func(t *testing.T) {
		t.Parallel()
		tx := &tests.TXMock{}
		tx.On("Exec", ctx, addNotificationDBQ, mock.Anything).Return(tests.ErrFakeDB)
		m := NewManager()

		err := m.Add(ctx, tx, n)
		assert.Equal(t, tests.ErrFakeDB, err)
		tx.AssertExpectations(t)
	})

	t.Run("database query succeeded", func(t *testing.T) {
		t.Parallel()
		tx := &tests.TXMock{}
		tx.On("Exec", ctx, addNotificationDBQ, mock.Anything).Return(nil)
		m := NewManager()

		err := m.Add(ctx, tx, n)
		assert.NoError(t, err)
		tx.AssertExpectations(t)
	})
}

func TestGetPending(t *testing.T) {
	ctx := context.Background()

	t.Run("database error", func(t *testing.T) {
		t.Parallel()
		tx := &tests.TXMock{}
		tx.On("QueryRow", ctx, getPendingNotificationDBQ).Return(nil, tests.ErrFakeDB)
		m := NewManager()

		dataJSON, err := m.GetPending(ctx, tx)
		assert.Equal(t, tests.ErrFakeDB, err)
		assert.Nil(t, dataJSON)
		tx.AssertExpectations(t)
	})

	t.Run("database query succeeded", func(t *testing.T) {
		t.Parallel()
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
		tx.On("QueryRow", ctx, getPendingNotificationDBQ).Return([]byte(`
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

		n, err := m.GetPending(ctx, tx)
		require.NoError(t, err)
		assert.Equal(t, expectedNotification, n)
		tx.AssertExpectations(t)
	})
}

func TestUpdateStatus(t *testing.T) {
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
				t.Parallel()
				m := NewManager()
				err := m.UpdateStatus(ctx, nil, "invalidNotificationID", false, nil)
				assert.True(t, errors.Is(err, hub.ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	t.Run("database error", func(t *testing.T) {
		t.Parallel()
		tx := &tests.TXMock{}
		tx.On("Exec", ctx, updateNotificationStatusDBQ, notificationID, true, "").Return(tests.ErrFakeDB)
		m := NewManager()

		err := m.UpdateStatus(ctx, tx, notificationID, true, nil)
		assert.Equal(t, tests.ErrFakeDB, err)
		tx.AssertExpectations(t)
	})

	t.Run("database query succeeded", func(t *testing.T) {
		t.Parallel()
		tx := &tests.TXMock{}
		tx.On("Exec", ctx, updateNotificationStatusDBQ, notificationID, true, "").Return(nil)
		m := NewManager()

		err := m.UpdateStatus(ctx, tx, notificationID, true, nil)
		assert.NoError(t, err)
		tx.AssertExpectations(t)
	})
}
