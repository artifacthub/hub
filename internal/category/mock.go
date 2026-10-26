package category

import (
	"context"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/stretchr/testify/mock"
)

// ClassifierMock is a mock implementation of the PackageCategoryClassifier
// interface.
type ClassifierMock struct {
	mock.Mock
}

// Predict implements the PackageCategoryClassifier interface.
func (m *ClassifierMock) Predict(p *hub.Package) hub.PackageCategory {
	args := m.Called(p)
	category, _ := args.Get(0).(hub.PackageCategory)
	return category
}

// ManagerMock is a mock implementation of the CategoryManager interface.
type ManagerMock struct {
	mock.Mock
}

// GetPackagesWithPredictedCategory implements the CategoryManager interface.
func (m *ManagerMock) GetPackagesWithPredictedCategory(ctx context.Context) ([]*hub.PackageWithPredictedCategory, error) {
	args := m.Called(ctx)
	data, _ := args.Get(0).([]*hub.PackageWithPredictedCategory)
	return data, args.Error(1)
}

// UpdatePredictedCategories implements the CategoryManager interface.
func (m *ManagerMock) UpdatePredictedCategories(ctx context.Context, predictions []*hub.PackageCategoryPrediction) error {
	args := m.Called(ctx, predictions)
	return args.Error(0)
}
