package subscription

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/artifacthub/hub/cmd/hub/handlers/helpers"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/subscription"
	"github.com/go-chi/chi"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

// Handlers represents a group of http handlers in charge of handling
// subscriptions operations.
type Handlers struct {
	subscriptionManager hub.SubscriptionManager
	logger              zerolog.Logger
}

// NewHandlers creates a new Handlers instance.
func NewHandlers(subscriptionManager hub.SubscriptionManager) *Handlers {
	return &Handlers{
		subscriptionManager: subscriptionManager,
		logger:              log.With().Str("handlers", "subscription").Logger(),
	}
}

// Add is an http handler that adds the provided subscription to the database.
func (h *Handlers) Add(w http.ResponseWriter, r *http.Request) {
	s := &hub.Subscription{}
	if err := json.NewDecoder(r.Body).Decode(&s); err != nil {
		h.logger.Error().Err(err).Str("method", "Add").Msg("invalid subscription")
		http.Error(w, "subscription provided is not valid", http.StatusBadRequest)
		return
	}
	if err := h.subscriptionManager.Add(r.Context(), s); err != nil {
		h.logger.Error().Err(err).Str("method", "Add").Send()
		if errors.Is(err, subscription.ErrInvalidInput) {
			http.Error(w, err.Error(), http.StatusBadRequest)
		} else {
			http.Error(w, "", http.StatusInternalServerError)
		}
		return
	}
}

// Delete is an http handler that removes the provided subscription from the
// database.
func (h *Handlers) Delete(w http.ResponseWriter, r *http.Request) {
	s := &hub.Subscription{}
	if err := json.NewDecoder(r.Body).Decode(&s); err != nil {
		h.logger.Error().Err(err).Str("method", "Delete").Msg("invalid subscription")
		http.Error(w, "subscription provided is not valid", http.StatusBadRequest)
		return
	}
	if err := h.subscriptionManager.Delete(r.Context(), s); err != nil {
		h.logger.Error().Err(err).Str("method", "Delete").Send()
		if errors.Is(err, subscription.ErrInvalidInput) {
			http.Error(w, err.Error(), http.StatusBadRequest)
		} else {
			http.Error(w, "", http.StatusInternalServerError)
		}
		return
	}
}

// GetByPackage is an http handler that returns the subscriptions a user has
// for a given package.
func (h *Handlers) GetByPackage(w http.ResponseWriter, r *http.Request) {
	packageID := chi.URLParam(r, "packageID")
	dataJSON, err := h.subscriptionManager.GetByPackageJSON(r.Context(), packageID)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetByPackage").Send()
		if errors.Is(err, subscription.ErrInvalidInput) {
			http.Error(w, err.Error(), http.StatusBadRequest)
		} else {
			http.Error(w, "", http.StatusInternalServerError)
		}
		return
	}
	helpers.RenderJSON(w, dataJSON, 0)
}

// GetByUser is an http handler that returns the subscriptions of the user
// doing the request.
func (h *Handlers) GetByUser(w http.ResponseWriter, r *http.Request) {
	dataJSON, err := h.subscriptionManager.GetByUserJSON(r.Context())
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetByUser").Send()
		http.Error(w, "", http.StatusInternalServerError)
		return
	}
	helpers.RenderJSON(w, dataJSON, 0)
}
