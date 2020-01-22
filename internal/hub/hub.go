package hub

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v4/pgxpool"
)

type Hub struct {
	db *pgxpool.Pool
}

func New(db *pgxpool.Pool) *Hub {
	return &Hub{
		db: db,
	}
}

func (h *Hub) GetChartRepositoryByName(ctx context.Context, name string) (*ChartRepository, error) {
	var r *ChartRepository
	err := h.dbQueryUnmarshal(ctx, &r, "select get_chart_repository_by_name($1)", name)
	return r, err
}

func (h *Hub) GetChartRepositories(ctx context.Context) ([]*ChartRepository, error) {
	var r []*ChartRepository
	err := h.dbQueryUnmarshal(ctx, &r, "select get_chart_repositories()")
	return r, err
}

func (h *Hub) GetChartRepositoryPackagesDigest(ctx context.Context, chart_repository_id string) (map[string]string, error) {
	pd := make(map[string]string)
	err := h.dbQueryUnmarshal(ctx, &pd, "select get_chart_repository_packages_digest($1)", chart_repository_id)
	return pd, err
}

func (h *Hub) GetStatsJSON(ctx context.Context) ([]byte, error) {
	return h.dbQueryJSON(ctx, "select get_stats()")
}

func (h *Hub) SearchPackages(ctx context.Context, query *Query) ([]byte, error) {
	queryJSON, err := json.Marshal(query)
	if err != nil {
		return nil, err
	}
	return h.dbQueryJSON(ctx, "select search_packages($1)", queryJSON)
}

func (h *Hub) RegisterPackage(ctx context.Context, pkg *Package) error {
	return h.dbExec(ctx, "select register_package($1)", pkg)
}

func (h *Hub) GetPackageJSON(ctx context.Context, packageID string) ([]byte, error) {
	return h.dbQueryJSON(ctx, "select get_package($1)", packageID)
}

func (h *Hub) GetPackageVersionJSON(ctx context.Context, packageID, version string) ([]byte, error) {
	return h.dbQueryJSON(ctx, "select get_package_version($1, $2)", packageID, version)
}

func (h *Hub) dbQueryJSON(ctx context.Context, query string, args ...interface{}) ([]byte, error) {
	var jsonData []byte
	if err := h.db.QueryRow(ctx, query, args...).Scan(&jsonData); err != nil {
		return nil, err
	}
	return jsonData, nil
}

func (h *Hub) dbQueryUnmarshal(ctx context.Context, v interface{}, query string, args ...interface{}) error {
	jsonData, err := h.dbQueryJSON(ctx, query, args...)
	if err != nil {
		return err
	}
	if err := json.Unmarshal(jsonData, &v); err != nil {
		return err
	}
	return nil
}

func (h *Hub) dbExec(ctx context.Context, query string, arg interface{}) error {
	jsonArg, err := json.Marshal(arg)
	if err != nil {
		return err
	}
	_, err = h.db.Exec(ctx, query, jsonArg)
	return err
}
