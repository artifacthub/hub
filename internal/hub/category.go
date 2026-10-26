package hub

import (
	"context"
)

// PackageCategorySource represents where the category of a package comes from.
type PackageCategorySource string

const (
	// PackageCategorySourcePublisher represents a category provided by the
	// package publisher.
	PackageCategorySourcePublisher PackageCategorySource = "publisher"

	// PackageCategorySourcePredicted represents a category predicted by the
	// package category classifier. Packages whose prediction did not reach the
	// confidence threshold (unknown category) also use this source, so that
	// they remain eligible for future predictions.
	PackageCategorySourcePredicted PackageCategorySource = "predicted"

	// PackageCategorySourceSkip represents a package whose publisher requested
	// that its category is not predicted.
	PackageCategorySourceSkip PackageCategorySource = "skip"
)

// CategoryManager describes the methods a CategoryManager implementation must
// provide.
type CategoryManager interface {
	GetPackagesWithPredictedCategory(ctx context.Context) ([]*PackageWithPredictedCategory, error)
	UpdatePredictedCategories(ctx context.Context, predictions []*PackageCategoryPrediction) error
}

// PackageWithPredictedCategory represents a package whose category was
// predicted, so that it can be predicted again on full tracker runs.
type PackageWithPredictedCategory struct {
	PackageID     string          `json:"package_id"`
	LatestVersion string          `json:"latest_version"`
	Name          string          `json:"name"`
	Keywords      []string        `json:"keywords"`
	Description   string          `json:"description"`
	Category      PackageCategory `json:"category"`
}

// PackageCategoryPrediction represents the category predicted for a package
// from the data of its latest version provided.
type PackageCategoryPrediction struct {
	PackageID     string          `json:"package_id"`
	LatestVersion string          `json:"latest_version"`
	Category      PackageCategory `json:"category"`
}
