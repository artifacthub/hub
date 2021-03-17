package stats

import (
	"context"

	"github.com/stretchr/testify/mock"
)

// ManagerMock is a mock implementation of the StatsManager interface.
type ManagerMock struct {
	mock.Mock
}

// GetJSON implements the StatsManager interface.
func (m *ManagerMock) GetJSON(ctx context.Context) ([]byte, error) {
	args := m.Called(ctx)
	data, _ := args.Get(0).([]byte)
	return data, args.Error(1)
}
