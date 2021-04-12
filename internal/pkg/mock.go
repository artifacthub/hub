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

// Get implements the PackageManager interface.
func (m *ManagerMock) Get(ctx context.Context, input *hub.GetPackageInput) (*hub.Package, error) {
	args := m.Called(ctx, input)
	data, _ := args.Get(0).(*hub.Package)
	return data, args.Error(1)
}

// GetChangeLogJSON implements the PackageManager interface.
func (m *ManagerMock) GetChangeLogJSON(ctx context.Context, pkgID string) ([]byte, error) {
	args := m.Called(ctx, pkgID)
	data, _ := args.Get(0).([]byte)
	return data, args.Error(1)
}

// GetHarborReplicationDumpJSON implements the PackageManager interface.
func (m *ManagerMock) GetHarborReplicationDumpJSON(ctx context.Context) ([]byte, error) {
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
func (m *ManagerMock) GetStarredByUserJSON(ctx context.Context) ([]byte, error) {
	args := m.Called(ctx)
	data, _ := args.Get(0).([]byte)
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

// Register implements the PackageManager interface.
func (m *ManagerMock) Register(ctx context.Context, pkg *hub.Package) error {
	args := m.Called(ctx, pkg)
	return args.Error(0)
}

// SearchJSON implements the PackageManager interface.
func (m *ManagerMock) SearchJSON(ctx context.Context, input *hub.SearchPackageInput) ([]byte, error) {
	args := m.Called(ctx, input)
	data, _ := args.Get(0).([]byte)
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
