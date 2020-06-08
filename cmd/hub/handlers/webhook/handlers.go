package webhook

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"text/template"

	"github.com/artifacthub/hub/cmd/hub/handlers/helpers"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/notification"
	"github.com/artifacthub/hub/internal/webhook"
	"github.com/go-chi/chi"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

// Handlers represents a group of http handlers in charge of handling webhooks
// operations.
type Handlers struct {
	webhookManager hub.WebhookManager
	logger         zerolog.Logger
}

// NewHandlers creates a new Handlers instance.
func NewHandlers(webhookManager hub.WebhookManager) *Handlers {
	return &Handlers{
		webhookManager: webhookManager,
		logger:         log.With().Str("handlers", "webhook").Logger(),
	}
}

// Add is an http handler that adds the provided webhook to the database.
func (h *Handlers) Add(w http.ResponseWriter, r *http.Request) {
	orgName := chi.URLParam(r, "orgName")
	wh := &hub.Webhook{}
	if err := json.NewDecoder(r.Body).Decode(&wh); err != nil {
		h.logger.Error().Err(err).Str("method", "Add").Msg(webhook.ErrInvalidInput.Error())
		http.Error(w, webhook.ErrInvalidInput.Error(), http.StatusBadRequest)
		return
	}
	if err := h.webhookManager.Add(r.Context(), orgName, wh); err != nil {
		h.logger.Error().Err(err).Str("method", "Add").Send()
		switch {
		case errors.Is(err, webhook.ErrInvalidInput):
			http.Error(w, err.Error(), http.StatusBadRequest)
		case errors.Is(err, hub.ErrInsufficientPrivilege):
			http.Error(w, "", http.StatusForbidden)
		default:
			http.Error(w, "", http.StatusInternalServerError)
		}
	}
}

// Delete is an http handler that deletes the provided webhook from the database.
func (h *Handlers) Delete(w http.ResponseWriter, r *http.Request) {
	webhookID := chi.URLParam(r, "webhookID")
	if err := h.webhookManager.Delete(r.Context(), webhookID); err != nil {
		h.logger.Error().Err(err).Str("method", "Delete").Send()
		switch {
		case errors.Is(err, webhook.ErrInvalidInput):
			http.Error(w, err.Error(), http.StatusBadRequest)
		case errors.Is(err, hub.ErrInsufficientPrivilege):
			http.Error(w, "", http.StatusForbidden)
		default:
			http.Error(w, "", http.StatusInternalServerError)
		}
	}
}

// Get is an http handler that returns the requested webhook.
func (h *Handlers) Get(w http.ResponseWriter, r *http.Request) {
	webhookID := chi.URLParam(r, "webhookID")
	dataJSON, err := h.webhookManager.GetJSON(r.Context(), webhookID)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "Get").Send()
		switch {
		case errors.Is(err, webhook.ErrInvalidInput):
			http.Error(w, err.Error(), http.StatusBadRequest)
		case errors.Is(err, hub.ErrInsufficientPrivilege):
			http.Error(w, "", http.StatusForbidden)
		default:
			http.Error(w, "", http.StatusInternalServerError)
		}
		return
	}
	helpers.RenderJSON(w, dataJSON, 0)
}

// GetOwnedByOrg is an http handler that returns the webhooks owned by the
// organization provided. The user doing the request must belong to the
// organization.
func (h *Handlers) GetOwnedByOrg(w http.ResponseWriter, r *http.Request) {
	orgName := chi.URLParam(r, "orgName")
	dataJSON, err := h.webhookManager.GetOwnedByOrgJSON(r.Context(), orgName)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetOwnedByOrg").Send()
		if errors.Is(err, webhook.ErrInvalidInput) {
			http.Error(w, err.Error(), http.StatusBadRequest)
		} else {
			http.Error(w, "", http.StatusInternalServerError)
		}
		return
	}
	helpers.RenderJSON(w, dataJSON, 0)
}

// GetOwnedByUser is an http handler that returns the webhooks owned by the
// user doing the request.
func (h *Handlers) GetOwnedByUser(w http.ResponseWriter, r *http.Request) {
	dataJSON, err := h.webhookManager.GetOwnedByUserJSON(r.Context())
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetOwnedByUser").Send()
		http.Error(w, "", http.StatusInternalServerError)
		return
	}
	helpers.RenderJSON(w, dataJSON, 0)
}

// TriggerTest is an http handler used to test a webhook before adding or
// updating it.
func (h *Handlers) TriggerTest(w http.ResponseWriter, r *http.Request) {
	// Read webhook from request body
	wh := &hub.Webhook{}
	if err := json.NewDecoder(r.Body).Decode(&wh); err != nil {
		http.Error(w, webhook.ErrInvalidInput.Error(), http.StatusBadRequest)
		return
	}

	// Prepare payload
	var tmpl *template.Template
	if wh.Template != "" {
		var err error
		tmpl, err = template.New("").Parse(wh.Template)
		if err != nil {
			http.Error(w, fmt.Sprintf("error parsing template: %s", err.Error()), http.StatusBadRequest)
			return
		}
	} else {
		tmpl = notification.DefaultWebhookPayloadTmpl
	}
	var payload bytes.Buffer
	if err := tmpl.Execute(&payload, webhookTestTemplateData); err != nil {
		http.Error(w, fmt.Sprintf("error executing template: %s", err.Error()), http.StatusBadRequest)
		return
	}

	// Call webhook endpoint
	req, _ := http.NewRequest("POST", wh.URL, &payload)
	contentType := wh.ContentType
	if contentType == "" {
		contentType = notification.DefaultPayloadContentType
	}
	req.Header.Set("Content-Type", contentType)
	req.Header.Set("X-ArtifactHub-Secret", wh.Secret)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		http.Error(w, fmt.Sprintf("error doing request: %s", err.Error()), http.StatusBadRequest)
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		http.Error(w, fmt.Sprintf("received unexpected status code: %d", resp.StatusCode), http.StatusBadRequest)
	}
}

// Update is an http handler that updates the provided webhook in the database.
func (h *Handlers) Update(w http.ResponseWriter, r *http.Request) {
	wh := &hub.Webhook{}
	if err := json.NewDecoder(r.Body).Decode(&wh); err != nil {
		h.logger.Error().Err(err).Str("method", "Update").Msg(webhook.ErrInvalidInput.Error())
		http.Error(w, webhook.ErrInvalidInput.Error(), http.StatusBadRequest)
		return
	}
	wh.WebhookID = chi.URLParam(r, "webhookID")
	if err := h.webhookManager.Update(r.Context(), wh); err != nil {
		h.logger.Error().Err(err).Str("method", "Update").Send()
		switch {
		case errors.Is(err, webhook.ErrInvalidInput):
			http.Error(w, err.Error(), http.StatusBadRequest)
		case errors.Is(err, hub.ErrInsufficientPrivilege):
			http.Error(w, "", http.StatusForbidden)
		default:
			http.Error(w, "", http.StatusInternalServerError)
		}
	}
}

// webhookTestTemplateData represents the notification template data used by
// TriggerTest handler.
var webhookTestTemplateData = &hub.NotificationTemplateData{
	BaseURL: "https://artifacthub.io",
	Event: map[string]interface{}{
		"id":   "00000000-0000-0000-0000-000000000001",
		"kind": "package.new-release",
	},
	Package: map[string]interface{}{
		"kind":      "helm-chart",
		"name":      "sample-package",
		"version":   "1.0.0",
		"publisher": "artifacthub",
		"url":       "https://artifacthub.io/packages/chart/artifacthub/sample-package",
	},
}
