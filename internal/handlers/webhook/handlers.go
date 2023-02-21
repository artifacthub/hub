package webhook

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"text/template"

	"github.com/artifacthub/hub/internal/handlers/helpers"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/notification"
	"github.com/go-chi/chi/v5"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

// Handlers represents a group of http handlers in charge of handling webhooks
// operations.
type Handlers struct {
	webhookManager hub.WebhookManager
	logger         zerolog.Logger
	hc             hub.HTTPClient
}

// NewHandlers creates a new Handlers instance.
func NewHandlers(webhookManager hub.WebhookManager, hc hub.HTTPClient) *Handlers {
	return &Handlers{
		webhookManager: webhookManager,
		logger:         log.With().Str("handlers", "webhook").Logger(),
		hc:             hc,
	}
}

// Add is an http handler that adds the provided webhook to the database.
func (h *Handlers) Add(w http.ResponseWriter, r *http.Request) {
	orgName := chi.URLParam(r, "orgName")
	wh := &hub.Webhook{}
	if err := json.NewDecoder(r.Body).Decode(&wh); err != nil {
		h.logger.Error().Err(err).Str("method", "Add").Msg(hub.ErrInvalidInput.Error())
		helpers.RenderErrorJSON(w, hub.ErrInvalidInput)
		return
	}
	if err := h.webhookManager.Add(r.Context(), orgName, wh); err != nil {
		h.logger.Error().Err(err).Str("method", "Add").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	w.WriteHeader(http.StatusCreated)
}

// Delete is an http handler that deletes the provided webhook from the database.
func (h *Handlers) Delete(w http.ResponseWriter, r *http.Request) {
	webhookID := chi.URLParam(r, "webhookID")
	if err := h.webhookManager.Delete(r.Context(), webhookID); err != nil {
		h.logger.Error().Err(err).Str("method", "Delete").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// Get is an http handler that returns the requested webhook.
func (h *Handlers) Get(w http.ResponseWriter, r *http.Request) {
	webhookID := chi.URLParam(r, "webhookID")
	dataJSON, err := h.webhookManager.GetJSON(r.Context(), webhookID)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "Get").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	helpers.RenderJSON(w, dataJSON, 0, http.StatusOK)
}

// GetOwnedByOrg is an http handler that returns the webhooks owned by the
// organization provided. The user doing the request must belong to the
// organization.
func (h *Handlers) GetOwnedByOrg(w http.ResponseWriter, r *http.Request) {
	orgName := chi.URLParam(r, "orgName")
	p, err := helpers.GetPagination(r.URL.Query(), helpers.PaginationDefaultLimit, helpers.PaginationMaxLimit)
	if err != nil {
		err = fmt.Errorf("%w: %w", hub.ErrInvalidInput, err)
		h.logger.Error().Err(err).Str("query", r.URL.RawQuery).Str("method", "GetOwnedByOrg").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	result, err := h.webhookManager.GetOwnedByOrgJSON(r.Context(), orgName, p)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetOwnedByOrg").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	w.Header().Set(helpers.PaginationTotalCount, strconv.Itoa(result.TotalCount))
	helpers.RenderJSON(w, result.Data, 0, http.StatusOK)
}

// GetOwnedByUser is an http handler that returns the webhooks owned by the
// user doing the request.
func (h *Handlers) GetOwnedByUser(w http.ResponseWriter, r *http.Request) {
	p, err := helpers.GetPagination(r.URL.Query(), helpers.PaginationDefaultLimit, helpers.PaginationMaxLimit)
	if err != nil {
		err = fmt.Errorf("%w: %w", hub.ErrInvalidInput, err)
		h.logger.Error().Err(err).Str("query", r.URL.RawQuery).Str("method", "GetOwnedByUser").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	result, err := h.webhookManager.GetOwnedByUserJSON(r.Context(), p)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetOwnedByUser").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	w.Header().Set(helpers.PaginationTotalCount, strconv.Itoa(result.TotalCount))
	helpers.RenderJSON(w, result.Data, 0, http.StatusOK)
}

// TriggerTest is an http handler used to test a webhook before adding or
// updating it.
func (h *Handlers) TriggerTest(w http.ResponseWriter, r *http.Request) {
	// Read webhook from request body
	wh := &hub.Webhook{}
	if err := json.NewDecoder(r.Body).Decode(&wh); err != nil {
		helpers.RenderErrorJSON(w, hub.ErrInvalidInput)
		return
	}

	// Prepare payload
	var tmpl *template.Template
	if wh.Template != "" {
		var err error
		tmpl, err = template.New("").Parse(wh.Template)
		if err != nil {
			err = fmt.Errorf("error parsing template: %w", err)
			helpers.RenderErrorWithCodeJSON(w, err, http.StatusBadRequest)
			return
		}
	} else {
		tmpl = notification.DefaultWebhookPayloadTmpl
	}
	var payload bytes.Buffer
	if err := tmpl.Execute(&payload, webhookTestTemplateData); err != nil {
		err = fmt.Errorf("error executing template: %w", err)
		helpers.RenderErrorWithCodeJSON(w, err, http.StatusBadRequest)
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
	resp, err := h.hc.Do(req)
	if err != nil {
		err = fmt.Errorf("error doing request: %w", err)
		helpers.RenderErrorWithCodeJSON(w, err, http.StatusBadRequest)
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		err := fmt.Errorf("received unexpected status code: %d", resp.StatusCode)
		helpers.RenderErrorWithCodeJSON(w, err, http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// Update is an http handler that updates the provided webhook in the database.
func (h *Handlers) Update(w http.ResponseWriter, r *http.Request) {
	wh := &hub.Webhook{}
	if err := json.NewDecoder(r.Body).Decode(&wh); err != nil {
		h.logger.Error().Err(err).Str("method", "Update").Msg(hub.ErrInvalidInput.Error())
		helpers.RenderErrorJSON(w, hub.ErrInvalidInput)
		return
	}
	wh.WebhookID = chi.URLParam(r, "webhookID")
	if err := h.webhookManager.Update(r.Context(), wh); err != nil {
		h.logger.Error().Err(err).Str("method", "Update").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// webhookTestTemplateData represents the notification template data used by
// TriggerTest handler.
var webhookTestTemplateData = &hub.PackageNotificationTemplateData{
	BaseURL: "https://baseURL",
	Event: map[string]interface{}{
		"ID":   "00000000-0000-0000-0000-000000000001",
		"Kind": "package.new-release",
	},
	Package: map[string]interface{}{
		"Name":    "sample-package",
		"Version": "1.0.0",
		"URL":     "https://artifacthub.io/packages/helm/artifacthub/sample-package/1.0.0",
		"Changes": []*hub.Change{
			{
				Description: "Cool feature",
			},
			{
				Description: "Bug fixed",
			},
		},
		"ContainsSecurityUpdates": true,
		"Prerelease":              true,
		"Repository": map[string]interface{}{
			"Kind":      "helm",
			"Name":      "repo1",
			"Publisher": "org1",
		},
	},
}
