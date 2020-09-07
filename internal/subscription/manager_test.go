package subscription

import (
	"context"
	"errors"
	"testing"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

const (
	userID       = "00000000-0000-0000-0000-000000000001"
	packageID    = "00000000-0000-0000-0000-000000000001"
	repositoryID = "00000000-0000-0000-0000-000000000001"
	optOutID     = "00000000-0000-0000-0000-000000000001"
)

func TestAdd(t *testing.T) {
	dbQuery := "select add_subscription($1::jsonb)"
	ctx := context.WithValue(context.Background(), hub.UserIDKey, userID)

	t.Run("user id not found in ctx", func(t *testing.T) {
		m := NewManager(nil)
		assert.Panics(t, func() {
			_ = m.Add(context.Background(), &hub.Subscription{})
		})
	})

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg string
			s      *hub.Subscription
		}{
			{
				"invalid package id",
				&hub.Subscription{
					PackageID: "invalid",
				},
			},
			{
				"invalid event kind",
				&hub.Subscription{
					PackageID: packageID,
					EventKind: hub.EventKind(5),
				},
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				m := NewManager(nil)
				err := m.Add(ctx, tc.s)
				assert.True(t, errors.Is(err, hub.ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	s := &hub.Subscription{
		PackageID: packageID,
		EventKind: hub.NewRelease,
	}

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", ctx, dbQuery, mock.Anything).Return(tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		err := m.Add(ctx, s)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		db.AssertExpectations(t)
	})

	t.Run("database query succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", ctx, dbQuery, mock.Anything).Return(nil)
		m := NewManager(db)

		err := m.Add(ctx, s)
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})
}

func TestAddOptOut(t *testing.T) {
	dbQuery := "select add_opt_out($1::jsonb)"
	ctx := context.WithValue(context.Background(), hub.UserIDKey, userID)

	t.Run("user id not found in ctx", func(t *testing.T) {
		m := NewManager(nil)
		assert.Panics(t, func() {
			_ = m.AddOptOut(context.Background(), &hub.OptOut{})
		})
	})

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg string
			o      *hub.OptOut
		}{
			{
				"invalid repository id",
				&hub.OptOut{
					RepositoryID: "invalid",
					EventKind:    hub.RepositoryTrackingErrors,
				},
			},
			{
				"invalid event kind",
				&hub.OptOut{
					RepositoryID: repositoryID,
					EventKind:    hub.EventKind(9),
				},
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				m := NewManager(nil)
				err := m.AddOptOut(ctx, tc.o)
				assert.True(t, errors.Is(err, hub.ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	o := &hub.OptOut{
		RepositoryID: repositoryID,
		EventKind:    hub.RepositoryTrackingErrors,
	}

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", ctx, dbQuery, mock.Anything).Return(tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		err := m.AddOptOut(ctx, o)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		db.AssertExpectations(t)
	})

	t.Run("database query succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", ctx, dbQuery, mock.Anything).Return(nil)
		m := NewManager(db)

		err := m.AddOptOut(ctx, o)
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})
}

func TestDelete(t *testing.T) {
	dbQuery := "select delete_subscription($1::jsonb)"
	ctx := context.WithValue(context.Background(), hub.UserIDKey, userID)

	t.Run("user id not found in ctx", func(t *testing.T) {
		m := NewManager(nil)
		assert.Panics(t, func() {
			_ = m.Delete(context.Background(), &hub.Subscription{})
		})
	})

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg string
			s      *hub.Subscription
		}{
			{
				"invalid package id",
				&hub.Subscription{
					PackageID: "invalid",
				},
			},
			{
				"invalid event kind",
				&hub.Subscription{
					PackageID: packageID,
					EventKind: hub.EventKind(5),
				},
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				m := NewManager(nil)
				err := m.Delete(ctx, tc.s)
				assert.True(t, errors.Is(err, hub.ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	s := &hub.Subscription{
		PackageID: packageID,
		EventKind: hub.NewRelease,
	}

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", ctx, dbQuery, mock.Anything).Return(tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		err := m.Delete(ctx, s)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		db.AssertExpectations(t)
	})

	t.Run("database query succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", ctx, dbQuery, mock.Anything).Return(nil)
		m := NewManager(db)

		err := m.Delete(ctx, s)
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})
}

