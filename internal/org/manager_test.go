package org

import (
	"context"
	"errors"
	"fmt"
	"testing"

	"github.com/artifacthub/hub/internal/authz"
	"github.com/artifacthub/hub/internal/email"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/artifacthub/hub/internal/util"
	"github.com/spf13/viper"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

var cfg = viper.New()

func TestAdd(t *testing.T) {
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		t.Parallel()
		m := NewManager(cfg, nil, nil, nil)
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
				t.Parallel()
				m := NewManager(cfg, nil, nil, nil)
				err := m.Add(ctx, tc.org)
				assert.True(t, errors.Is(err, hub.ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	t.Run("database query succeeded", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("Exec", ctx, addOrgDBQ, "userID", mock.Anything).Return(nil)
		m := NewManager(cfg, db, nil, nil)

		err := m.Add(ctx, &hub.Organization{Name: "org1"})
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("Exec", ctx, addOrgDBQ, "userID", mock.Anything).Return(tests.ErrFakeDB)
		m := NewManager(cfg, db, nil, nil)

		err := m.Add(ctx, &hub.Organization{Name: "org1"})
		assert.Equal(t, tests.ErrFakeDB, err)
		db.AssertExpectations(t)
	})
}

func TestAddMember(t *testing.T) {
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		t.Parallel()
		m := NewManager(cfg, nil, nil, nil)
		assert.Panics(t, func() {
			_ = m.AddMember(context.Background(), "orgName", "userAlias")
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
				t.Parallel()
				m := NewManager(cfg, nil, nil, nil)
				err := m.AddMember(ctx, tc.orgName, tc.userAlias)
				assert.True(t, errors.Is(err, hub.ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	t.Run("authorization failed", func(t *testing.T) {
		t.Parallel()
		az := &authz.AuthorizerMock{}
		az.On("Authorize", ctx, &hub.AuthorizeInput{
			OrganizationName: "orgName",
			UserID:           "userID",
			Action:           hub.AddOrganizationMember,
		}).Return(tests.ErrFake)
		m := NewManager(cfg, nil, nil, az)

		err := m.AddMember(ctx, "orgName", "userAlias")
		assert.Equal(t, tests.ErrFake, err)
		az.AssertExpectations(t)
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
				t.Parallel()
				db := &tests.DBMock{}
				db.On("Exec", ctx, addOrgMemberDBQ, "userID", "orgName", "userAlias").Return(nil)
				db.On("QueryRow", ctx, getUserEmailDBQ, mock.Anything).Return("email", nil)
				es := &email.SenderMock{}
				es.On("SendEmail", mock.Anything).Return(tc.emailSenderResponse)
				az := &authz.AuthorizerMock{}
				az.On("Authorize", ctx, &hub.AuthorizeInput{
					OrganizationName: "orgName",
					UserID:           "userID",
					Action:           hub.AddOrganizationMember,
				}).Return(nil)
				m := NewManager(cfg, db, es, az)

				err := m.AddMember(ctx, "orgName", "userAlias")
				assert.Equal(t, tc.emailSenderResponse, err)
				db.AssertExpectations(t)
				es.AssertExpectations(t)
				az.AssertExpectations(t)
			})
		}
	})

	t.Run("database error", func(t *testing.T) {
		testCases := []struct {
			dbErr         error
			expectedError error
		}{
			{
				tests.ErrFakeDB,
				tests.ErrFakeDB,
			},
			{
				util.ErrDBInsufficientPrivilege,
				hub.ErrInsufficientPrivilege,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.dbErr.Error(), func(t *testing.T) {
				t.Parallel()
				db := &tests.DBMock{}
				db.On("Exec", ctx, addOrgMemberDBQ, "userID", "orgName", "userAlias").Return(tc.dbErr)
				az := &authz.AuthorizerMock{}
				az.On("Authorize", ctx, &hub.AuthorizeInput{
					OrganizationName: "orgName",
					UserID:           "userID",
					Action:           hub.AddOrganizationMember,
				}).Return(nil)
				m := NewManager(cfg, db, nil, az)

				err := m.AddMember(ctx, "orgName", "userAlias")
				assert.Equal(t, tc.expectedError, err)
				db.AssertExpectations(t)
				az.AssertExpectations(t)
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
				t.Parallel()
				m := NewManager(cfg, nil, nil, nil)
				_, err := m.CheckAvailability(context.Background(), tc.resourceKind, tc.value)
				assert.True(t, errors.Is(err, hub.ErrInvalidInput))
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
				checkOrgNameAvailDBQ,
				true,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(fmt.Sprintf("resource kind: %s", tc.resourceKind), func(t *testing.T) {
				t.Parallel()
				tc.dbQuery = fmt.Sprintf("select not exists (%s)", tc.dbQuery)
				db := &tests.DBMock{}
				db.On("QueryRow", ctx, tc.dbQuery, "value").Return(tc.available, nil)
				m := NewManager(cfg, db, nil, nil)

				available, err := m.CheckAvailability(ctx, tc.resourceKind, "value")
				assert.NoError(t, err)
				assert.Equal(t, tc.available, available)
				db.AssertExpectations(t)
			})
		}
	})

	t.Run("database error", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		dbQuery := fmt.Sprintf(`select not exists (%s)`, checkOrgNameAvailDBQ)
		db.On("QueryRow", ctx, dbQuery, "value").Return(false, tests.ErrFakeDB)
		m := NewManager(cfg, db, nil, nil)

		available, err := m.CheckAvailability(context.Background(), "organizationName", "value")
		assert.Equal(t, tests.ErrFakeDB, err)
		assert.False(t, available)
		db.AssertExpectations(t)
	})
}

func TestConfirmMembership(t *testing.T) {
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		t.Parallel()
		m := NewManager(cfg, nil, nil, nil)
		assert.Panics(t, func() {
			_ = m.ConfirmMembership(context.Background(), "orgName")
		})
	})

	t.Run("invalid input", func(t *testing.T) {
		t.Parallel()
		m := NewManager(cfg, nil, nil, nil)
		err := m.ConfirmMembership(ctx, "")
		assert.True(t, errors.Is(err, hub.ErrInvalidInput))
	})

	t.Run("database query succeeded", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("Exec", ctx, confirmMembershipDBQ, "userID", "orgName").Return(nil)
		m := NewManager(cfg, db, nil, nil)

		err := m.ConfirmMembership(ctx, "orgName")
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("Exec", ctx, confirmMembershipDBQ, "userID", "orgName").Return(tests.ErrFakeDB)
		m := NewManager(cfg, db, nil, nil)

		err := m.ConfirmMembership(ctx, "orgName")
		assert.Equal(t, tests.ErrFakeDB, err)
		db.AssertExpectations(t)
	})
}

func TestDelete(t *testing.T) {
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		t.Parallel()
		m := NewManager(cfg, nil, nil, nil)
		assert.Panics(t, func() {
			_ = m.Delete(context.Background(), "org1")
		})
	})

	t.Run("invalid input", func(t *testing.T) {
		t.Parallel()
		m := NewManager(cfg, nil, nil, nil)
		err := m.Delete(ctx, "")
		assert.True(t, errors.Is(err, hub.ErrInvalidInput))
		assert.Contains(t, err.Error(), "name not provided")
	})

	t.Run("authorization failed", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		az := &authz.AuthorizerMock{}
		az.On("Authorize", ctx, &hub.AuthorizeInput{
			OrganizationName: "org1",
			UserID:           "userID",
			Action:           hub.DeleteOrganization,
		}).Return(tests.ErrFake)
		m := NewManager(cfg, db, nil, az)

		err := m.Delete(ctx, "org1")
		assert.Equal(t, tests.ErrFake, err)
		az.AssertExpectations(t)
	})

	t.Run("database query succeeded", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("Exec", ctx, deleteOrgDBQ, "userID", "org1").Return(nil)
		az := &authz.AuthorizerMock{}
		az.On("Authorize", ctx, &hub.AuthorizeInput{
			OrganizationName: "org1",
			UserID:           "userID",
			Action:           hub.DeleteOrganization,
		}).Return(nil)
		m := NewManager(cfg, db, nil, az)

		err := m.Delete(ctx, "org1")
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("Exec", ctx, deleteOrgDBQ, "userID", "org1").Return(tests.ErrFakeDB)
		az := &authz.AuthorizerMock{}
		az.On("Authorize", ctx, &hub.AuthorizeInput{
			OrganizationName: "org1",
			UserID:           "userID",
			Action:           hub.DeleteOrganization,
		}).Return(nil)
		m := NewManager(cfg, db, nil, az)

		err := m.Delete(ctx, "org1")
		assert.Equal(t, tests.ErrFakeDB, err)
		db.AssertExpectations(t)
	})
}

