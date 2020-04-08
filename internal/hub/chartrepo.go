package hub

import "context"

// ChartRepository represents a Helm chart repository.
type ChartRepository struct {
	ChartRepositoryID string `json:"chart_repository_id"`
	Name              string `json:"name"`
	DisplayName       string `json:"display_name"`
	URL               string `json:"url"`
	UserID            string `json:"user_id"`
}

// ChartRepositoryManager describes the methods an ChartRepositoryManager
// implementation must provide.
type ChartRepositoryManager interface {
	Add(ctx context.Context, orgName string, r *ChartRepository) error
	CheckAvailability(ctx context.Context, resourceKind, value string) (bool, error)
	Delete(ctx context.Context, name string) error
	GetAll(ctx context.Context) ([]*ChartRepository, error)
	GetByName(ctx context.Context, name string) (*ChartRepository, error)
	GetPackagesDigest(ctx context.Context, chartRepositoryID string) (map[string]string, error)
	GetOwnedByOrgJSON(ctx context.Context, orgName string) ([]byte, error)
	GetOwnedByUserJSON(ctx context.Context) ([]byte, error)
	SetLastTrackingResults(ctx context.Context, chartRepositoryID, errs string) error
	Update(ctx context.Context, r *ChartRepository) error
}
