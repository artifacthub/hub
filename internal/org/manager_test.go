package org

import (
	"context"
	"errors"
	"testing"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

var (
	errFakeDatabaseFailure    = errors.New("fake database failure")
	errFakeEmailSenderFailure = errors.New("fake email sender failure")
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

	t.Run("database query succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQuery, "userID", mock.Anything).Return(nil)
		m := NewManager(db, nil)

		err := m.Add(ctx, &hub.Organization{})
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQuery, "userID", mock.Anything).Return(errFakeDatabaseFailure)
		m := NewManager(db, nil)

		err := m.Add(ctx, &hub.Organization{})
		assert.Equal(t, errFakeDatabaseFailure, err)
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
				errFakeEmailSenderFailure,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.description, func(t *testing.T) {
				db := &tests.DBMock{}
				db.On("Exec", dbQueryAddMember, "userID", "orgName", "userAlias").Return(nil)
				db.On("QueryRow", dbQueryGetUserEmail, mock.Anything).Return("email", nil)
				es := &tests.EmailSenderMock{}
				es.On("SendEmail", mock.Anything).Return(tc.emailSenderResponse)
				m := NewManager(db, es)

				err := m.AddMember(ctx, "orgName", "userAlias", "")
				assert.Equal(t, tc.emailSenderResponse, err)
				db.AssertExpectations(t)
				es.AssertExpectations(t)
			})
		}
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQueryAddMember, "userID", "orgName", "userAlias").
			Return(errFakeDatabaseFailure)
		m := NewManager(db, nil)

		err := m.AddMember(ctx, "orgName", "userAlias", "")
		assert.Equal(t, errFakeDatabaseFailure, err)
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

	t.Run("database query succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQuery, "userID", "orgName").Return(nil)
		m := NewManager(db, nil)

		err := m.ConfirmMembership(ctx, "orgName")
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQuery, "userID", "orgName").Return(errFakeDatabaseFailure)
		m := NewManager(db, nil)

		err := m.ConfirmMembership(ctx, "orgName")
		assert.Equal(t, errFakeDatabaseFailure, err)
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

	t.Run("database query succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQuery, "userID", "orgName", "userAlias").Return(nil)
		m := NewManager(db, nil)

		err := m.DeleteMember(ctx, "orgName", "userAlias")
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQuery, "userID", "orgName", "userAlias").Return(errFakeDatabaseFailure)
		m := NewManager(db, nil)

		err := m.DeleteMember(ctx, "orgName", "userAlias")
		assert.Equal(t, errFakeDatabaseFailure, err)
		db.AssertExpectations(t)
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
		db.On("QueryRow", dbQuery, "userID").Return([]byte("dataJSON"), nil)
		m := NewManager(db, nil)

		dataJSON, err := m.GetByUserJSON(ctx)
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), dataJSON)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, "userID").Return(nil, errFakeDatabaseFailure)
		m := NewManager(db, nil)

		dataJSON, err := m.GetByUserJSON(ctx)
		assert.Equal(t, errFakeDatabaseFailure, err)
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

	t.Run("database query succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, "userID", "orgName").Return([]byte("dataJSON"), nil)
		m := NewManager(db, nil)

		dataJSON, err := m.GetMembersJSON(ctx, "orgName")
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), dataJSON)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("QueryRow", dbQuery, "userID", "orgName").Return(nil, errFakeDatabaseFailure)
		m := NewManager(db, nil)

		dataJSON, err := m.GetMembersJSON(ctx, "orgName")
		assert.Equal(t, errFakeDatabaseFailure, err)
		assert.Nil(t, dataJSON)
		db.AssertExpectations(t)
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

	t.Run("database query succeeded", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQuery, "userID", mock.Anything).Return(nil)
		m := NewManager(db, nil)

		err := m.Update(ctx, &hub.Organization{})
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		db := &tests.DBMock{}
		db.On("Exec", dbQuery, "userID", mock.Anything).Return(errFakeDatabaseFailure)
		m := NewManager(db, nil)

		err := m.Update(ctx, &hub.Organization{})
		assert.Equal(t, errFakeDatabaseFailure, err)
		db.AssertExpectations(t)
	})
}
