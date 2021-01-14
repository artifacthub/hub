package org

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"regexp"
	"strconv"

	"github.com/artifacthub/hub/internal/authz"
	"github.com/artifacthub/hub/internal/email"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/util"
	"github.com/open-policy-agent/opa/ast"
	"github.com/satori/uuid"
)

const (
	// Database queries
	addOrgDBQ            = `select add_organization($1::uuid, $2::jsonb)`
	addOrgMemberDBQ      = `select add_organization_member($1::uuid, $2::text, $3::text)`
	checkOrgNameAvailDBQ = `select organization_id from organization where name = $1`
	confirmMembershipDBQ = `select confirm_organization_membership($1::uuid, $2::text)`
	deleteOrgDBQ         = `select delete_organization($1::uuid, $2::text)`
	deleteOrgMemberDBQ   = `select delete_organization_member($1::uuid, $2::text, $3::text)`
	getAuthzPolicyDBQ    = `select get_authorization_policy($1::uuid, $2::text)`
	getOrgDBQ            = `select get_organization($1::text)`
	getOrgMembersDBQ     = `select get_organization_members($1::uuid, $2::text)`
	getUserAliasDBQ      = `select alias from "user" where user_id = $1`
	getUserEmailDBQ      = `select email from "user" where alias = $1`
	getUserOrgsDBQ       = `select get_user_organizations($1::uuid)`
	updateAuthzPolicyDBQ = `select update_authorization_policy($1::uuid, $2::text, $3::jsonb)`
	updateOrgDBQ         = `select update_organization($1::uuid, $2::text, $3::jsonb)`
)

var (
	// organizationNameRE is a regexp used to validate an organization name.
	organizationNameRE = regexp.MustCompile(`^[a-z0-9-]+$`)
)

// Manager provides an API to manage organizations.
type Manager struct {
	db hub.DB
	es hub.EmailSender
	az hub.Authorizer
}

// NewManager creates a new Manager instance.
func NewManager(db hub.DB, es hub.EmailSender, az hub.Authorizer) *Manager {
	return &Manager{
		db: db,
		es: es,
		az: az,
	}
}

// Add adds the provided organization to the database.
func (m *Manager) Add(ctx context.Context, org *hub.Organization) error {
	userID := ctx.Value(hub.UserIDKey).(string)

	// Validate input
	if err := validateOrg(org); err != nil {
		return err
	}

	// Add org to database
	orgJSON, _ := json.Marshal(org)
	_, err := m.db.Exec(ctx, addOrgDBQ, userID, orgJSON)
	return err
}

// AddMember adds a new member to the provided organization. The new member
// must be a registered user. The user will receive an email to confirm her
// willingness to join the organization. The user doing the request must be a
// member of the organization.
func (m *Manager) AddMember(ctx context.Context, orgName, userAlias, baseURL string) error {
	userID := ctx.Value(hub.UserIDKey).(string)

	// Validate input
	if orgName == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "organization name not provided")
	}
	if userAlias == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "user alias not provided")
	}
	if baseURL == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "base url not provided")
	}
	u, err := url.Parse(baseURL)
	if err != nil || u.Scheme == "" || u.Host == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid base url")
	}

	// Authorize action
	if err := m.az.Authorize(ctx, &hub.AuthorizeInput{
		OrganizationName: orgName,
		UserID:           userID,
		Action:           hub.AddOrganizationMember,
	}); err != nil {
		return err
	}

	// Add organization member to database
	_, err = m.db.Exec(ctx, addOrgMemberDBQ, userID, orgName, userAlias)
	if err != nil {
		if err.Error() == util.ErrDBInsufficientPrivilege.Error() {
			return hub.ErrInsufficientPrivilege
		}
		return err
	}

	// Send organization invitation email
	if m.es != nil {
		var userEmail string
		if err := m.db.QueryRow(ctx, getUserEmailDBQ, userAlias).Scan(&userEmail); err != nil {
			return err
		}
		templateData := map[string]string{
			"link":    fmt.Sprintf("%s/accept-invitation?org=%s", baseURL, orgName),
			"orgName": orgName,
		}
		var emailBody bytes.Buffer
		if err := invitationTmpl.Execute(&emailBody, templateData); err != nil {
			return err
		}
		emailData := &email.Data{
			To:      userEmail,
			Subject: fmt.Sprintf("Invitation to join %s on Artifact Hub", orgName),
			Body:    emailBody.Bytes(),
		}
		if err := m.es.SendEmail(emailData); err != nil {
			return err
		}
	}

	return nil
}

