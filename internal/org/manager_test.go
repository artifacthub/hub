package org

import (
	"context"
	"errors"
	"fmt"
	"testing"

	"github.com/artifacthub/hub/internal/email"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/artifacthub/hub/internal/util"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestAdd(t *testing.T) {
	dbQuery := `select add_organization($1::uuid, $2::jsonb)`
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		m := NewManager(nil, nil)
		assert.Panics(t, func() {
			_ = m.Add(context.Background(), &hub.Organization{})
		})
	})

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg string
			org    *hub.Organization
		}{
			{
				"name not provided",
				&hub.Organization{
					Name: "",
				},
			},
			{
				"invalid name",
				&hub.Organization{
					Name: "_org1",
				},
			},
			{
				"invalid name",
				&hub.Organization{
					Name: "UPPERCASE",
				},
			},
			{
				"invalid logo image id",
				&hub.Organization{
					Name:        "org1",
					LogoImageID: "invalid",
				},
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				m := NewManager(nil, nil)
				err := m.Add(ctx, tc.org)
				assert.True(t, errors.Is(err, ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	t.Run("database query succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", ctx, dbQuery, "userID", mock.Anything).Return(nil)
		m := NewManager(db, nil)

		err := m.Add(ctx, &hub.Organization{Name: "org1"})
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", ctx, dbQuery, "userID", mock.Anything).Return(tests.ErrFakeDatabaseFailure)
		m := NewManager(db, nil)

		err := m.Add(ctx, &hub.Organization{Name: "org1"})
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		db.AssertExpectations(t)
	})
}

func TestAddMember(t *testing.T) {
	dbQueryAddMember := `select add_organization_member($1::uuid, $2::text, $3::text)`
	dbQueryGetUserEmail := `select email from "user" where alias = $1`
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		m := NewManager(nil, nil)
		assert.Panics(t, func() {
			_ = m.AddMember(context.Background(), "orgName", "userAlias", "")
		})
	})

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg    string
			orgName   string
			userAlias string
			baseURL   string
		}{
			{
				"organization name not provided",
				"",
				"user1",
				"https://baseurl.com",
			},
			{
				"user alias not provided",
				"org1",
				"",
				"https://baseurl.com",
			},
			{
				"base url not provided",
				"org1",
				"user1",
				"",
			},
			{
				"invalid base url",
				"org1",
				"user1",
				"/invalid",
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				m := NewManager(nil, nil)
				err := m.AddMember(ctx, tc.orgName, tc.userAlias, tc.baseURL)
				assert.True(t, errors.Is(err, ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	t.Run("database query succeeded", func(t *testing.T) {
		testCases := []struct {
			description         string
			emailSenderResponse error
		}{
			{
				"organization invitation email sent successfully",
				nil,
			},
			{
				"error sending organization invitation email",
				email.ErrFakeSenderFailure,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				db := &tests.DBMock{}
				db.On("Exec", ctx, dbQueryAddMember, "userID", "orgName", "userAlias").Return(nil)
				db.On("QueryRow", ctx, dbQueryGetUserEmail, mock.Anything).Return("email", nil)
				es := &email.SenderMock{}
				es.On("SendEmail", mock.Anything).Return(tc.emailSenderResponse)
				m := NewManager(db, es)

				err := m.AddMember(ctx, "orgName", "userAlias", "http://baseurl.com")
				assert.Equal(t, tc.emailSenderResponse, err)
				db.AssertExpectations(t)
				es.AssertExpectations(t)
			})
		}
	})

	t.Run("database error", func(t *testing.T) {
		testCases := []struct {
			dbErr         error
			expectedError error
		}{
			{
				tests.ErrFakeDatabaseFailure,
				tests.ErrFakeDatabaseFailure,
			},
			{
				util.ErrDBInsufficientPrivilege,
				hub.ErrInsufficientPrivilege,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.dbErr.Error(), func(t *testing.T) {
				db := &tests.DBMock{}
				db.On("Exec", ctx, dbQueryAddMember, "userID", "orgName", "userAlias").Return(tc.dbErr)
				m := NewManager(db, nil)

				err := m.AddMember(ctx, "orgName", "userAlias", "http://baseurl.com")
				assert.Equal(t, tc.expectedError, err)
				db.AssertExpectations(t)
			})
		}
	})
}

func TestCheckAvailability(t *testing.T) {
	ctx := context.Background()

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg       string
			resourceKind string
			value        string
		}{
			{
				"invalid resource kind",
				"invalid",
				"value",
			},
			{
				"invalid value",
				"organizationName",
				"",
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				m := NewManager(nil, nil)
				_, err := m.CheckAvailability(context.Background(), tc.resourceKind, tc.value)
				assert.True(t, errors.Is(err, ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	t.Run("database query succeeded", func(t *testing.T) {
		testCases := []struct {
			resourceKind string
			dbQuery      string
			available    bool
		}{
			{
				"organizationName",
				`select organization_id from organization where name = $1`,
				true,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(fmt.Sprintf("resource kind: %s", tc.resourceKind), func(t *testing.T) {
				tc.dbQuery = fmt.Sprintf("select not exists (%s)", tc.dbQuery)
				db := &tests.DBMock{}
				db.On("QueryRow", ctx, tc.dbQuery, "value").Return(tc.available, nil)
				m := NewManager(db, nil)

				available, err := m.CheckAvailability(ctx, tc.resourceKind, "value")
				assert.NoError(t, err)
				assert.Equal(t, tc.available, available)
				db.AssertExpectations(t)
			})
		}
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		dbQuery := `select not exists (select organization_id from organization where name = $1)`
		db.On("QueryRow", ctx, dbQuery, "value").Return(false, tests.ErrFakeDatabaseFailure)
		m := NewManager(db, nil)

		available, err := m.CheckAvailability(context.Background(), "organizationName", "value")
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		assert.False(t, available)
		db.AssertExpectations(t)
	})
}

func TestConfirmMembership(t *testing.T) {
	dbQuery := `select confirm_organization_membership($1::uuid, $2::text)`
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		m := NewManager(nil, nil)
		assert.Panics(t, func() {
			_ = m.ConfirmMembership(context.Background(), "orgName")
		})
	})

	t.Run("invalid input", func(t *testing.T) {
		m := NewManager(nil, nil)
		err := m.ConfirmMembership(ctx, "")
		assert.True(t, errors.Is(err, ErrInvalidInput))
	})

	t.Run("database query succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", ctx, dbQuery, "userID", "orgName").Return(nil)
		m := NewManager(db, nil)

		err := m.ConfirmMembership(ctx, "orgName")
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", ctx, dbQuery, "userID", "orgName").Return(tests.ErrFakeDatabaseFailure)
		m := NewManager(db, nil)

		err := m.ConfirmMembership(ctx, "orgName")
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		db.AssertExpectations(t)
	})
}

func TestDeleteMember(t *testing.T) {
	dbQuery := `select delete_organization_member($1::uuid, $2::text, $3::text)`
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		m := NewManager(nil, nil)
		assert.Panics(t, func() {
			_ = m.DeleteMember(context.Background(), "orgName", "userAlias")
		})
	})

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg    string
			orgName   string
			userAlias string
		}{
			{
				"organization name not provided",
				"",
				"user1",
			},
			{
				"user alias not provided",
				"org1",
				"",
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				m := NewManager(nil, nil)
				err := m.DeleteMember(ctx, tc.orgName, tc.userAlias)
				assert.True(t, errors.Is(err, ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	t.Run("database query succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", ctx, dbQuery, "userID", "orgName", "userAlias").Return(nil)
		m := NewManager(db, nil)

		err := m.DeleteMember(ctx, "orgName", "userAlias")
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		testCases := []struct {
			dbErr         error
			expectedError error
		}{
			{
				tests.ErrFakeDatabaseFailure,
				tests.ErrFakeDatabaseFailure,
			},
			{
				util.ErrDBInsufficientPrivilege,
				hub.ErrInsufficientPrivilege,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.dbErr.Error(), func(t *testing.T) {
				db := &tests.DBMock{}
				db.On("Exec", ctx, dbQuery, "userID", "orgName", "userAlias").Return(tc.dbErr)
				m := NewManager(db, nil)

				err := m.DeleteMember(ctx, "orgName", "userAlias")
				assert.Equal(t, tc.expectedError, err)
				db.AssertExpectations(t)
			})
		}
	})
}

func TestGetByUserJSON(t *testing.T) {
	dbQuery := `select get_user_organizations($1::uuid)`
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		m := NewManager(nil, nil)
		assert.Panics(t, func() {
			_, _ = m.GetByUserJSON(context.Background())
		})
	})

	t.Run("database query succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, dbQuery, "userID").Return([]byte("dataJSON"), nil)
		m := NewManager(db, nil)

		dataJSON, err := m.GetByUserJSON(ctx)
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), dataJSON)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, dbQuery, "userID").Return(nil, tests.ErrFakeDatabaseFailure)
		m := NewManager(db, nil)

		dataJSON, err := m.GetByUserJSON(ctx)
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		assert.Nil(t, dataJSON)
		db.AssertExpectations(t)
	})
}

