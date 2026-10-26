package category

import (
	"context"
	"encoding/json"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/util"
)

const (
	// Database queries
	getPackagesWithPredictedCategoryDBQ = `select get_packages_with_predicted_category()`
	updatePredictedCategoriesDBQ        = `select update_packages_predicted_category($1::jsonb)`
)

// Manager provides an API to manage the predicted categories of the packages.
type Manager struct {
	db hub.DB
}

// NewManager creates a new Manager instance.
func NewManager(db hub.DB) *Manager {
	return &Manager{
		db: db,
	}
}

// GetPackagesWithPredictedCategory returns the packages whose category was
// predicted (including the ones whose prediction didn't result in any
// category).
func (m *Manager) GetPackagesWithPredictedCategory(ctx context.Context) ([]*hub.PackageWithPredictedCategory, error) {
	dataJSON, err := util.DBQueryJSON(ctx, m.db, getPackagesWithPredictedCategoryDBQ)
	if err != nil {
		return nil, err
	}
	var pkgs []*hub.PackageWithPredictedCategory
	if err := json.Unmarshal(dataJSON, &pkgs); err != nil {
		return nil, err
	}
	return pkgs, nil
}

// UpdatePredictedCategories updates the category of the packages provided, as
// long as their current category is a predicted one. A category of zero
// (unknown) clears the package's category.
func (m *Manager) UpdatePredictedCategories(ctx context.Context, predictions []*hub.PackageCategoryPrediction) error {
	if len(predictions) == 0 {
		return nil
	}
	predictionsJSON, err := json.Marshal(predictions)
	if err != nil {
		return err
	}
	_, err = m.db.Exec(ctx, updatePredictedCategoriesDBQ, predictionsJSON)
	return err
}