func TestDeleteMember(t *testing.T) {
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		t.Parallel()
		m := NewManager(cfg, nil, nil, nil)
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
				t.Parallel()
				m := NewManager(cfg, nil, nil, nil)
				err := m.DeleteMember(ctx, tc.orgName, tc.userAlias)
				assert.True(t, errors.Is(err, hub.ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	t.Run("get requesting user alias failed", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getUserAliasDBQ, "userID").Return("", tests.ErrFakeDB)
		m := NewManager(cfg, db, nil, nil)

		err := m.DeleteMember(ctx, "orgName", "userAlias")
		assert.Error(t, err)
		db.AssertExpectations(t)
	})

	t.Run("authorization failed", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getUserAliasDBQ, "userID").Return("requestingUserAlias", nil)
		az := &authz.AuthorizerMock{}
		az.On("Authorize", ctx, &hub.AuthorizeInput{
			OrganizationName: "orgName",
			UserID:           "userID",
			Action:           hub.DeleteOrganizationMember,
		}).Return(tests.ErrFake)
		m := NewManager(cfg, db, nil, az)

		err := m.DeleteMember(ctx, "orgName", "userAlias")
		assert.Equal(t, tests.ErrFake, err)
		az.AssertExpectations(t)
	})

	t.Run("member deleted successfully", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getUserAliasDBQ, "userID").Return("requestingUserAlias", nil)
		db.On("Exec", ctx, deleteOrgMemberDBQ, "userID", "orgName", "userAlias").Return(nil)
		az := &authz.AuthorizerMock{}
		az.On("Authorize", ctx, &hub.AuthorizeInput{
			OrganizationName: "orgName",
			UserID:           "userID",
			Action:           hub.DeleteOrganizationMember,
		}).Return(nil)
		m := NewManager(cfg, db, nil, az)

		err := m.DeleteMember(ctx, "orgName", "userAlias")
		assert.NoError(t, err)
		db.AssertExpectations(t)
		az.AssertExpectations(t)
	})

	t.Run("user left organization successfully", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getUserAliasDBQ, "userID").Return("userAlias", nil)
		db.On("Exec", ctx, deleteOrgMemberDBQ, "userID", "orgName", "userAlias").Return(nil)
		m := NewManager(cfg, db, nil, nil)

		err := m.DeleteMember(ctx, "orgName", "userAlias")
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})

	t.Run("error deleting member", func(t *testing.T) {
		testCases := []struct {
			dbErr         error
			expectedError error
		}{
			{
				tests.ErrFakeDB,
				tests.ErrFakeDB,
			},
			{
				util.ErrDBInsufficientPrivilege,
				hub.ErrInsufficientPrivilege,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.dbErr.Error(), func(t *testing.T) {
				t.Parallel()
				db := &tests.DBMock{}
				db.On("QueryRow", ctx, getUserAliasDBQ, "userID").Return("requestingUserAlias", nil)
				db.On("Exec", ctx, deleteOrgMemberDBQ, "userID", "orgName", "userAlias").Return(tc.dbErr)
				az := &authz.AuthorizerMock{}
				az.On("Authorize", ctx, &hub.AuthorizeInput{
					OrganizationName: "orgName",
					UserID:           "userID",
					Action:           hub.DeleteOrganizationMember,
				}).Return(nil)
				m := NewManager(cfg, db, nil, az)

				err := m.DeleteMember(ctx, "orgName", "userAlias")
				assert.Equal(t, tc.expectedError, err)
				db.AssertExpectations(t)
				az.AssertExpectations(t)
			})
		}
	})
}

