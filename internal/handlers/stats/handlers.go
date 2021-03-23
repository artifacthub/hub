package stats

import (
	"net/http"
	"time"

	"github.com/artifacthub/hub/internal/handlers/helpers"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

// Handlers represents a group of http handlers in charge of handling stats
// operations.
type Handlers struct {
	statsManager hub.StatsManager
	logger       zerolog.Logger
}

// NewHandlers creates a new Handlers instance.
func NewHandlers(statsManager hub.StatsManager) *Handlers {
	return &Handlers{
		statsManager: statsManager,
		logger:       log.With().Str("handlers", "stats").Logger(),
	}
}

// Get is an http handler that returns some stats.
func (h *Handlers) Get(w http.ResponseWriter, r *http.Request) {
	dataJSON, err := h.statsManager.GetJSON(r.Context())
	if err != nil {
		h.logger.Error().Err(err).Str("method", "Get").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	helpers.RenderJSON(w, dataJSON, 6*time.Hour, http.StatusOK)
}
