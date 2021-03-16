package stats

import (
	"context"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/util"
)

const (
	// Database queries
	getStatsDBQ = `select get_stats()`
)

// Manager provides an API to manage stats.
type Manager struct {
	db hub.DB
}

// NewManager creates a new Manager instance.
func NewManager(db hub.DB) *Manager {
	return &Manager{
		db: db,
	}
}

// GetJSON returns some stats as a json object built by the database.
func (m *Manager) GetJSON(ctx context.Context) ([]byte, error) {
	return util.DBQueryJSON(ctx, m.db, getStatsDBQ)
}
