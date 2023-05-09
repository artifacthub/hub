package pkg

import (
	"context"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/stretchr/testify/mock"
)

// ManagerMock is a mock implementation of the PackageManager interface.
type ManagerMock struct {
	mock.Mock
}

// AddProductionUsage implements the PackageManager interface.
func (m *ManagerMock) AddProductionUsage(ctx context.Context, repoName, pkgName, orgName string) error {
	args := m.Called(ctx, repoName, pkgName, orgName)
	return args.Error(0)
}

// DeleteProductionUsage implements the PackageManager interface.
func (m *ManagerMock) DeleteProductionUsage(ctx context.Context, repoName, pkgName, orgName string) error {
	args := m.Called(ctx, repoName, pkgName, orgName)
	return args.Error(0)
}

// Get implements the PackageManager interface.
func (m *ManagerMock) Get(ctx context.Context, input *hub.GetPackageInput) (*hub.Package, error) {
	args := m.Called(ctx, input)
	data, _ := args.Get(0).(*hub.Package)
	return data, args.Error(1)
}

// GetChangelog implements the PackageManager interface.
func (m *ManagerMock) GetChangelog(ctx context.Context, pkgID string) (*hub.Changelog, error) {
	args := m.Called(ctx, pkgID)
	data, _ := args.Get(0).(*hub.Changelog)
	return data, args.Error(1)
}

// GetHarborReplicationDumpJSON implements the PackageManager interface.
func (m *ManagerMock) GetHarborReplicationDumpJSON(ctx context.Context) ([]byte, error) {
	args := m.Called(ctx)
	data, _ := args.Get(0).([]byte)
	return data, args.Error(1)
}

// GetHelmExporterDumpJSON implements the PackageManager interface.
func (m *ManagerMock) GetHelmExporterDumpJSON(ctx context.Context) ([]byte, error) {
	args := m.Called(ctx)
	data, _ := args.Get(0).([]byte)
	return data, args.Error(1)
}

// GetJSON implements the PackageManager interface.
func (m *ManagerMock) GetJSON(ctx context.Context, input *hub.GetPackageInput) ([]byte, error) {
	args := m.Called(ctx, input)
	data, _ := args.Get(0).([]byte)
	return data, args.Error(1)
}

// GetNovaDumpJSON implements the PackageManager interface.
func (m *ManagerMock) GetNovaDumpJSON(ctx context.Context) ([]byte, error) {
	args := m.Called(ctx)
	data, _ := args.Get(0).([]byte)
	return data, args.Error(1)
}

// GetProductionUsageJSON implements the PackageManager interface.
func (m *ManagerMock) GetProductionUsageJSON(ctx context.Context, repoName, pkgName string) ([]byte, error) {
	args := m.Called(ctx, repoName, pkgName)
	data, _ := args.Get(0).([]byte)
	return data, args.Error(1)
}

// GetRandomJSON implements the PackageManager interface.
func (m *ManagerMock) GetRandomJSON(ctx context.Context) ([]byte, error) {
	args := m.Called(ctx)
	data, _ := args.Get(0).([]byte)
	return data, args.Error(1)
}

// GetSnapshotSecurityReportJSON implements the PackageManager interface.
func (m *ManagerMock) GetSnapshotSecurityReportJSON(ctx context.Context, pkgID, version string) ([]byte, error) {
	args := m.Called(ctx, pkgID, version)
	data, _ := args.Get(0).([]byte)
	return data, args.Error(1)
}

// GetSnapshotsToScan implements the PackageManager interface.
func (m *ManagerMock) GetSnapshotsToScan(ctx context.Context) ([]*hub.SnapshotToScan, error) {
	args := m.Called(ctx)
	data, _ := args.Get(0).([]*hub.SnapshotToScan)
	return data, args.Error(1)
}

// GetStarredByUserJSON implements the PackageManager interface.
func (m *ManagerMock) GetStarredByUserJSON(ctx context.Context, p *hub.Pagination) (*hub.JSONQueryResult, error) {
	args := m.Called(ctx, p)
	data, _ := args.Get(0).(*hub.JSONQueryResult)
	return data, args.Error(1)
}

// GetStarsJSON implements the PackageManager interface.
func (m *ManagerMock) GetStarsJSON(ctx context.Context, packageID string) ([]byte, error) {
	args := m.Called(ctx, packageID)
	data, _ := args.Get(0).([]byte)
	return data, args.Error(1)
}

// GetStatsJSON implements the PackageManager interface.
func (m *ManagerMock) GetStatsJSON(ctx context.Context) ([]byte, error) {
	args := m.Called(ctx)
	data, _ := args.Get(0).([]byte)
	return data, args.Error(1)
}

// GetSummaryJSON implements the PackageManager interface.
func (m *ManagerMock) GetSummaryJSON(ctx context.Context, input *hub.GetPackageInput) ([]byte, error) {
	args := m.Called(ctx, input)
	data, _ := args.Get(0).([]byte)
	return data, args.Error(1)
}

// GetValuesSchemaJSON implements the PackageManager interface.
func (m *ManagerMock) GetValuesSchemaJSON(ctx context.Context, pkgID, version string) ([]byte, error) {
	args := m.Called(ctx, pkgID, version)
	data, _ := args.Get(0).([]byte)
	return data, args.Error(1)
}

// GetViewsJSON implements the PackageManager interface.
func (m *ManagerMock) GetViewsJSON(ctx context.Context, packageID string) ([]byte, error) {
	args := m.Called(ctx, packageID)
	data, _ := args.Get(0).([]byte)
	return data, args.Error(1)
}

// Register implements the PackageManager interface.
func (m *ManagerMock) Register(ctx context.Context, pkg *hub.Package) error {
	args := m.Called(ctx, pkg)
	return args.Error(0)
}

// SearchJSON implements the PackageManager interface.
func (m *ManagerMock) SearchJSON(ctx context.Context, input *hub.SearchPackageInput) (*hub.JSONQueryResult, error) {
	args := m.Called(ctx, input)
	data, _ := args.Get(0).(*hub.JSONQueryResult)
	return data, args.Error(1)
}

// SearchMonocularJSON implements the PackageManager interface.
func (m *ManagerMock) SearchMonocularJSON(ctx context.Context, baseURL, tsQueryWeb string) ([]byte, error) {
	args := m.Called(ctx, baseURL, tsQueryWeb)
	data, _ := args.Get(0).([]byte)
	return data, args.Error(1)
}

// ToggleStar implements the PackageManager interface.
func (m *ManagerMock) ToggleStar(ctx context.Context, packageID string) error {
	args := m.Called(ctx, packageID)
	return args.Error(0)
}

// UpdateSnapshotSecurityReport implements the PackageManager interface.
func (m *ManagerMock) UpdateSnapshotSecurityReport(ctx context.Context, r *hub.SnapshotSecurityReport) error {
	args := m.Called(ctx, r)
	return args.Error(0)
}

// Unregister implements the PackageManager interface.
func (m *ManagerMock) Unregister(ctx context.Context, pkg *hub.Package) error {
	args := m.Called(ctx, pkg)
	return args.Error(0)
}

// ViewsTrackerMock is a mock implementation of the ViewsTracker interface.
type ViewsTrackerMock struct {
	mock.Mock
}

// TrackView implements the ViewsTracker interface.
func (m *ViewsTrackerMock) TrackView(packageID, version string) error {
	args := m.Called(packageID, version)
	return args.Error(0)
}