func TestGetAuthorizationPolicyJSON(t *testing.T) {
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		t.Parallel()
		m := NewManager(cfg, nil, nil, nil)
		assert.Panics(t, func() {
			_, _ = m.GetAuthorizationPolicyJSON(context.Background(), "org1")
		})
	})

	t.Run("invalid input", func(t *testing.T) {
		t.Parallel()
		m := NewManager(cfg, nil, nil, nil)
		_, err := m.GetAuthorizationPolicyJSON(ctx, "")
		assert.True(t, errors.Is(err, hub.ErrInvalidInput))
	})

	t.Run("authorization failed", func(t *testing.T) {
		t.Parallel()
		az := &authz.AuthorizerMock{}
		az.On("Authorize", ctx, &hub.AuthorizeInput{
			OrganizationName: "org1",
			UserID:           "userID",
			Action:           hub.GetAuthorizationPolicy,
		}).Return(tests.ErrFake)
		m := NewManager(cfg, nil, nil, az)

		dataJSON, err := m.GetAuthorizationPolicyJSON(ctx, "org1")
		assert.Equal(t, tests.ErrFake, err)
		assert.Nil(t, dataJSON)
		az.AssertExpectations(t)
	})

	t.Run("database query succeeded", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getAuthzPolicyDBQ, "userID", "org1").Return([]byte("dataJSON"), nil)
		az := &authz.AuthorizerMock{}
		az.On("Authorize", ctx, &hub.AuthorizeInput{
			OrganizationName: "org1",
			UserID:           "userID",
			Action:           hub.GetAuthorizationPolicy,
		}).Return(nil)
		m := NewManager(cfg, db, nil, az)

		dataJSON, err := m.GetAuthorizationPolicyJSON(ctx, "org1")
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), dataJSON)
		db.AssertExpectations(t)
		az.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		testCases := []struct {
			dbErr         error
			expectedError error
		}{
			{
				tests.ErrFakeDB,
				tests.ErrFakeDB,
			},
			{
				util.ErrDBInsufficientPrivilege,
				hub.ErrInsufficientPrivilege,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.dbErr.Error(), func(t *testing.T) {
				t.Parallel()
				db := &tests.DBMock{}
				db.On("QueryRow", ctx, getAuthzPolicyDBQ, "userID", "org1").Return(nil, tc.dbErr)
				az := &authz.AuthorizerMock{}
				az.On("Authorize", ctx, &hub.AuthorizeInput{
					OrganizationName: "org1",
					UserID:           "userID",
					Action:           hub.GetAuthorizationPolicy,
				}).Return(nil)
				m := NewManager(cfg, db, nil, az)

				dataJSON, err := m.GetAuthorizationPolicyJSON(ctx, "org1")
				assert.Equal(t, tc.expectedError, err)
				assert.Nil(t, dataJSON)
				db.AssertExpectations(t)
				az.AssertExpectations(t)
			})
		}
	})
}

