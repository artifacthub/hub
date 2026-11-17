package scanner

import "github.com/stretchr/testify/mock"

// ImageScannerMock is an ImageScanner mock implementation.
type ImageScannerMock struct {
	mock.Mock
}

// Close implements the ImageScanner interface.
func (m *ImageScannerMock) Close() error {
	args := m.Called()
	return args.Error(0)
}

// Prepare implements the ImageScanner interface.
func (m *ImageScannerMock) Prepare() error {
	args := m.Called()
	return args.Error(0)
}

// ScanImage implements the ImageScanner interface.
func (m *ImageScannerMock) ScanImage(image string) ([]byte, error) {
	args := m.Called(image)
	data, _ := args.Get(0).([]byte)
	return data, args.Error(1)
}
