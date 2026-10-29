package category

import (
	"context"
	"fmt"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/rs/zerolog/log"
)

// Repredict predicts again the category of the packages whose category was
// predicted using the classifier provided, updating only the ones whose
// category changes. When neither the model nor the packages' latest versions
// have changed since the categories were predicted, nothing is updated.
func Repredict(ctx context.Context, cm hub.CategoryManager, c *Classifier) error {
	// Get packages with predicted category
	pkgs, err := cm.GetPackagesWithPredictedCategory(ctx)
	if err != nil {
		return fmt.Errorf("error getting packages with predicted category: %w", err)
	}

	// Predict their category again, keeping the ones that changed
	var predictions []*hub.PackageCategoryPrediction
	for _, p := range pkgs {
		category := c.predict(p.Name, p.Keywords, p.Description)
		if category != p.Category {
			predictions = append(predictions, &hub.PackageCategoryPrediction{
				PackageID:     p.PackageID,
				LatestVersion: p.LatestVersion,
				Category:      category,
			})
		}
	}

	// Update packages categories
	if len(predictions) > 0 {
		if err := cm.UpdatePredictedCategories(ctx, predictions); err != nil {
			return fmt.Errorf("error updating packages predicted categories: %w", err)
		}
	}
	log.Info().
		Int("packages", len(pkgs)).
		Int("updated", len(predictions)).
		Msg("packages predicted categories checked")
	return nil
}
