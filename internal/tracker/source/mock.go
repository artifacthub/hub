package source

import (
	"github.com/artifacthub/hub/internal/hub"
	"github.com/stretchr/testify/mock"
)

// Mock is a mock TrackerSource implementation.
type Mock struct {
	mock.Mock
}

// GetPackagesAvailable implements the TrackerSource interface.
func (m *Mock) GetPackagesAvailable() (map[string]*hub.Package, error) {
	args := m.Called()
	data, _ := args.Get(0).(map[string]*hub.Package)
	return data, args.Error(1)
}
