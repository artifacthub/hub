package authz

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"strconv"
	"testing"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const (
	user1ID    = "0001"
	user1Alias = "user1"
	user2ID    = "0002"
	user2Alias = "user2"
	user3ID    = "0003"
	user3Alias = "user3"
	user4ID    = "0004"
	user4Alias = "user4"
	user5ID    = "0005"
	org1Name   = "org1"
	org2Name   = "org2"
	org3Name   = "org3"
)

var testsAuthorizationPoliciesJSON = []byte(`{
	"org1": {
		"authorization_enabled": true,
		"predefined_policy": "rbac.v1",
		"policy_data": {
			"roles": {
				"owner": {
					"users": [
						"user1"
					]
				},
				"admin": {
					"users": [
						"user2"
					],
					"allowed_actions": [
						"addOrganizationMember",
						"deleteOrganizationMember"
					]
				},
				"member": {
					"users": [
						"user3"
					],
					"allowed_actions": [
						"updateOrganization"
					]
				}
			}
		}
	},
	"org2": {
		"authorization_enabled": true,
		"custom_policy": "package artifacthub.authz\ndefault allowed_actions = []\n",
		"policy_data": {}
	},
	"org3": {
		"authorization_enabled": false,
		"custom_policy": "package artifacthub.authz\ndefault allowed_actions = []\n",
		"policy_data": {}
	}
}`)

func TestMain(m *testing.M) {
	zerolog.SetGlobalLevel(zerolog.Disabled)
	os.Exit(m.Run())
}