// CheckAvailability checks the availability of a given value for the provided
// resource kind.
func (m *Manager) CheckAvailability(ctx context.Context, resourceKind, value string) (bool, error) {
	var available bool
	var query string

	// Validate input
	validResourceKinds := []string{
		"organizationName",
	}
	isResourceKindValid := func(resourceKind string) bool {
		for _, k := range validResourceKinds {
			if resourceKind == k {
				return true
			}
		}
		return false
	}
	if !isResourceKindValid(resourceKind) {
		return available, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid resource kind")
	}
	if value == "" {
		return available, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid value")
	}

	// Check availability in database
	switch resourceKind {
	case "organizationName":
		query = checkOrgNameAvailDBQ
	}
	query = fmt.Sprintf("select not exists (%s)", query)
	err := m.db.QueryRow(ctx, query, value).Scan(&available)
	return available, err
}

// ConfirmMembership confirms the user doing the request membership to the
// provided organization.
func (m *Manager) ConfirmMembership(ctx context.Context, orgName string) error {
	userID := ctx.Value(hub.UserIDKey).(string)

	// Validate input
	if orgName == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "organization name not provided")
	}

	// Confirm organization membership in database
	_, err := m.db.Exec(ctx, confirmMembershipDBQ, userID, orgName)
	return err
}

// Delete deletes the provided organization from the database.
func (m *Manager) Delete(ctx context.Context, orgName string) error {
	userID := ctx.Value(hub.UserIDKey).(string)

	// Validate input
	if orgName == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "organization name not provided")
	}

	// Authorize action
	if err := m.az.Authorize(ctx, &hub.AuthorizeInput{
		OrganizationName: orgName,
		UserID:           userID,
		Action:           hub.DeleteOrganization,
	}); err != nil {
		return err
	}

	// Delete organization from database
	_, err := m.db.Exec(ctx, deleteOrgDBQ, userID, orgName)
	if err != nil && err.Error() == util.ErrDBInsufficientPrivilege.Error() {
		return hub.ErrInsufficientPrivilege
	}
	return err
}

// DeleteMember removes a member from the provided organization. The user doing
// the request must be a member of the organization.
func (m *Manager) DeleteMember(ctx context.Context, orgName, userAlias string) error {
	userID := ctx.Value(hub.UserIDKey).(string)

	// Validate input
	if orgName == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "organization name not provided")
	}
	if userAlias == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "user alias not provided")
	}

	// Authorize action
	var requestingUserAlias string
	if err := m.db.QueryRow(ctx, getUserAliasDBQ, userID).Scan(&requestingUserAlias); err != nil {
		return err
	}
	if requestingUserAlias != userAlias { // User is always allowed to leave
		if err := m.az.Authorize(ctx, &hub.AuthorizeInput{
			OrganizationName: orgName,
			UserID:           userID,
			Action:           hub.DeleteOrganizationMember,
		}); err != nil {
			return err
		}
	}

	// Delete organization member from database
	_, err := m.db.Exec(ctx, deleteOrgMemberDBQ, userID, orgName, userAlias)
	if err != nil && err.Error() == util.ErrDBInsufficientPrivilege.Error() {
		return hub.ErrInsufficientPrivilege
	}
	return err
}

// GetAuthorizationPolicyJSON returns the organization's authorization policy
// as a json object.
func (m *Manager) GetAuthorizationPolicyJSON(ctx context.Context, orgName string) ([]byte, error) {
	userID := ctx.Value(hub.UserIDKey).(string)

	// Validate input
	if orgName == "" {
		return nil, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "organization name not provided")
	}

	// Authorize action
	if err := m.az.Authorize(ctx, &hub.AuthorizeInput{
		OrganizationName: orgName,
		UserID:           userID,
		Action:           hub.GetAuthorizationPolicy,
	}); err != nil {
		return nil, err
	}

	// Get organization from database
	return util.DBQueryJSON(ctx, m.db, getAuthzPolicyDBQ, userID, orgName)
}

// GetByUserJSON returns the organizations the user doing the request belongs
// to as a json object.
func (m *Manager) GetByUserJSON(ctx context.Context) ([]byte, error) {
	userID := ctx.Value(hub.UserIDKey).(string)
	return util.DBQueryJSON(ctx, m.db, getUserOrgsDBQ, userID)
}

