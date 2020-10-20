package scanner

import "github.com/stretchr/testify/mock"

// Mock is a mock implementation of the Scanner interface.
type Mock struct {
	mock.Mock
}

// Scan implements the Scanner interface.
func (m *Mock) Scan(image string) ([]byte, error) {
	args := m.Called(image)
	data, _ := args.Get(0).([]byte)
	return data, args.Error(1)
}
