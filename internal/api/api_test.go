package api

import (
	"context"
	"errors"
	"fmt"
	"testing"

	"github.com/artifacthub/hub/internal/tests"
	"github.com/stretchr/testify/assert"
)

var errFakeDatabaseFailure = errors.New("fake database failure")

func TestCheckAvailability(t *testing.T) {
	t.Run("resource kind not supported", func(t *testing.T) {
		a := New(nil, nil)
		_, err := a.CheckAvailability(context.Background(), "invalidKind", "value")
		assert.Error(t, err)
	})

	t.Run("database query succeeded", func(t *testing.T) {
		testCases := []struct {
			resourceKind string
			dbQuery      string
			available    bool
		}{
			{
				"userAlias",
				`select user_id from "user" where alias = $1`,
				true,
			},
			{
				"chartRepositoryName",
				`select chart_repository_id from chart_repository where name = $1`,
				true,
			},
			{
				"chartRepositoryURL",
				`select chart_repository_id from chart_repository where url = $1`,
				false,
			},
			{
				"organizationName",
				`select organization_id from organization where name = $1`,
				false,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(fmt.Sprintf("resource kind: %s", tc.resourceKind), func(t *testing.T) {
				tc.dbQuery = fmt.Sprintf("select not exists (%s)", tc.dbQuery)
				db := &tests.DBMock{}
				db.On("QueryRow", tc.dbQuery, "value").Return(tc.available, nil)
				a := New(db, nil)

				available, err := a.CheckAvailability(context.Background(), tc.resourceKind, "value")
				assert.NoError(t, err)
				assert.Equal(t, tc.available, available)
				db.AssertExpectations(t)
			})
		}
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		dbQuery := `select not exists (select user_id from "user" where alias = $1)`
		db.On("QueryRow", dbQuery, "value").Return(false, errFakeDatabaseFailure)
		a := New(db, nil)

		available, err := a.CheckAvailability(context.Background(), "userAlias", "value")
		assert.Equal(t, errFakeDatabaseFailure, err)
		assert.False(t, available)
		db.AssertExpectations(t)
	})
}
