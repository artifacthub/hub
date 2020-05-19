package webhook

import (
	"context"
	"errors"
	"testing"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

const validUUID = "00000000-0000-0000-0000-000000000001"

func TestAdd(t *testing.T) {
	dbQuery := "select add_webhook($1::uuid, $2::text, $3::jsonb)"
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	wh := &hub.Webhook{
		Name:       "webhook1",
		URL:        "http://webhook1.url",
		EventKinds: []hub.EventKind{hub.NewRelease},
		Packages: []*hub.Package{
			{PackageID: validUUID},
		},
	}

	t.Run("user id not found in ctx", func(t *testing.T) {
		m := NewManager(nil)
		assert.Panics(t, func() {
			_ = m.Add(context.Background(), "orgName", wh)
		})
	})

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg  string
			orgName string
			wh      *hub.Webhook
		}{
			{
				"name not provided",
				"org1",
				&hub.Webhook{
					Name: "",
				},
			},
			{
				"url not provided",
				"org1",
				&hub.Webhook{
					Name: "webhook",
					URL:  "",
				},
			},
			{
				"invalid url",
				"org1",
				&hub.Webhook{
					Name: "webhook",
					URL:  "invalidurl",
				},
			},
			{
				"invalid template",
				"org1",
				&hub.Webhook{
					Name:     "webhook",
					URL:      "http://webhook1.url",
					Template: "{{ .",
				},
			},
			{
				"no event kinds provided",
				"org1",
				&hub.Webhook{
					Name: "webhook",
					URL:  "http://webhook1.url",
				},
			},
			{
				"no packages provided",
				"org1",
				&hub.Webhook{
					Name:       "webhook",
					URL:        "http://webhook1.url",
					EventKinds: []hub.EventKind{hub.NewRelease},
				},
			},
			{
				"invalid package id",
				"org1",
				&hub.Webhook{
					Name:       "webhook",
					URL:        "http://webhook1.url",
					EventKinds: []hub.EventKind{hub.NewRelease},
					Packages: []*hub.Package{
						{PackageID: ""},
					},
				},
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				m := NewManager(nil)

				err := m.Add(ctx, tc.orgName, tc.wh)
				assert.True(t, errors.Is(err, ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQuery, "userID", "orgName", mock.Anything).Return(tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		err := m.Add(ctx, "orgName", wh)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		db.AssertExpectations(t)
	})

	t.Run("add webhook succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQuery, "userID", "orgName", mock.Anything).Return(nil)
		m := NewManager(db)

		err := m.Add(ctx, "orgName", wh)
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})
}

func TestDelete(t *testing.T) {
	dbQuery := "select delete_webhook($1::uuid, $2::uuid)"
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		m := NewManager(nil)
		assert.Panics(t, func() {
			_ = m.Delete(context.Background(), validUUID)
		})
	})

	t.Run("invalid input", func(t *testing.T) {
		m := NewManager(nil)
		err := m.Delete(ctx, "")
		assert.True(t, errors.Is(err, ErrInvalidInput))
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQuery, "userID", validUUID).Return(tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		err := m.Delete(ctx, validUUID)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		db.AssertExpectations(t)
	})

	t.Run("delete webhook succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQuery, "userID", validUUID).Return(nil)
		m := NewManager(db)

		err := m.Delete(ctx, validUUID)
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})
}

func TestGetJSON(t *testing.T) {
	dbQuery := "select get_webhook($1::uuid, $2::uuid)"
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		m := NewManager(nil)
		assert.Panics(t, func() {
			_, _ = m.GetJSON(context.Background(), "orgName")
		})
	})

	t.Run("invalid input", func(t *testing.T) {
		m := NewManager(nil)
		_, err := m.GetJSON(ctx, "")
		assert.True(t, errors.Is(err, ErrInvalidInput))
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, "userID", validUUID).Return(nil, tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		dataJSON, err := m.GetJSON(ctx, validUUID)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		assert.Nil(t, dataJSON)
		db.AssertExpectations(t)
	})

	t.Run("webhook data returned successfully", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, "userID", validUUID).Return([]byte("dataJSON"), nil)
		m := NewManager(db)

		dataJSON, err := m.GetJSON(ctx, validUUID)
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), dataJSON)
		db.AssertExpectations(t)
	})
}

func TestGetOwnedByOrgJSON(t *testing.T) {
	dbQuery := "select get_org_webhooks($1::uuid, $2::text)"
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		m := NewManager(nil)
		assert.Panics(t, func() {
			_, _ = m.GetOwnedByOrgJSON(context.Background(), "orgName")
		})
	})

	t.Run("invalid input", func(t *testing.T) {
		m := NewManager(nil)
		_, err := m.GetOwnedByOrgJSON(ctx, "")
		assert.True(t, errors.Is(err, ErrInvalidInput))
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, "userID", "orgName").Return(nil, tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		dataJSON, err := m.GetOwnedByOrgJSON(ctx, "orgName")
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		assert.Nil(t, dataJSON)
		db.AssertExpectations(t)
	})

	t.Run("org webhooks data returned successfully", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, "userID", "orgName").Return([]byte("dataJSON"), nil)
		m := NewManager(db)

		dataJSON, err := m.GetOwnedByOrgJSON(ctx, "orgName")
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), dataJSON)
		db.AssertExpectations(t)
	})
}

