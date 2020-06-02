package chartrepo

import (
	"context"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/stretchr/testify/mock"
	"helm.sh/helm/v3/pkg/repo"
)

// ManagerMock is a mock implementation of the ChartRepositoryManager interface.
type ManagerMock struct {
	mock.Mock
}

// Add implements the ChartRepositoryManager interface.
func (m *ManagerMock) Add(ctx context.Context, orgName string, r *hub.ChartRepository) error {
	args := m.Called(ctx, orgName, r)
	return args.Error(0)
}

// CheckAvailability implements the ChartRepositoryManager interface.
func (m *ManagerMock) CheckAvailability(ctx context.Context, resourceKind, value string) (bool, error) {
	args := m.Called(ctx, resourceKind, value)
	return args.Bool(0), args.Error(1)
}

// Delete implements the ChartRepositoryManager interface.
func (m *ManagerMock) Delete(ctx context.Context, name string) error {
	args := m.Called(ctx, name)
	return args.Error(0)
}

// GetAll implements the ChartRepositoryManager interface.
func (m *ManagerMock) GetAll(ctx context.Context) ([]*hub.ChartRepository, error) {
	args := m.Called(ctx)
	data, _ := args.Get(0).([]*hub.ChartRepository)
	return data, args.Error(1)
}

// GetByName implements the ChartRepositoryManager interface.
func (m *ManagerMock) GetByName(ctx context.Context, name string) (*hub.ChartRepository, error) {
	args := m.Called(ctx, name)
	data, _ := args.Get(0).(*hub.ChartRepository)
	return data, args.Error(1)
}

// GetPackagesDigest implements the ChartRepositoryManager interface.
func (m *ManagerMock) GetPackagesDigest(
	ctx context.Context,
	chartRepositoryID string,
) (map[string]string, error) {
	args := m.Called(ctx, chartRepositoryID)
	data, _ := args.Get(0).(map[string]string)
	return data, args.Error(1)
}

// GetOwnedByOrgJSON implements the ChartRepositoryManager interface.
func (m *ManagerMock) GetOwnedByOrgJSON(ctx context.Context, orgName string) ([]byte, error) {
	args := m.Called(ctx, orgName)
	data, _ := args.Get(0).([]byte)
	return data, args.Error(1)
}

// GetOwnedByUserJSON implements the ChartRepositoryManager interface.
func (m *ManagerMock) GetOwnedByUserJSON(ctx context.Context) ([]byte, error) {
	args := m.Called(ctx)
	data, _ := args.Get(0).([]byte)
	return data, args.Error(1)
}

// SetLastTrackingResults implements the ChartRepositoryManager interface.
func (m *ManagerMock) SetLastTrackingResults(ctx context.Context, chartRepositoryID, errs string) error {
	args := m.Called(ctx, chartRepositoryID, errs)
	return args.Error(0)
}

// Transfer implements the ChartRepositoryManager interface.
func (m *ManagerMock) Transfer(ctx context.Context, name, orgName string) error {
	args := m.Called(ctx, name, orgName)
	return args.Error(0)
}

// Update implements the ChartRepositoryManager interface.
func (m *ManagerMock) Update(ctx context.Context, r *hub.ChartRepository) error {
	args := m.Called(ctx, r)
	return args.Error(0)
}

// IndexLoaderMock is a mock implementation of the IndexLoader interface.
type IndexLoaderMock struct {
	mock.Mock
}

// LoadIndex implements the IndexLoader interface.
func (m *IndexLoaderMock) LoadIndex(r *hub.ChartRepository) (*repo.IndexFile, error) {
	args := m.Called(r)
	indexFile, _ := args.Get(0).(*repo.IndexFile)
	return indexFile, args.Error(1)
}
