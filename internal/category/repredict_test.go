package category

import (
	"context"
	"testing"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRepredict(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	c, err := NewClassifier(newTestModel())
	require.NoError(t, err)

	t.Run("error getting packages", func(t *testing.T) {
		t.Parallel()
		cm := &ManagerMock{}
		cm.On("GetPackagesWithPredictedCategory", ctx).Return(nil, tests.ErrFake)
		assert.ErrorIs(t, Repredict(ctx, cm, c), tests.ErrFake)
		cm.AssertExpectations(t)
	})

	t.Run("only changed categories are updated", func(t *testing.T) {
		t.Parallel()
		cm := &ManagerMock{}
		cm.On("GetPackagesWithPredictedCategory", ctx).Return([]*hub.PackageWithPredictedCategory{
			{PackageID: "p1", LatestVersion: "1.0.0", Name: "nginx", Category: 5},
			{PackageID: "p2", LatestVersion: "1.0.0", Name: "pkg2", Keywords: []string{"postgres"}, Category: 6},
			{PackageID: "p3", LatestVersion: "2.0.0", Name: "pkg3", Category: 2},
		}, nil)
		cm.On("UpdatePredictedCategories", ctx, []*hub.PackageCategoryPrediction{
			{PackageID: "p2", LatestVersion: "1.0.0", Category: 2},
			{PackageID: "p3", LatestVersion: "2.0.0", Category: hub.UnknownCategory},
		}).Return(nil)
		assert.NoError(t, Repredict(ctx, cm, c))
		cm.AssertExpectations(t)
	})

	t.Run("nothing is updated when no category changes", func(t *testing.T) {
		t.Parallel()
		cm := &ManagerMock{}
		cm.On("GetPackagesWithPredictedCategory", ctx).Return([]*hub.PackageWithPredictedCategory{
			{PackageID: "p1", LatestVersion: "1.0.0", Name: "nginx", Category: 5},
		}, nil)
		assert.NoError(t, Repredict(ctx, cm, c))
		cm.AssertExpectations(t)
	})

	t.Run("error updating packages", func(t *testing.T) {
		t.Parallel()
		cm := &ManagerMock{}
		cm.On("GetPackagesWithPredictedCategory", ctx).Return([]*hub.PackageWithPredictedCategory{
			{PackageID: "p1", LatestVersion: "1.0.0", Name: "nginx"},
		}, nil)
		cm.On("UpdatePredictedCategories", ctx, []*hub.PackageCategoryPrediction{
			{PackageID: "p1", LatestVersion: "1.0.0", Category: 5},
		}).Return(tests.ErrFake)
		assert.ErrorIs(t, Repredict(ctx, cm, c), tests.ErrFake)
		cm.AssertExpectations(t)
	})
}
