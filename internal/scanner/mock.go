package scanner

import "github.com/stretchr/testify/mock"

// ImageScannerMock is an ImageScanner mock implementation.
type ImageScannerMock struct {
	mock.Mock
}

// ScanImage implements the ImageScanner interface.
func (m *ImageScannerMock) ScanImage(image string) ([]byte, error) {
	args := m.Called(image)
	data, _ := args.Get(0).([]byte)
	return data, args.Error(1)
}