func TestGetJSON(t *testing.T) {
	dbQuery := `select get_organization($1::text)`
	ctx := context.Background()

	t.Run("invalid input", func(t *testing.T) {
		m := NewManager(nil, nil)
		_, err := m.GetJSON(context.Background(), "")
		assert.True(t, errors.Is(err, ErrInvalidInput))
	})

	t.Run("database query succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, dbQuery, "orgName").Return([]byte("dataJSON"), nil)
		m := NewManager(db, nil)

		dataJSON, err := m.GetJSON(ctx, "orgName")
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), dataJSON)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, dbQuery, "orgName").Return(nil, tests.ErrFakeDatabaseFailure)
		m := NewManager(db, nil)

		dataJSON, err := m.GetJSON(ctx, "orgName")
		assert.Equal(t, tests.ErrFakeDatabaseFailure, err)
		assert.Nil(t, dataJSON)
		db.AssertExpectations(t)
	})
}

func TestGetMembersJSON(t *testing.T) {
	dbQuery := `select get_organization_members($1::uuid, $2::text)`
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		m := NewManager(nil, nil)
		assert.Panics(t, func() {
			_, _ = m.GetMembersJSON(context.Background(), "orgName")
		})
	})

	t.Run("invalid input", func(t *testing.T) {
		m := NewManager(nil, nil)
		_, err := m.GetMembersJSON(ctx, "")
		assert.True(t, errors.Is(err, ErrInvalidInput))
	})

	t.Run("database query succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, dbQuery, "userID", "orgName").Return([]byte("dataJSON"), nil)
		m := NewManager(db, nil)

		dataJSON, err := m.GetMembersJSON(ctx, "orgName")
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), dataJSON)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		testCases := []struct {
			dbErr         error
			expectedError error
		}{
			{
				tests.ErrFakeDatabaseFailure,
				tests.ErrFakeDatabaseFailure,
			},
			{
				util.ErrDBInsufficientPrivilege,
				hub.ErrInsufficientPrivilege,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.dbErr.Error(), func(t *testing.T) {
				db := &tests.DBMock{}
				db.On("QueryRow", ctx, dbQuery, "userID", "orgName").Return(nil, tc.dbErr)
				m := NewManager(db, nil)

				dataJSON, err := m.GetMembersJSON(ctx, "orgName")
				assert.Equal(t, tc.expectedError, err)
				assert.Nil(t, dataJSON)
				db.AssertExpectations(t)
			})
		}
	})
}

