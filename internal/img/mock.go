package img

import (
	"context"

	"github.com/stretchr/testify/mock"
)

// StoreMock is a mock implementation of the img.Store interface.
type StoreMock struct {
	mock.Mock
}

// DownloadAndSaveImage implements the img.Store interface.
func (m *StoreMock) DownloadAndSaveImage(ctx context.Context, imageURL string) (string, error) {
	args := m.Called(ctx, imageURL)
	return args.String(0), args.Error(1)
}

// GetImage implements the img.Store interface.
func (m *StoreMock) GetImage(ctx context.Context, imageID, version string) ([]byte, error) {
	args := m.Called(ctx, imageID, version)
	data, _ := args.Get(0).([]byte)
	return data, args.Error(1)
}

// SaveImage implements the img.Store interface.
func (m *StoreMock) SaveImage(ctx context.Context, data []byte) (string, error) {
	args := m.Called(ctx, data)
	return args.String(0), args.Error(1)
}