func TestDeleteOptOut(t *testing.T) {
	dbQuery := "select delete_opt_out($1::uuid, $2::uuid)"
	ctx := context.WithValue(context.Background(), hub.UserIDKey, userID)

	t.Run("user id not found in ctx", func(t *testing.T) {
		m := NewManager(nil)
		assert.Panics(t, func() {
			_ = m.DeleteOptOut(context.Background(), optOutID)
		})
	})

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg   string
			optOutID string
		}{
			{
				"invalid opt out id",
				"invalid",
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				m := NewManager(nil)
				err := m.DeleteOptOut(ctx, tc.optOutID)
				assert.True(t, errors.Is(err, hub.ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", ctx, dbQuery, userID, optOutID).Return(tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		err := m.DeleteOptOut(ctx, optOutID)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		db.AssertExpectations(t)
	})

	t.Run("database query succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", ctx, dbQuery, userID, optOutID).Return(nil)
		m := NewManager(db)

		err := m.DeleteOptOut(ctx, optOutID)
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})
}

func TestGetByPackageJSON(t *testing.T) {
	dbQuery := "select get_user_package_subscriptions($1::uuid, $2::uuid)"
	ctx := context.WithValue(context.Background(), hub.UserIDKey, userID)

	t.Run("user id not found in ctx", func(t *testing.T) {
		m := NewManager(nil)
		assert.Panics(t, func() {
			_, _ = m.GetByPackageJSON(context.Background(), "")
		})
	})

	t.Run("invalid input", func(t *testing.T) {
		m := NewManager(nil)
		_, err := m.GetByPackageJSON(ctx, "")
		assert.True(t, errors.Is(err, hub.ErrInvalidInput))
		assert.Contains(t, err.Error(), "invalid package id")
	})

	t.Run("database query succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, dbQuery, userID, packageID).Return([]byte("dataJSON"), nil)
		m := NewManager(db)

		dataJSON, err := m.GetByPackageJSON(ctx, packageID)
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), dataJSON)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, dbQuery, userID, packageID).Return(nil, tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		dataJSON, err := m.GetByPackageJSON(ctx, packageID)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		assert.Nil(t, dataJSON)
		db.AssertExpectations(t)
	})
}

func TestGetByUserJSON(t *testing.T) {
	dbQuery := "select get_user_subscriptions($1::uuid)"
	ctx := context.WithValue(context.Background(), hub.UserIDKey, userID)

	t.Run("user id not found in ctx", func(t *testing.T) {
		m := NewManager(nil)
		assert.Panics(t, func() {
			_, _ = m.GetByUserJSON(context.Background())
		})
	})

	t.Run("database query succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, dbQuery, userID).Return([]byte("dataJSON"), nil)
		m := NewManager(db)

		dataJSON, err := m.GetByUserJSON(ctx)
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), dataJSON)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, dbQuery, userID).Return(nil, tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		dataJSON, err := m.GetByUserJSON(ctx)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		assert.Nil(t, dataJSON)
		db.AssertExpectations(t)
	})
}

func TestGetOptOutListJSON(t *testing.T) {
	dbQuery := "select get_user_opt_out_entries($1::uuid)"
	ctx := context.WithValue(context.Background(), hub.UserIDKey, userID)

	t.Run("user id not found in ctx", func(t *testing.T) {
		m := NewManager(nil)
		assert.Panics(t, func() {
			_, _ = m.GetOptOutListJSON(context.Background())
		})
	})

	t.Run("database query succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, dbQuery, userID).Return([]byte("dataJSON"), nil)
		m := NewManager(db)

		dataJSON, err := m.GetOptOutListJSON(ctx)
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), dataJSON)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, dbQuery, userID).Return(nil, tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		dataJSON, err := m.GetOptOutListJSON(ctx)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		assert.Nil(t, dataJSON)
		db.AssertExpectations(t)
	})
}