func TestGetByUserJSON(t *testing.T) {
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")
	p := &hub.Pagination{Limit: 10, Offset: 1}

	t.Run("user id not found in ctx", func(t *testing.T) {
		t.Parallel()
		m := NewManager(cfg, nil, nil, nil)
		assert.Panics(t, func() {
			_, _ = m.GetByUserJSON(context.Background(), p)
		})
	})

	t.Run("database query succeeded", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getUserOrgsDBQ, "userID", 10, 1).Return([]interface{}{[]byte("dataJSON"), 1}, nil)
		m := NewManager(cfg, db, nil, nil)

		result, err := m.GetByUserJSON(ctx, p)
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), result.Data)
		assert.Equal(t, 1, result.TotalCount)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getUserOrgsDBQ, "userID", 10, 1).Return(nil, tests.ErrFakeDB)
		m := NewManager(cfg, db, nil, nil)

		dataJSON, err := m.GetByUserJSON(ctx, p)
		assert.Equal(t, tests.ErrFakeDB, err)
		assert.Nil(t, dataJSON)
		db.AssertExpectations(t)
	})
}

func TestGetJSON(t *testing.T) {
	ctx := context.Background()

	t.Run("invalid input", func(t *testing.T) {
		t.Parallel()
		m := NewManager(cfg, nil, nil, nil)
		_, err := m.GetJSON(context.Background(), "")
		assert.True(t, errors.Is(err, hub.ErrInvalidInput))
	})

	t.Run("database query succeeded", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getOrgDBQ, "orgName").Return([]byte("dataJSON"), nil)
		m := NewManager(cfg, db, nil, nil)

		dataJSON, err := m.GetJSON(ctx, "orgName")
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), dataJSON)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getOrgDBQ, "orgName").Return(nil, tests.ErrFakeDB)
		m := NewManager(cfg, db, nil, nil)

		dataJSON, err := m.GetJSON(ctx, "orgName")
		assert.Equal(t, tests.ErrFakeDB, err)
		assert.Nil(t, dataJSON)
		db.AssertExpectations(t)
	})
}

