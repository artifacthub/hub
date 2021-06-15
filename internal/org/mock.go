package org

import (
	"context"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/stretchr/testify/mock"
)

// ManagerMock is a mock implementation of the OrganizationManager interface.
type ManagerMock struct {
	mock.Mock
}

// Add implements the OrganizationManager interface.
func (m *ManagerMock) Add(ctx context.Context, org *hub.Organization) error {
	args := m.Called(ctx, org)
	return args.Error(0)
}

// AddMember implements the OrganizationManager interface.
func (m *ManagerMock) AddMember(ctx context.Context, orgName, userAlias string) error {
	args := m.Called(ctx, orgName, userAlias)
	return args.Error(0)
}

// CheckAvailability implements the OrganizationManager interface.
func (m *ManagerMock) CheckAvailability(ctx context.Context, resourceKind, value string) (bool, error) {
	args := m.Called(ctx, resourceKind, value)
	return args.Bool(0), args.Error(1)
}

// ConfirmMembership implements the OrganizationManager interface.
func (m *ManagerMock) ConfirmMembership(ctx context.Context, orgName string) error {
	args := m.Called(ctx, orgName)
	return args.Error(0)
}

// Delete implements the OrganizationManager interface.
func (m *ManagerMock) Delete(ctx context.Context, orgName string) error {
	args := m.Called(ctx, orgName)
	return args.Error(0)
}

// DeleteMember implements the OrganizationManager interface.
func (m *ManagerMock) DeleteMember(ctx context.Context, orgName, userAlias string) error {
	args := m.Called(ctx, orgName, userAlias)
	return args.Error(0)
}

// GetJSON implements the OrganizationManager interface.
func (m *ManagerMock) GetJSON(ctx context.Context, orgName string) ([]byte, error) {
	args := m.Called(ctx, orgName)
	data, _ := args.Get(0).([]byte)
	return data, args.Error(1)
}

// GetAuthorizationPolicyJSON implements the OrganizationManager interface.
func (m *ManagerMock) GetAuthorizationPolicyJSON(ctx context.Context, orgName string) ([]byte, error) {
	args := m.Called(ctx, orgName)
	data, _ := args.Get(0).([]byte)
	return data, args.Error(1)
}

// GetByUserJSON implements the OrganizationManager interface.
func (m *ManagerMock) GetByUserJSON(ctx context.Context, p *hub.Pagination) (*hub.JSONQueryResult, error) {
	args := m.Called(ctx, p)
	data, _ := args.Get(0).(*hub.JSONQueryResult)
	return data, args.Error(1)
}

// GetMembersJSON implements the OrganizationManager interface.
func (m *ManagerMock) GetMembersJSON(
	ctx context.Context,
	orgName string,
	p *hub.Pagination,
) (*hub.JSONQueryResult, error) {
	args := m.Called(ctx, orgName, p)
	data, _ := args.Get(0).(*hub.JSONQueryResult)
	return data, args.Error(1)
}

// Update implements the OrganizationManager interface.
func (m *ManagerMock) Update(ctx context.Context, orgName string, org *hub.Organization) error {
	args := m.Called(ctx, orgName, org)
	return args.Error(0)
}

// UpdateAuthorizationPolicy implements the OrganizationManager interface.
func (m *ManagerMock) UpdateAuthorizationPolicy(
	ctx context.Context,
	orgName string,
	policy *hub.AuthorizationPolicy,
) error {
	args := m.Called(ctx, orgName, policy)
	return args.Error(0)
}
