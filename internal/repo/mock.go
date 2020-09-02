package repo

import (
	"context"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/stretchr/testify/mock"
	"helm.sh/helm/v3/pkg/repo"
)

// ManagerMock is a mock implementation of the RepositoryManager interface.
type ManagerMock struct {
	mock.Mock
}

// Add implements the RepositoryManager interface.
func (m *ManagerMock) Add(ctx context.Context, orgName string, r *hub.Repository) error {
	args := m.Called(ctx, orgName, r)
	return args.Error(0)
}

// CheckAvailability implements the RepositoryManager interface.
func (m *ManagerMock) CheckAvailability(ctx context.Context, resourceKind, value string) (bool, error) {
	args := m.Called(ctx, resourceKind, value)
	return args.Bool(0), args.Error(1)
}

// Delete implements the RepositoryManager interface.
func (m *ManagerMock) Delete(ctx context.Context, name string) error {
	args := m.Called(ctx, name)
	return args.Error(0)
}

// GetAll implements the RepositoryManager interface.
func (m *ManagerMock) GetAll(ctx context.Context) ([]*hub.Repository, error) {
	args := m.Called(ctx)
	data, _ := args.Get(0).([]*hub.Repository)
	return data, args.Error(1)
}

// GetByID implements the RepositoryManager interface.
func (m *ManagerMock) GetByID(ctx context.Context, repositoryID string) (*hub.Repository, error) {
	args := m.Called(ctx, repositoryID)
	data, _ := args.Get(0).(*hub.Repository)
	return data, args.Error(1)
}

// GetByKind implements the RepositoryManager interface.
func (m *ManagerMock) GetByKind(ctx context.Context, kind hub.RepositoryKind) ([]*hub.Repository, error) {
	args := m.Called(ctx, kind)
	data, _ := args.Get(0).([]*hub.Repository)
	return data, args.Error(1)
}

// GetByName implements the RepositoryManager interface.
func (m *ManagerMock) GetByName(ctx context.Context, name string) (*hub.Repository, error) {
	args := m.Called(ctx, name)
	data, _ := args.Get(0).(*hub.Repository)
	return data, args.Error(1)
}

// GetPackagesDigest implements the RepositoryManager interface.
func (m *ManagerMock) GetPackagesDigest(
	ctx context.Context,
	repositoryID string,
) (map[string]string, error) {
	args := m.Called(ctx, repositoryID)
	data, _ := args.Get(0).(map[string]string)
	return data, args.Error(1)
}

// GetOwnedByOrgJSON implements the RepositoryManager interface.
func (m *ManagerMock) GetOwnedByOrgJSON(ctx context.Context, orgName string) ([]byte, error) {
	args := m.Called(ctx, orgName)
	data, _ := args.Get(0).([]byte)
	return data, args.Error(1)
}

// GetOwnedByUserJSON implements the RepositoryManager interface.
func (m *ManagerMock) GetOwnedByUserJSON(ctx context.Context) ([]byte, error) {
	args := m.Called(ctx)
	data, _ := args.Get(0).([]byte)
	return data, args.Error(1)
}

// SetLastTrackingResults implements the RepositoryManager interface.
func (m *ManagerMock) SetLastTrackingResults(ctx context.Context, repositoryID, errs string) error {
	args := m.Called(ctx, repositoryID, errs)
	return args.Error(0)
}

// SetVerifiedPublisher implements the RepositoryManager interface.
func (m *ManagerMock) SetVerifiedPublisher(ctx context.Context, repositoryID string, verified bool) error {
	args := m.Called(ctx, repositoryID, verified)
	return args.Error(0)
}

// Transfer implements the RepositoryManager interface.
func (m *ManagerMock) Transfer(ctx context.Context, name, orgName string) error {
	args := m.Called(ctx, name, orgName)
	return args.Error(0)
}

// Update implements the RepositoryManager interface.
func (m *ManagerMock) Update(ctx context.Context, r *hub.Repository) error {
	args := m.Called(ctx, r)
	return args.Error(0)
}

// HelmIndexLoaderMock is a mock implementation of the HelmIndexLoader
// interface.
type HelmIndexLoaderMock struct {
	mock.Mock
}

// LoadIndex implements the HelmIndexLoader interface.
func (m *HelmIndexLoaderMock) LoadIndex(r *hub.Repository) (*repo.IndexFile, error) {
	args := m.Called(r)
	indexFile, _ := args.Get(0).(*repo.IndexFile)
	return indexFile, args.Error(1)
}

// ClonerMock is a mock implementation of the RepositoryCloner interface.
type ClonerMock struct {
	mock.Mock
}

// CloneRepository implements the RepositoryCloner interface.
func (m *ClonerMock) CloneRepository(ctx context.Context, r *hub.Repository) (string, string, error) {
	args := m.Called(ctx, r)
	return args.String(0), args.String(1), args.Error(2)
}