func TestGetOwnedByUserJSON(t *testing.T) {
	dbQuery := "select get_user_webhooks($1::uuid)"
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		m := NewManager(nil)
		assert.Panics(t, func() {
			_, _ = m.GetOwnedByUserJSON(context.Background())
		})
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, "userID").Return(nil, tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		dataJSON, err := m.GetOwnedByUserJSON(ctx)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		assert.Nil(t, dataJSON)
		db.AssertExpectations(t)
	})

	t.Run("user webhooks data returned successfully", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, "userID").Return([]byte("dataJSON"), nil)
		m := NewManager(db)

		dataJSON, err := m.GetOwnedByUserJSON(ctx)
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), dataJSON)
		db.AssertExpectations(t)
	})
}

func TestGetSubscribedTo(t *testing.T) {
	dbQuery := "select get_webhooks_subscribed_to($1::int, $2::uuid)"
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg    string
			eventKind hub.EventKind
			packageID string
		}{
			{
				"invalid event kind",
				hub.EventKind(9),
				validUUID,
			},
			{
				"invalid package id",
				hub.NewRelease,
				"invalid",
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				m := NewManager(nil)

				webhooks, err := m.GetSubscribedTo(ctx, tc.eventKind, tc.packageID)
				assert.True(t, errors.Is(err, ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
				assert.Nil(t, webhooks)
			})
		}
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, hub.NewRelease, validUUID).Return(nil, tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		webhooks, err := m.GetSubscribedTo(ctx, hub.NewRelease, validUUID)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		assert.Nil(t, webhooks)
		db.AssertExpectations(t)
	})

	t.Run("webhooks returned successfully", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, hub.NewRelease, validUUID).Return([]byte(`
		[{
			"webhook_id": "00000000-0000-0000-0000-000000000001",
			"name": "webhook1",
			"url": "http://webhook1.url"
		}, {
			"webhook_id": "00000000-0000-0000-0000-000000000002",
			"name": "webhook2",
			"url": "http://webhook2.url"
		}]
		`), nil)
		m := NewManager(db)

		w, err := m.GetSubscribedTo(ctx, hub.NewRelease, validUUID)
		require.NoError(t, err)
		require.Len(t, w, 2)
		assert.Equal(t, "00000000-0000-0000-0000-000000000001", w[0].WebhookID)
		assert.Equal(t, "webhook1", w[0].Name)
		assert.Equal(t, "http://webhook1.url", w[0].URL)
		assert.Equal(t, "00000000-0000-0000-0000-000000000002", w[1].WebhookID)
		assert.Equal(t, "webhook2", w[1].Name)
		assert.Equal(t, "http://webhook2.url", w[1].URL)
		db.AssertExpectations(t)
	})
}

func TestUpdate(t *testing.T) {
	dbQuery := "select update_webhook($1::uuid, $2::jsonb)"
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	wh := &hub.Webhook{
		WebhookID:  validUUID,
		Name:       "webhook1",
		URL:        "http://webhook1.url",
		EventKinds: []hub.EventKind{hub.NewRelease},
		Packages: []*hub.Package{
			{PackageID: validUUID},
		},
	}

	t.Run("user id not found in ctx", func(t *testing.T) {
		m := NewManager(nil)
		assert.Panics(t, func() {
			_ = m.Update(context.Background(), wh)
		})
	})

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg string
			wh     *hub.Webhook
		}{
			{
				"invalid webhook id",
				&hub.Webhook{
					WebhookID: "",
				},
			},
			{
				"name not provided",
				&hub.Webhook{
					WebhookID: validUUID,
					Name:      "",
				},
			},
			{
				"url not provided",
				&hub.Webhook{
					WebhookID: validUUID,
					Name:      "webhook",
					URL:       "",
				},
			},
			{
				"invalid url",
				&hub.Webhook{
					WebhookID: validUUID,
					Name:      "webhook",
					URL:       "invalidurl",
				},
			},
			{
				"invalid template",
				&hub.Webhook{
					WebhookID: validUUID,
					Name:      "webhook",
					URL:       "http://webhook1.url",
					Template:  "{{ .",
				},
			},
			{
				"no event kinds provided",
				&hub.Webhook{
					WebhookID: validUUID,
					Name:      "webhook",
					URL:       "http://webhook1.url",
				},
			},
			{
				"no packages provided",
				&hub.Webhook{
					WebhookID:  validUUID,
					Name:       "webhook",
					URL:        "http://webhook1.url",
					EventKinds: []hub.EventKind{hub.NewRelease},
				},
			},
			{
				"invalid package id",
				&hub.Webhook{
					WebhookID:  validUUID,
					Name:       "webhook",
					URL:        "http://webhook1.url",
					EventKinds: []hub.EventKind{hub.NewRelease},
					Packages: []*hub.Package{
						{PackageID: ""},
					},
				},
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				m := NewManager(nil)

				err := m.Update(ctx, tc.wh)
				assert.True(t, errors.Is(err, ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQuery, "userID", mock.Anything).Return(tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		err := m.Update(ctx, wh)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		db.AssertExpectations(t)
	})

	t.Run("update webhook succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQuery, "userID", mock.Anything).Return(nil)
		m := NewManager(db)

		err := m.Update(ctx, wh)
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})
}