func TestGetMembersJSON(t *testing.T) {
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")
	p := &hub.Pagination{Limit: 10, Offset: 1}

	t.Run("user id not found in ctx", func(t *testing.T) {
		t.Parallel()
		m := NewManager(cfg, nil, nil, nil)
		assert.Panics(t, func() {
			_, _ = m.GetMembersJSON(context.Background(), "orgName", p)
		})
	})

	t.Run("invalid input", func(t *testing.T) {
		t.Parallel()
		m := NewManager(cfg, nil, nil, nil)
		_, err := m.GetMembersJSON(ctx, "", p)
		assert.True(t, errors.Is(err, hub.ErrInvalidInput))
	})

	t.Run("database query succeeded", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getOrgMembersDBQ, "userID", "orgName", 10, 1).
			Return([]interface{}{[]byte("dataJSON"), 1}, nil)
		m := NewManager(cfg, db, nil, nil)

		result, err := m.GetMembersJSON(ctx, "orgName", p)
		assert.NoError(t, err)
		assert.Equal(t, []byte("dataJSON"), result.Data)
		assert.Equal(t, 1, result.TotalCount)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		testCases := []struct {
			dbErr         error
			expectedError error
		}{
			{
				tests.ErrFakeDB,
				tests.ErrFakeDB,
			},
			{
				util.ErrDBInsufficientPrivilege,
				hub.ErrInsufficientPrivilege,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.dbErr.Error(), func(t *testing.T) {
				t.Parallel()
				db := &tests.DBMock{}
				db.On("QueryRow", ctx, getOrgMembersDBQ, "userID", "orgName", 10, 1).Return(nil, tc.dbErr)
				m := NewManager(cfg, db, nil, nil)

				result, err := m.GetMembersJSON(ctx, "orgName", p)
				assert.Equal(t, tc.expectedError, err)
				assert.Nil(t, result)
				db.AssertExpectations(t)
			})
		}
	})
}

