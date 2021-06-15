package hub

import (
	"context"
)

// Organization represents an entity with one or more users associated that can
// own repositories and other entities like webhooks.
type Organization struct {
	OrganizationID string `json:"organization_id"`
	Name           string `json:"name"`
	DisplayName    string `json:"display_name"`
	Description    string `json:"description"`
	HomeURL        string `json:"home_url"`
	LogoImageID    string `json:"logo_image_id"`
}

// OrganizationManager describes the methods an OrganizationManager
// implementation must provide.
type OrganizationManager interface {
	Add(ctx context.Context, org *Organization) error
	AddMember(ctx context.Context, orgName, userAlias string) error
	CheckAvailability(ctx context.Context, resourceKind, value string) (bool, error)
	ConfirmMembership(ctx context.Context, orgName string) error
	Delete(ctx context.Context, orgName string) error
	DeleteMember(ctx context.Context, orgName, userAlias string) error
	GetJSON(ctx context.Context, orgName string) ([]byte, error)
	GetByUserJSON(ctx context.Context, p *Pagination) (*JSONQueryResult, error)
	GetAuthorizationPolicyJSON(ctx context.Context, orgName string) ([]byte, error)
	GetMembersJSON(ctx context.Context, orgName string, p *Pagination) (*JSONQueryResult, error)
	Update(ctx context.Context, orgName string, org *Organization) error
	UpdateAuthorizationPolicy(ctx context.Context, orgName string, policy *AuthorizationPolicy) error
}