// GetJSON returns the organization requested as a json object.
func (m *Manager) GetJSON(ctx context.Context, orgName string) ([]byte, error) {
	// Validate input
	if orgName == "" {
		return nil, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "organization name not provided")
	}

	// Get organization from database
	return util.DBQueryJSON(ctx, m.db, getOrgDBQ, orgName)
}

// GetMembersJSON returns the members of the provided organization as a json
// object.
func (m *Manager) GetMembersJSON(ctx context.Context, orgName string) ([]byte, error) {
	userID := ctx.Value(hub.UserIDKey).(string)

	// Validate input
	if orgName == "" {
		return nil, fmt.Errorf("%w: %s", hub.ErrInvalidInput, "organization name not provided")
	}

	// Get organization members from database
	return util.DBQueryJSON(ctx, m.db, getOrgMembersDBQ, userID, orgName)
}

// Update updates the provided organization in the database.
func (m *Manager) Update(ctx context.Context, orgName string, org *hub.Organization) error {
	userID := ctx.Value(hub.UserIDKey).(string)

	// Validate input
	if err := validateOrg(org); err != nil {
		return err
	}

	// Authorize action
	if err := m.az.Authorize(ctx, &hub.AuthorizeInput{
		OrganizationName: orgName,
		UserID:           userID,
		Action:           hub.UpdateOrganization,
	}); err != nil {
		return err
	}

	// Update organization in database
	orgJSON, _ := json.Marshal(org)
	_, err := m.db.Exec(ctx, updateOrgDBQ, userID, orgName, orgJSON)
	if err != nil && err.Error() == util.ErrDBInsufficientPrivilege.Error() {
		return hub.ErrInsufficientPrivilege
	}
	return err
}

// UpdateAuthorizationPolicy updates the organization's authorization policy in
// the database.
func (m *Manager) UpdateAuthorizationPolicy(
	ctx context.Context,
	orgName string,
	p *hub.AuthorizationPolicy,
) error {
	userID := ctx.Value(hub.UserIDKey).(string)

	// Validate input
	if orgName == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "organization name not provided")
	}
	if p == nil {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "authorization policy not provided")
	}
	if p.PredefinedPolicy != "" && p.CustomPolicy != "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "both predefined and custom policies were provided")
	}
	if p.AuthorizationEnabled {
		if p.PredefinedPolicy == "" && p.CustomPolicy == "" {
			return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "a predefined or custom policy must be provided")
		}
	}
	if p.PredefinedPolicy != "" && !authz.IsPredefinedPolicyValid(p.PredefinedPolicy) {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid predefined policy")
	}
	if p.CustomPolicy != "" {
		compiler, err := ast.CompileModules(map[string]string{"tmp.rego": p.CustomPolicy})
		if err != nil {
			return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid custom policy")
		}
		if compiler.GetRules(authz.AllowedActionsQueryRef) == nil {
			return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "allowed actions rule not found in custom policy")
		}
	}
	policyDataJSON, _ := strconv.Unquote(string(p.PolicyData))
	var tmp map[string]interface{}
	if err := json.Unmarshal([]byte(policyDataJSON), &tmp); err != nil {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid policy data")
	}
	lockedOut, err := m.az.WillUserBeLockedOut(ctx, p, userID)
	if err != nil {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "error checking if editing user will be locked out")
	}
	if lockedOut {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "editing user will be locked out with this policy")
	}

	// Authorize action
	if err := m.az.Authorize(ctx, &hub.AuthorizeInput{
		OrganizationName: orgName,
		UserID:           userID,
		Action:           hub.UpdateAuthorizationPolicy,
	}); err != nil {
		return err
	}

	// Update authorization policy in database
	policyJSON, _ := json.Marshal(p)
	_, err = m.db.Exec(ctx, updateAuthzPolicyDBQ, userID, orgName, policyJSON)
	if err != nil && err.Error() == util.ErrDBInsufficientPrivilege.Error() {
		return hub.ErrInsufficientPrivilege
	}
	return err
}

// validateOrg checks if the organization provided is valid.
func validateOrg(org *hub.Organization) error {
	if org.Name == "" {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "name not provided")
	}
	if !organizationNameRE.MatchString(org.Name) {
		return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid name")
	}
	if org.LogoImageID != "" {
		if _, err := uuid.FromString(org.LogoImageID); err != nil {
			return fmt.Errorf("%w: %s", hub.ErrInvalidInput, "invalid logo image id")
		}
	}
	return nil
}