func TestNewAuthorizer(t *testing.T) {
	t.Run("error getting authorization policies", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", context.Background(), getAuthzPoliciesDBQ).Return(nil, tests.ErrFakeDB)
		db.On("Acquire", context.Background()).Return(nil, tests.ErrFakeDB).Maybe()
		_, err := NewAuthorizer(db)
		assert.True(t, errors.Is(err, tests.ErrFakeDB))
		db.AssertExpectations(t)
	})

	t.Run("error unmarshalling authorization policies", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", context.Background(), getAuthzPoliciesDBQ).Return([]byte(`{"invalid`), nil)
		db.On("Acquire", context.Background()).Return(nil, tests.ErrFakeDB).Maybe()
		_, err := NewAuthorizer(db)
		assert.Error(t, err)
		db.AssertExpectations(t)
	})

	t.Run("authorizer created successfully", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", context.Background(), getAuthzPoliciesDBQ).Return(testsAuthorizationPoliciesJSON, nil)
		db.On("Acquire", context.Background()).Return(nil, tests.ErrFakeDB).Maybe()
		az, err := NewAuthorizer(db)
		assert.Contains(t, az.allowedActionsQueries, "org1")
		assert.Nil(t, err)
		db.AssertExpectations(t)
	})
}

func TestAuthorize(t *testing.T) {
	db := &tests.DBMock{}
	db.On("QueryRow", context.Background(), getAuthzPoliciesDBQ).Return(testsAuthorizationPoliciesJSON, nil)
	db.On("QueryRow", context.Background(), getUserAliasDBQ, user1ID).Return(user1Alias, nil).Maybe()
	db.On("QueryRow", context.Background(), getUserAliasDBQ, user2ID).Return(user2Alias, nil).Maybe()
	db.On("QueryRow", context.Background(), getUserAliasDBQ, user3ID).Return(user3Alias, nil).Maybe()
	db.On("QueryRow", context.Background(), getUserAliasDBQ, user5ID).Return("", tests.ErrFakeDB).Maybe()
	db.On("Acquire", context.Background()).Return(nil, tests.ErrFakeDB).Maybe()
	az, err := NewAuthorizer(db)
	require.NoError(t, err)

	testCases := []struct {
		input *hub.AuthorizeInput
		allow bool
	}{
		{
			&hub.AuthorizeInput{
				OrganizationName: org1Name,
				UserID:           user1ID,
				Action:           hub.AddOrganizationMember,
			},
			true,
		},
		{
			&hub.AuthorizeInput{
				OrganizationName: org1Name,
				UserID:           user2ID,
				Action:           hub.AddOrganizationMember,
			},
			true,
		},
		{
			&hub.AuthorizeInput{
				OrganizationName: org1Name,
				UserID:           user3ID,
				Action:           hub.AddOrganizationMember,
			},
			false,
		},
		{
			&hub.AuthorizeInput{
				OrganizationName: org1Name,
				UserID:           user5ID,
				Action:           hub.AddOrganizationMember,
			},
			false,
		},
		{
			&hub.AuthorizeInput{
				OrganizationName: org1Name,
				UserID:           user2ID,
				Action:           hub.UpdateOrganization,
			},
			false,
		},
		{
			&hub.AuthorizeInput{
				OrganizationName: org1Name,
				UserID:           user3ID,
				Action:           hub.UpdateOrganization,
			},
			true,
		},
		{
			&hub.AuthorizeInput{
				OrganizationName: org1Name,
				UserID:           user1ID,
				Action:           hub.TransferOrganizationRepository,
			},
			true,
		},
		{
			&hub.AuthorizeInput{
				OrganizationName: org1Name,
				UserID:           user2ID,
				Action:           hub.TransferOrganizationRepository,
			},
			false,
		},
		{
			&hub.AuthorizeInput{
				OrganizationName: org2Name,
				UserID:           user1ID,
				Action:           hub.AddOrganizationMember,
			},
			false,
		},
		{
			&hub.AuthorizeInput{
				OrganizationName: org2Name,
				UserID:           user2ID,
				Action:           hub.AddOrganizationMember,
			},
			false,
		},
		{
			&hub.AuthorizeInput{
				OrganizationName: org3Name,
				UserID:           user1ID,
				Action:           hub.AddOrganizationMember,
			},
			true,
		},
		{
			&hub.AuthorizeInput{
				OrganizationName: org3Name,
				UserID:           user2ID,
				Action:           hub.AddOrganizationMember,
			},
			true,
		},
		{
			&hub.AuthorizeInput{
				OrganizationName: org3Name,
				UserID:           user3ID,
				Action:           hub.AddOrganizationMember,
			},
			true,
		},
	}
	for i, tc := range testCases {
		tc := tc
		t.Run(strconv.Itoa(i), func(t *testing.T) {
			t.Parallel()
			err := az.Authorize(context.Background(), tc.input)
			if tc.allow {
				assert.Nil(t, err)
			} else {
				assert.True(t, errors.Is(err, hub.ErrInsufficientPrivilege))
			}
		})
	}

	db.AssertExpectations(t)
}

func TestGetAllowedActions(t *testing.T) {
	db := &tests.DBMock{}
	db.On("QueryRow", context.Background(), getAuthzPoliciesDBQ).Return(testsAuthorizationPoliciesJSON, nil)
	db.On("QueryRow", context.Background(), getUserAliasDBQ, user1ID).Return(user1Alias, nil).Maybe()
	db.On("QueryRow", context.Background(), getUserAliasDBQ, user2ID).Return(user2Alias, nil).Maybe()
	db.On("QueryRow", context.Background(), getUserAliasDBQ, user3ID).Return(user3Alias, nil).Maybe()
	db.On("QueryRow", context.Background(), getUserAliasDBQ, user4ID).Return(user4Alias, nil).Maybe()
	db.On("QueryRow", context.Background(), getUserAliasDBQ, user5ID).Return("", tests.ErrFakeDB).Maybe()
	db.On("Acquire", context.Background()).Return(nil, tests.ErrFakeDB).Maybe()
	az, err := NewAuthorizer(db)
	require.NoError(t, err)

	testCases := []struct {
		userID                 string
		orgName                string
		expectedAllowedActions []hub.Action
	}{
		{
			user1ID,
			org1Name,
			[]hub.Action{
				hub.Action("all"),
			},
		},
		{
			user2ID,
			org1Name,
			[]hub.Action{
				hub.AddOrganizationMember,
				hub.DeleteOrganizationMember,
			},
		},
		{
			user3ID,
			org1Name,
			[]hub.Action{
				hub.UpdateOrganization,
			},
		},
		{
			user4ID,
			org1Name,
			[]hub.Action{},
		},
		{
			user5ID,
			org1Name,
			nil,
		},
		{
			user1ID,
			org2Name,
			[]hub.Action{},
		},
		{
			user2ID,
			org2Name,
			[]hub.Action{},
		},
		{
			user1ID,
			org3Name,
			[]hub.Action{
				hub.Action("all"),
			},
		},
		{
			user3ID,
			org3Name,
			[]hub.Action{
				hub.Action("all"),
			},
		},
	}
	for i, tc := range testCases {
		tc := tc
		t.Run(strconv.Itoa(i), func(t *testing.T) {
			t.Parallel()
			allowedActions, _ := az.GetAllowedActions(context.Background(), tc.userID, tc.orgName)
			assert.Equal(t, tc.expectedAllowedActions, allowedActions)
		})
	}

	db.AssertExpectations(t)
}

func TestWillUserBeLockedOut(t *testing.T) {
	db := &tests.DBMock{}
	db.On("QueryRow", context.Background(), getAuthzPoliciesDBQ).Return(testsAuthorizationPoliciesJSON, nil)
	db.On("QueryRow", context.Background(), getUserAliasDBQ, user1ID).Return(user1Alias, nil).Maybe()
	db.On("QueryRow", context.Background(), getUserAliasDBQ, user2ID).Return(user2Alias, nil).Maybe()
	db.On("Acquire", context.Background()).Return(nil, tests.ErrFakeDB).Maybe()
	az, err := NewAuthorizer(db)
	require.NoError(t, err)

	testCases := []struct {
		predefinedPolicy  string
		customPolicy      string
		policyData        string
		userID            string
		expectedLockedOut bool
	}{
		{
			"rbac.v1",
			``,
			`{}`,
			user1ID,
			true,
		},
		{
			"rbac.v1",
			``,
			`{"roles": {"owner": {"users": ["user1"]}}}`,
			user1ID,
			false,
		},
		{
			"rbac.v1",
			"",
			`{"roles": {"owner": {"users": ["user1"]}}}`,
			user2ID,
			true,
		},
		{
			"rbac.v1",
			"",
			`{"roles": {"role1": {"users": ["user1"], "allowed_actions": []}}}`,
			user1ID,
			true,
		},
		{
			"rbac.v1",
			"",
			`{"roles": {"role1": {"users": ["user1"], "allowed_actions": ["updateAuthorizationPolicy"]}}}`,
			user1ID,
			true,
		},
		{
			"rbac.v1",
			"",
			`{"roles": {"role1": {"users": ["user1"], "allowed_actions": ["getAuthorizationPolicy"]}}}`,
			user1ID,
			true,
		},
		{
			"rbac.v1",
			"",
			`{"roles": {"role1": {"users": ["user1"], "allowed_actions": ["getAuthorizationPolicy", "updateAuthorizationPolicy"]}}}`,
			user1ID,
			false,
		},
		{
			"",
			`
			package artifacthub.authz

			allow = true
			allowed_actions = ["all"]
			`,
			`{}`,
			user1ID,
			false,
		},
		{
			"",
			`
			package artifacthub.authz

			allow = false
			allowed_actions = []
			`,
			`{}`,
			user1ID,
			true,
		},
		{
			"",
			`
			package artifacthub.authz

			allow = true
			allowed_actions = ["getAuthorizationPolicy"]
			`,
			`{}`,
			user1ID,
			true,
		},
		{
			"",
			`
			package artifacthub.authz

			allow = true
			allowed_actions = ["updateAuthorizationPolicy"]
			`,
			`{}`,
			user1ID,
			true,
		},
		{
			"",
			`
			package artifacthub.authz

			allow = true
			allowed_actions = ["getAuthorizationPolicy", "updateAuthorizationPolicy"]
			`,
			`{}`,
			user1ID,
			false,
		},
	}
	for i, tc := range testCases {
		tc := tc
		t.Run(strconv.Itoa(i), func(t *testing.T) {
			t.Parallel()
			policyDataJSON, _ := json.Marshal(tc.policyData)
			p := &hub.AuthorizationPolicy{
				PredefinedPolicy: tc.predefinedPolicy,
				CustomPolicy:     tc.customPolicy,
				PolicyData:       policyDataJSON,
			}
			lockedOut, _ := az.WillUserBeLockedOut(context.Background(), p, tc.userID)
			assert.Equal(t, tc.expectedLockedOut, lockedOut)
		})
	}

	db.AssertExpectations(t)
}

func TestIsPredefinedPolicyValid(t *testing.T) {
	testCases := []struct {
		predefinedPolicy string
		expectedValid    bool
	}{
		{
			"rbac.v1",
			true,
		},
		{
			"rbac.v2",
			false,
		},
		{
			"something else",
			false,
		},
	}
	for i, tc := range testCases {
		tc := tc
		t.Run(strconv.Itoa(i), func(t *testing.T) {
			t.Parallel()
			valid := IsPredefinedPolicyValid(tc.predefinedPolicy)
			assert.Equal(t, tc.expectedValid, valid)
		})
	}
}

func TestIsActionAllowed(t *testing.T) {
	testCases := []struct {
		allowedActions  []hub.Action
		action          hub.Action
		expectedAllowed bool
	}{
		{
			[]hub.Action{hub.AddOrganizationMember, hub.DeleteOrganizationMember},
			hub.AddOrganizationMember,
			true,
		},
		{
			[]hub.Action{hub.Action("all")},
			hub.AddOrganizationMember,
			true,
		},
		{
			[]hub.Action{hub.AddOrganizationMember, hub.DeleteOrganizationMember},
			hub.TransferOrganizationRepository,
			false,
		},
		{
			[]hub.Action{},
			hub.TransferOrganizationRepository,
			false,
		},
		{
			nil,
			hub.TransferOrganizationRepository,
			false,
		},
	}
	for i, tc := range testCases {
		tc := tc
		t.Run(strconv.Itoa(i), func(t *testing.T) {
			t.Parallel()
			allowed := IsActionAllowed(tc.allowedActions, tc.action)
			assert.Equal(t, tc.expectedAllowed, allowed)
		})
	}
}

func TestAreActionsAllowed(t *testing.T) {
	testCases := []struct {
		allowedActions  []hub.Action
		actions         []hub.Action
		expectedAllowed bool
	}{
		{
			[]hub.Action{hub.AddOrganizationMember, hub.DeleteOrganizationMember, hub.GetAuthorizationPolicy},
			[]hub.Action{hub.AddOrganizationMember, hub.DeleteOrganizationMember},
			true,
		},
		{
			[]hub.Action{hub.AddOrganizationMember, hub.DeleteOrganizationMember},
			[]hub.Action{hub.AddOrganizationMember, hub.DeleteOrganizationMember, hub.GetAuthorizationPolicy},
			false,
		},
		{
			[]hub.Action{hub.AddOrganizationMember},
			[]hub.Action{hub.AddOrganizationMember, hub.DeleteOrganizationMember},
			false,
		},
		{
			[]hub.Action{hub.Action("all")},
			[]hub.Action{hub.AddOrganizationMember, hub.DeleteOrganizationMember},
			true,
		},
		{
			[]hub.Action{},
			[]hub.Action{hub.AddOrganizationMember, hub.DeleteOrganizationMember},
			false,
		},
		{
			nil,
			[]hub.Action{hub.AddOrganizationMember, hub.DeleteOrganizationMember},
			false,
		},
	}
	for i, tc := range testCases {
		tc := tc
		t.Run(strconv.Itoa(i), func(t *testing.T) {
			t.Parallel()
			allowed := AreActionsAllowed(tc.allowedActions, tc.actions)
			assert.Equal(t, tc.expectedAllowed, allowed)
		})
	}
}