func TestUpdate(t *testing.T) {
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")

	t.Run("user id not found in ctx", func(t *testing.T) {
		t.Parallel()
		m := NewManager(cfg, nil, nil, nil)
		assert.Panics(t, func() {
			_ = m.Update(context.Background(), "org1", &hub.Organization{})
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
				t.Parallel()
				m := NewManager(cfg, nil, nil, nil)
				err := m.Update(ctx, "org1", tc.org)
				assert.True(t, errors.Is(err, hub.ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	t.Run("authorization failed", func(t *testing.T) {
		t.Parallel()
		az := &authz.AuthorizerMock{}
		az.On("Authorize", ctx, &hub.AuthorizeInput{
			OrganizationName: "org1",
			UserID:           "userID",
			Action:           hub.UpdateOrganization,
		}).Return(tests.ErrFake)
		m := NewManager(cfg, nil, nil, az)

		err := m.Update(ctx, "org1", &hub.Organization{
			Name:        "org1",
			DisplayName: "Organization 1 updated",
		})
		assert.Equal(t, tests.ErrFake, err)
		az.AssertExpectations(t)
	})

	t.Run("database query succeeded", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("Exec", ctx, updateOrgDBQ, "userID", "org1", mock.Anything).Return(nil)
		az := &authz.AuthorizerMock{}
		az.On("Authorize", ctx, &hub.AuthorizeInput{
			OrganizationName: "org1",
			UserID:           "userID",
			Action:           hub.UpdateOrganization,
		}).Return(nil)
		m := NewManager(cfg, db, nil, az)

		err := m.Update(ctx, "org1", &hub.Organization{
			Name:        "org1",
			DisplayName: "Organization 1 updated",
		})
		assert.NoError(t, err)
		db.AssertExpectations(t)
		az.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		testCases := []struct {
			dbErr         error
			expectedError error
		}{
			{
				tests.ErrFakeDB,
				tests.ErrFakeDB,
			},
			{
				util.ErrDBInsufficientPrivilege,
				hub.ErrInsufficientPrivilege,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.dbErr.Error(), func(t *testing.T) {
				t.Parallel()
				db := &tests.DBMock{}
				db.On("Exec", ctx, updateOrgDBQ, "userID", "org1", mock.Anything).Return(tc.dbErr)
				az := &authz.AuthorizerMock{}
				az.On("Authorize", ctx, &hub.AuthorizeInput{
					OrganizationName: "org1",
					UserID:           "userID",
					Action:           hub.UpdateOrganization,
				}).Return(nil)
				m := NewManager(cfg, db, nil, az)

				err := m.Update(ctx, "org1", &hub.Organization{
					Name:        "org1",
					DisplayName: "Organization 1 updated",
				})
				assert.Equal(t, tc.expectedError, err)
				db.AssertExpectations(t)
				az.AssertExpectations(t)
			})
		}
	})
}

func TestUpdateAuthorizationPolicy(t *testing.T) {
	ctx := context.WithValue(context.Background(), hub.UserIDKey, "userID")
	validPolicy := &hub.AuthorizationPolicy{
		AuthorizationEnabled: true,
		PredefinedPolicy:     "rbac.v1",
		PolicyData:           []byte(`"{\"k\": \"v\"}"`),
	}

	t.Run("user id not found in ctx", func(t *testing.T) {
		t.Parallel()
		m := NewManager(cfg, nil, nil, nil)
		assert.Panics(t, func() {
			_ = m.UpdateAuthorizationPolicy(context.Background(), "org1", &hub.AuthorizationPolicy{})
		})
	})

	t.Run("invalid input", func(t *testing.T) {
		testCases := []struct {
			errMsg  string
			orgName string
			policy  *hub.AuthorizationPolicy
		}{
			{
				"organization name not provided",
				"",
				nil,
			},
			{
				"authorization policy not provided",
				"org1",
				nil,
			},
			{
				"both predefined and custom policies were provided",
				"org1",
				&hub.AuthorizationPolicy{
					AuthorizationEnabled: true,
					PredefinedPolicy:     "policy",
					CustomPolicy:         "policy",
				},
			},
			{
				"a predefined or custom policy must be provided",
				"org1",
				&hub.AuthorizationPolicy{
					AuthorizationEnabled: true,
					PredefinedPolicy:     "",
					CustomPolicy:         "",
				},
			},
			{
				"invalid predefined policy",
				"org1",
				&hub.AuthorizationPolicy{
					PredefinedPolicy: "invalid",
				},
			},
			{
				"invalid custom policy",
				"org1",
				&hub.AuthorizationPolicy{
					CustomPolicy: "invalid",
				},
			},
			{
				"allowed actions rule not found in custom policy",
				"org1",
				&hub.AuthorizationPolicy{
					CustomPolicy: `package artifacthub.authz`,
				},
			},
			{
				"invalid policy data",
				"org1",
				&hub.AuthorizationPolicy{
					CustomPolicy: `
					package artifacthub.authz

					allowed_actions[action] { action := "all" }
					`,
					PolicyData: []byte("{invalidJSON"),
				},
			},
			{
				"invalid policy data",
				"org1",
				&hub.AuthorizationPolicy{
					CustomPolicy: `
					package artifacthub.authz

					allowed_actions[action] { action := "all" }
					`,
					PolicyData: []byte(`"[]"`),
				},
			},
			{
				"editing user will be locked out with this policy",
				"org1",
				&hub.AuthorizationPolicy{
					CustomPolicy: `
					package artifacthub.authz

					allowed_actions = ["all"]
					`,
					PolicyData: []byte(`"{}"`),
				},
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.errMsg, func(t *testing.T) {
				t.Parallel()
				az := &authz.AuthorizerMock{}
				az.On("WillUserBeLockedOut", ctx, tc.policy, "userID").Return(true, nil).Maybe()
				m := NewManager(cfg, nil, nil, az)
				err := m.UpdateAuthorizationPolicy(ctx, tc.orgName, tc.policy)
				assert.True(t, errors.Is(err, hub.ErrInvalidInput))
				assert.Contains(t, err.Error(), tc.errMsg)
			})
		}
	})

	t.Run("authorization failed", func(t *testing.T) {
		t.Parallel()
		az := &authz.AuthorizerMock{}
		az.On("WillUserBeLockedOut", ctx, validPolicy, "userID").Return(false, nil).Maybe()
		az.On("Authorize", ctx, &hub.AuthorizeInput{
			OrganizationName: "org1",
			UserID:           "userID",
			Action:           hub.UpdateAuthorizationPolicy,
		}).Return(tests.ErrFake)
		m := NewManager(cfg, nil, nil, az)

		err := m.UpdateAuthorizationPolicy(ctx, "org1", validPolicy)
		assert.Equal(t, tests.ErrFake, err)
		az.AssertExpectations(t)
	})

	t.Run("database query succeeded", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("Exec", ctx, updateAuthzPolicyDBQ, "userID", "org1", mock.Anything).Return(nil)
		az := &authz.AuthorizerMock{}
		az.On("WillUserBeLockedOut", ctx, validPolicy, "userID").Return(false, nil).Maybe()
		az.On("Authorize", ctx, &hub.AuthorizeInput{
			OrganizationName: "org1",
			UserID:           "userID",
			Action:           hub.UpdateAuthorizationPolicy,
		}).Return(nil)
		m := NewManager(cfg, db, nil, az)

		err := m.UpdateAuthorizationPolicy(ctx, "org1", validPolicy)
		assert.NoError(t, err)
		db.AssertExpectations(t)
		az.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		testCases := []struct {
			dbErr         error
			expectedError error
		}{
			{
				tests.ErrFakeDB,
				tests.ErrFakeDB,
			},
			{
				util.ErrDBInsufficientPrivilege,
				hub.ErrInsufficientPrivilege,
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.dbErr.Error(), func(t *testing.T) {
				t.Parallel()
				db := &tests.DBMock{}
				db.On("Exec", ctx, updateAuthzPolicyDBQ, "userID", "org1", mock.Anything).Return(tc.dbErr)
				az := &authz.AuthorizerMock{}
				az.On("WillUserBeLockedOut", ctx, validPolicy, "userID").Return(false, nil).Maybe()
				az.On("Authorize", ctx, &hub.AuthorizeInput{
					OrganizationName: "org1",
					UserID:           "userID",
					Action:           hub.UpdateAuthorizationPolicy,
				}).Return(nil)
				m := NewManager(cfg, db, nil, az)

				err := m.UpdateAuthorizationPolicy(ctx, "org1", validPolicy)
				assert.Equal(t, tc.expectedError, err)
				db.AssertExpectations(t)
				az.AssertExpectations(t)
			})
		}
	})
}
