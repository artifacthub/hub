package tracker

import (
	"github.com/artifacthub/hub/internal/hub"
	"github.com/stretchr/testify/mock"
)

// PackageCategoryClassifierMock is a mock implementation of the
// PackageCategoryClassifier interface.
type PackageCategoryClassifierMock struct {
	mock.Mock
}

// Predict implements the PackageCategoryClassifier interface.
func (m *PackageCategoryClassifierMock) Predict(p *hub.Package) hub.PackageCategory {
	args := m.Called(p)
	category, _ := args.Get(0).(hub.PackageCategory)
	return category
}
