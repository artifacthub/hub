package category

import (
	"context"
	"testing"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestManagerGetPackagesWithPredictedCategory(t *testing.T) {
	ctx := context.Background()

	t.Run("database query succeeded", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getPackagesWithPredictedCategoryDBQ).Return([]byte(`[
			{"package_id": "pkg1", "latest_version": "1.0.0", "name": "pkg1", "keywords": ["k1", "k2"], "description": "d1", "category": 2},
			{"package_id": "pkg2", "latest_version": "2.0.0", "name": "pkg2"}
		]`), nil)
		m := NewManager(db)

		pkgs, err := m.GetPackagesWithPredictedCategory(ctx)
		require.NoError(t, err)
		assert.Equal(t, []*hub.PackageWithPredictedCategory{
			{PackageID: "pkg1", LatestVersion: "1.0.0", Name: "pkg1", Keywords: []string{"k1", "k2"}, Description: "d1", Category: 2},
			{PackageID: "pkg2", LatestVersion: "2.0.0", Name: "pkg2"},
		}, pkgs)
		db.AssertExpectations(t)
	})

	t.Run("no packages", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getPackagesWithPredictedCategoryDBQ).Return([]byte("[]"), nil)
		m := NewManager(db)

		pkgs, err := m.GetPackagesWithPredictedCategory(ctx)
		require.NoError(t, err)
		assert.Empty(t, pkgs)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("QueryRow", ctx, getPackagesWithPredictedCategoryDBQ).Return(nil, tests.ErrFakeDB)
		m := NewManager(db)

		pkgs, err := m.GetPackagesWithPredictedCategory(ctx)
		assert.Equal(t, tests.ErrFakeDB, err)
		assert.Nil(t, pkgs)
		db.AssertExpectations(t)
	})
}

func TestManagerUpdatePredictedCategories(t *testing.T) {
	ctx := context.Background()
	predictions := []*hub.PackageCategoryPrediction{
		{PackageID: "pkg1", LatestVersion: "1.0.0", Category: 2},
		{PackageID: "pkg2", LatestVersion: "2.0.0", Category: hub.UnknownCategory},
	}
	predictionsJSON := []byte(`[{"package_id":"pkg1","latest_version":"1.0.0","category":2},{"package_id":"pkg2","latest_version":"2.0.0","category":0}]`)

	t.Run("no predictions provided", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		m := NewManager(db)

		err := m.UpdatePredictedCategories(ctx, nil)
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})

	t.Run("database query succeeded", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("Exec", ctx, updatePredictedCategoriesDBQ, predictionsJSON).
			Return(nil)
		m := NewManager(db)

		err := m.UpdatePredictedCategories(ctx, predictions)
		assert.NoError(t, err)
		db.AssertExpectations(t)
	})

	t.Run("database error", func(t *testing.T) {
		t.Parallel()
		db := &tests.DBMock{}
		db.On("Exec", ctx, updatePredictedCategoriesDBQ, predictionsJSON).
			Return(tests.ErrFakeDB)
		m := NewManager(db)

		err := m.UpdatePredictedCategories(ctx, predictions)
		assert.Equal(t, tests.ErrFakeDB, err)
		db.AssertExpectations(t)
	})
}