func TestGetSubscriptors(t *testing.T) {
	dbQueryPkg := "select get_package_subscriptors($1::uuid, $2::integer)"
	dbQueryRepo := "select get_repository_subscriptors($1::uuid, $2::integer)"
	ctx := context.Background()
	pkgNewReleaseEvent := &hub.Event{
		PackageID: packageID,
		EventKind: hub.NewRelease,
	}
	repoTrackingErrorsEvent := &hub.Event{
		RepositoryID: repositoryID,
		EventKind:    hub.RepositoryTrackingErrors,
	}
	repoOwnershipClaimEvent := &hub.Event{
		RepositoryID: repositoryID,
		EventKind:    hub.RepositoryOwnershipClaim,
		Data: map[string]interface{}{
			"subscriptors": []map[string]string{
				{"user_id": "00000000-0000-0000-0000-000000000001"},
				{"user_id": "00000000-0000-0000-0000-000000000002"},
			},
		},
	}

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, dbQueryPkg, packageID, hub.EventKind(0)).Return(nil, tests.ErrFakeDatabaseFailure)
		m := NewManager(db)

		subscriptors, err := m.GetSubscriptors(ctx, pkgNewReleaseEvent)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		assert.Nil(t, subscriptors)
		db.AssertExpectations(t)
	})

	t.Run("database query succeeded (pkg new release event)", func(t *testing.T) {
		expectedSubscriptors := []*hub.User{
			{
				UserID: "00000000-0000-0000-0000-000000000001",
			},
			{
				UserID: "00000000-0000-0000-0000-000000000002",
			},
		}

		db := &tests.DBMock{}
		db.On("QueryRow", ctx, dbQueryPkg, packageID, pkgNewReleaseEvent.EventKind).Return([]byte(`
		[
			{
				"user_id": "00000000-0000-0000-0000-000000000001"
			},
			{
				"user_id": "00000000-0000-0000-0000-000000000002"
			}
		]
		`), nil)
		m := NewManager(db)

		subscriptors, err := m.GetSubscriptors(context.Background(), pkgNewReleaseEvent)
		assert.NoError(t, err)
		assert.Equal(t, expectedSubscriptors, subscriptors)
		db.AssertExpectations(t)
	})

	t.Run("database query succeeded (repo tracking errors event)", func(t *testing.T) {
		expectedSubscriptors := []*hub.User{
			{
				UserID: "00000000-0000-0000-0000-000000000001",
			},
			{
				UserID: "00000000-0000-0000-0000-000000000002",
			},
		}

		db := &tests.DBMock{}
		m := NewManager(nil)

		subscriptors, err := m.GetSubscriptors(context.Background(), repoOwnershipClaimEvent)
		assert.NoError(t, err)
		assert.Equal(t, expectedSubscriptors, subscriptors)
		db.AssertExpectations(t)
	})

	t.Run("database query succeeded (repo ownership claim event)", func(t *testing.T) {
		expectedSubscriptors := []*hub.User{
			{
				UserID: "00000000-0000-0000-0000-000000000001",
			},
			{
				UserID: "00000000-0000-0000-0000-000000000002",
			},
		}

		db := &tests.DBMock{}
		db.On("QueryRow", ctx, dbQueryRepo, repositoryID, repoTrackingErrorsEvent.EventKind).Return([]byte(`
		[
			{
				"user_id": "00000000-0000-0000-0000-000000000001"
			},
			{
				"user_id": "00000000-0000-0000-0000-000000000002"
			}
		]
		`), nil)
		m := NewManager(db)

		subscriptors, err := m.GetSubscriptors(context.Background(), repoTrackingErrorsEvent)
		assert.NoError(t, err)
		assert.Equal(t, expectedSubscriptors, subscriptors)
		db.AssertExpectations(t)
	})
}