func TestUpdate(t *testing.T) {
	dbQuery := `select update_organization($1::uuid, $2::jsonb)`
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		m := NewManager(nil, nil)
		assert.Panics(t, func() {
			_ = m.Update(context.Background(), &hub.Organization{})
		})
	})

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg string
			org    *hub.Organization
		}{
			{
				"invalid logo image id",
				&hub.Organization{
					Name:        "org1",
					LogoImageID: "invalid",
				},
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				m := NewManager(nil, nil)
				err := m.Update(ctx, tc.org)
				assert.True(t, errors.Is(err, ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	t.Run("database query succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", ctx, dbQuery, "userID", mock.Anything).Return(nil)
		m := NewManager(db, nil)

		err := m.Update(ctx, &hub.Organization{})
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		testCases := []struct {
			dbErr         error
			expectedError error
		}{
			{
				tests.ErrFakeDatabaseFailure,
				tests.ErrFakeDatabaseFailure,
			},
			{
				util.ErrDBInsufficientPrivilege,
				hub.ErrInsufficientPrivilege,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.dbErr.Error(), func(t *testing.T) {
				db := &tests.DBMock{}
				db.On("Exec", ctx, dbQuery, "userID", mock.Anything).Return(tc.dbErr)
				m := NewManager(db, nil)

				err := m.Update(ctx, &hub.Organization{})
				assert.Equal(t, tc.expectedError, err)
				db.AssertExpectations(t)
			})
		}
	})
}
