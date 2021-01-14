package hub

import (
	"context"
	"encoding/json"
)

// Action represents the kind of action a user intends to perform.
type Action string

const (
	// AddOrganizationMember represents the action of adding a member to an
	// organization.
	AddOrganizationMember Action = "addOrganizationMember"

	// AddOrganizationRepository represents the action of adding a repository
	// to an organization.
	AddOrganizationRepository Action = "addOrganizationRepository"

	// DeleteOrganization represents the action of deleting an organization.
	DeleteOrganization Action = "deleteOrganization"

	// DeleteOrganizationMember represents the action of deleting a member from
	// an organization.
	DeleteOrganizationMember Action = "deleteOrganizationMember"

	// DeleteOrganizationRepository represents the action of deleting a
	// repository from an organization.
	DeleteOrganizationRepository Action = "deleteOrganizationRepository"

	// GetAuthorizationPolicy represents the action of getting an organization
	// authorization policy.
	GetAuthorizationPolicy Action = "getAuthorizationPolicy"

	// TransferOrganizationRepository represents the action of transferring a
	// repository that belongs to an organization.
	TransferOrganizationRepository Action = "transferOrganizationRepository"

	// UpdateAuthorizationPolicy represents the action of updating an
	// organization authorization policy.
	UpdateAuthorizationPolicy Action = "updateAuthorizationPolicy"

	// UpdateOrganization represents the action of updating the details of an
	// organization.
	UpdateOrganization Action = "updateOrganization"

	// UpdateOrganizationRepository represents the action of updating a
	// repository that belongs to an organization.
	UpdateOrganizationRepository Action = "updateOrganizationRepository"
)

// AuthorizationPolicy represents some information about the authorization
// policy for an organization.
type AuthorizationPolicy struct {
	AuthorizationEnabled bool            `json:"authorization_enabled"`
	PredefinedPolicy     string          `json:"predefined_policy"`
	CustomPolicy         string          `json:"custom_policy"`
	PolicyData           json.RawMessage `json:"policy_data"`
}

// Authorizer describes the methods an Authorizer implementation must provide.
type Authorizer interface {
	Authorize(ctx context.Context, input *AuthorizeInput) error
	GetAllowedActions(ctx context.Context, userID, orgName string) ([]Action, error)
	WillUserBeLockedOut(ctx context.Context, newPolicy *AuthorizationPolicy, userID string) (bool, error)
}

// AuthorizeInput represents the input required to call Authorize.
type AuthorizeInput struct {
	// OrganizationName represents the name of the organization owning the
	// resource affected by the action.
	OrganizationName string

	// UserID represents the id of the user who intends to perform the action.
	UserID string

	// Action represents the action to perform.
	Action Action
}
