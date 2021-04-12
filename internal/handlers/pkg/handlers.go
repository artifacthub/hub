package pkg

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/Masterminds/semver/v3"
	"github.com/artifacthub/hub/internal/handlers/helpers"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/go-chi/chi"
	"github.com/gorilla/feeds"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/spf13/viper"
	"helm.sh/helm/v3/pkg/chart/loader"
)

// Handlers represents a group of http handlers in charge of handling packages
// operations.
type Handlers struct {
	pkgManager  hub.PackageManager
	repoManager hub.RepositoryManager
	cfg         *viper.Viper
	logger      zerolog.Logger
	hc          hub.HTTPClient
}

// NewHandlers creates a new Handlers instance.
func NewHandlers(
	pkgManager hub.PackageManager,
	repoManager hub.RepositoryManager,
	cfg *viper.Viper,
	hc hub.HTTPClient,
) *Handlers {
	return &Handlers{
		pkgManager:  pkgManager,
		repoManager: repoManager,
		cfg:         cfg,
		logger:      log.With().Str("handlers", "pkg").Logger(),
		hc:          hc,
	}
}

// Get is an http handler used to get a package details.
func (h *Handlers) Get(w http.ResponseWriter, r *http.Request) {
	input := &hub.GetPackageInput{
		RepositoryName: chi.URLParam(r, "repoName"),
		PackageName:    chi.URLParam(r, "packageName"),
		Version:        chi.URLParam(r, "version"),
	}
	dataJSON, err := h.pkgManager.GetJSON(r.Context(), input)
	if err != nil {
		h.logger.Error().Err(err).Interface("input", input).Str("method", "Get").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	helpers.RenderJSON(w, dataJSON, helpers.DefaultAPICacheMaxAge, http.StatusOK)
}

// GetChangeLog is an http handler used to get a package's changelog.
func (h *Handlers) GetChangeLog(w http.ResponseWriter, r *http.Request) {
	packageID := chi.URLParam(r, "packageID")
	dataJSON, err := h.pkgManager.GetChangeLogJSON(r.Context(), packageID)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetChangeLogJSON").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	helpers.RenderJSON(w, dataJSON, helpers.DefaultAPICacheMaxAge, http.StatusOK)
}

// GetChartTemplates is an http handler used to get the templates for a given
// given Helm chart package snapshot.
func (h *Handlers) GetChartTemplates(w http.ResponseWriter, r *http.Request) {
	// Get package from database as we need the content url
	input := &hub.GetPackageInput{
		PackageID: chi.URLParam(r, "packageID"),
		Version:   chi.URLParam(r, "version"),
	}
	p, err := h.pkgManager.Get(r.Context(), input)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetChartTemplates").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}

	// Only Helm charts packages can have templates
	// NOTE: OCI based repositories are NOT supported yet
	if p.Repository.Kind != hub.Helm || strings.HasPrefix(p.Repository.URL, hub.RepositoryOCIPrefix) {
		helpers.RenderErrorWithCodeJSON(w, nil, http.StatusBadRequest)
		return
	}

	// Download chart package from remote source
	req, _ := http.NewRequest("GET", p.ContentURL, nil)
	req = req.WithContext(r.Context())
	if p.Repository.Private {
		// Get credentials and set them in request if the repository is private
		repo, err := h.repoManager.GetByID(r.Context(), p.Repository.RepositoryID, true)
		if err != nil {
			h.logger.Error().Err(err).Str("method", "GetChartTemplates").Send()
			helpers.RenderErrorJSON(w, err)
			return
		}
		req.SetBasicAuth(repo.AuthUser, repo.AuthPass)
	}
	resp, err := h.hc.Do(req)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetChartTemplates").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		err := fmt.Errorf("unexpected status code received: %d", resp.StatusCode)
		h.logger.Error().Err(err).Str("method", "GetChartTemplates").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	chart, err := loader.LoadArchive(resp.Body)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetChartTemplates").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}

	// Prepare json data with templates and values and return it
	data := map[string]interface{}{
		"templates": chart.Templates,
		"values":    chart.Values,
	}
	dataJSON, _ := json.Marshal(data)
	helpers.RenderJSON(w, dataJSON, 24*time.Hour, http.StatusOK)
}

// GetHarborReplicationDump is an http handler used to get a summary of all
// available packages versions of kind Helm in the hub database so that they
// can be synchronized in Harbor.
func (h *Handlers) GetHarborReplicationDump(w http.ResponseWriter, r *http.Request) {
	dataJSON, err := h.pkgManager.GetHarborReplicationDumpJSON(r.Context())
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetHarborReplicationDump").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	helpers.RenderJSON(w, dataJSON, 1*time.Hour, http.StatusOK)
}

// GetRandom is an http handler used to get some random packages from the hub
// database.
func (h *Handlers) GetRandom(w http.ResponseWriter, r *http.Request) {
	dataJSON, err := h.pkgManager.GetRandomJSON(r.Context())
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetRandom").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	helpers.RenderJSON(w, dataJSON, helpers.DefaultAPICacheMaxAge, http.StatusOK)
}

// GetSnapshotSecurityReport is an http handler used to get the security report
// of a package's snapshot.
func (h *Handlers) GetSnapshotSecurityReport(w http.ResponseWriter, r *http.Request) {
	packageID := chi.URLParam(r, "packageID")
	version := chi.URLParam(r, "version")
	dataJSON, err := h.pkgManager.GetSnapshotSecurityReportJSON(r.Context(), packageID, version)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetSnapshotSecurityReportJSON").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	helpers.RenderJSON(w, dataJSON, 30*time.Minute, http.StatusOK)
}

// GetStarredByUser is an http handler used to get the packages starred by the
// user doing the request.
func (h *Handlers) GetStarredByUser(w http.ResponseWriter, r *http.Request) {
	dataJSON, err := h.pkgManager.GetStarredByUserJSON(r.Context())
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetStarredByUser").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	helpers.RenderJSON(w, dataJSON, 0, http.StatusOK)
}

// GetStars is an http handler used to get the number of stars of the package
// provided.
func (h *Handlers) GetStars(w http.ResponseWriter, r *http.Request) {
	packageID := chi.URLParam(r, "packageID")
	dataJSON, err := h.pkgManager.GetStarsJSON(r.Context(), packageID)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetStars").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	helpers.RenderJSON(w, dataJSON, 0, http.StatusOK)
}

// GetStats is an http handler used to get some stats about packages registered
// in the hub database.
func (h *Handlers) GetStats(w http.ResponseWriter, r *http.Request) {
	dataJSON, err := h.pkgManager.GetStatsJSON(r.Context())
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetStats").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	helpers.RenderJSON(w, dataJSON, helpers.DefaultAPICacheMaxAge, http.StatusOK)
}

// GetSummary is an http handler used to get a package summary.
func (h *Handlers) GetSummary(w http.ResponseWriter, r *http.Request) {
	input := &hub.GetPackageInput{
		RepositoryName: chi.URLParam(r, "repoName"),
		PackageName:    chi.URLParam(r, "packageName"),
	}
	dataJSON, err := h.pkgManager.GetSummaryJSON(r.Context(), input)
	if err != nil {
		h.logger.Error().Err(err).Interface("input", input).Str("method", "GetSummary").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	helpers.RenderJSON(w, dataJSON, helpers.DefaultAPICacheMaxAge, http.StatusOK)
}

// GetValuesSchema is an http handler used to get the values schema of a
// package's snapshot.
func (h *Handlers) GetValuesSchema(w http.ResponseWriter, r *http.Request) {
	packageID := chi.URLParam(r, "packageID")
	version := chi.URLParam(r, "version")
	dataJSON, err := h.pkgManager.GetValuesSchemaJSON(r.Context(), packageID, version)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetValuesSchemaJSON").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	helpers.RenderJSON(w, dataJSON, helpers.DefaultAPICacheMaxAge, http.StatusOK)
}

// InjectIndexMeta is a middleware that injects the some index metadata related
// to a given package,
func (h *Handlers) InjectIndexMeta(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Prepare index metadata from package details
		input := &hub.GetPackageInput{
			PackageName: chi.URLParam(r, "packageName"),
			Version:     chi.URLParam(r, "version"),
		}
		repoName := chi.URLParam(r, "repoName")
		if repoName != "" {
			input.RepositoryName = repoName
		}
		p, err := h.pkgManager.Get(r.Context(), input)
		if err != nil {
			// We proceed without injecting the metadata and log the error
			h.logger.Error().Err(err).Interface("input", input).Str("method", "InjectIndexMeta").Send()
			next.ServeHTTP(w, r)
			return
		}
		publisher := p.Repository.OrganizationName
		if publisher == "" {
			publisher = p.Repository.UserAlias
		}
		title := fmt.Sprintf("%s %s · %s/%s", p.NormalizedName, p.Version, publisher, p.Repository.Name)
		description := p.Description

		// Inject index metadata in context and call next handler
		ctx := context.WithValue(r.Context(), hub.IndexMetaTitleKey, title)
		ctx = context.WithValue(ctx, hub.IndexMetaDescriptionKey, description)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// RssFeed is an http handler used to get the RSS feed of a given package.
func (h *Handlers) RssFeed(w http.ResponseWriter, r *http.Request) {
	// Get package details
	input := &hub.GetPackageInput{
		PackageName: chi.URLParam(r, "packageName"),
	}
	repoName := chi.URLParam(r, "repoName")
	if repoName != "" {
		input.RepositoryName = repoName
	}
	p, err := h.pkgManager.Get(r.Context(), input)
	if err != nil {
		h.logger.Error().Err(err).Interface("input", input).Str("method", "RssFeed").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}

	// Build RSS feed
	baseURL := h.cfg.GetString("server.baseURL")
	publisher := p.Repository.OrganizationName
	if publisher == "" {
		publisher = p.Repository.UserAlias
	}
	feed := &feeds.Feed{
		Title:       fmt.Sprintf("%s/%s (Artifact Hub)", publisher, p.NormalizedName),
		Description: p.Description,
		Link:        &feeds.Link{Href: baseURL},
		Image: &feeds.Image{
			Title: "logo",
			Url:   fmt.Sprintf("%s/image/%s@4x", baseURL, p.LogoImageID),
			Link:  baseURL,
		},
	}
	if len(p.Maintainers) > 0 {
		feed.Author = &feeds.Author{
			Name:  p.Maintainers[0].Name,
			Email: p.Maintainers[0].Email,
		}
	}
	for _, s := range p.AvailableVersions {
		feed.Items = append(feed.Items, &feeds.Item{
			Id:          fmt.Sprintf("%s#%s", p.PackageID, s.Version),
			Title:       s.Version,
			Description: fmt.Sprintf("%s %s", p.NormalizedName, s.Version),
			Created:     time.Unix(s.TS, 0),
			Link:        &feeds.Link{Href: BuildURL(baseURL, p, s.Version)},
		})
	}
	sort.Slice(feed.Items, func(i, j int) bool {
		vi, _ := semver.NewVersion(feed.Items[i].Title)
		vj, _ := semver.NewVersion(feed.Items[j].Title)
		return vj.LessThan(vi)
	})

	w.Header().Set("Cache-Control", helpers.BuildCacheControlHeader(helpers.DefaultAPICacheMaxAge))
	_ = feed.WriteRss(w)
}

// Search is an http handler used to search for packages in the hub database.
func (h *Handlers) Search(w http.ResponseWriter, r *http.Request) {
	input, err := buildSearchInput(r.URL.Query())
	if err != nil {
		err = fmt.Errorf("%w: %s", hub.ErrInvalidInput, err.Error())
		h.logger.Error().Err(err).Str("query", r.URL.RawQuery).Str("method", "Search").Msg("invalid query")
		helpers.RenderErrorJSON(w, err)
		return
	}
	dataJSON, err := h.pkgManager.SearchJSON(r.Context(), input)
	if err != nil {
		h.logger.Error().Err(err).Str("query", r.URL.RawQuery).Str("method", "Search").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	helpers.RenderJSON(w, dataJSON, helpers.DefaultAPICacheMaxAge, http.StatusOK)
}

// SearchMonocular is an http handler used to search for packages in the hub
// database that is compatible with the Monocular search API.
func (h *Handlers) SearchMonocular(w http.ResponseWriter, r *http.Request) {
	baseURL := h.cfg.GetString("server.baseURL")
	tsQueryWeb := r.FormValue("q")
	dataJSON, err := h.pkgManager.SearchMonocularJSON(r.Context(), baseURL, tsQueryWeb)
	if err != nil {
		h.logger.Error().Err(err).Str("query", r.URL.RawQuery).Str("method", "SearchMonocular").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	helpers.RenderJSON(w, dataJSON, helpers.DefaultAPICacheMaxAge, http.StatusOK)
}

// ToggleStar is an http handler used to toggle the star on a given package.
func (h *Handlers) ToggleStar(w http.ResponseWriter, r *http.Request) {
	packageID := chi.URLParam(r, "packageID")
	err := h.pkgManager.ToggleStar(r.Context(), packageID)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "ToggleStar").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// buildSearchInput builds a packages search query from a map of query string
// values, validating them as they are extracted.
func buildSearchInput(qs url.Values) (*hub.SearchPackageInput, error) {
	// Limit
	var limit int
	if qs.Get("limit") != "" {
		var err error
		limit, err = strconv.Atoi(qs.Get("limit"))
		if err != nil {
			return nil, fmt.Errorf("invalid limit: %s", qs.Get("limit"))
		}
	}

	// Offset
	var offset int
	if qs.Get("offset") != "" {
		var err error
		offset, err = strconv.Atoi(qs.Get("offset"))
		if err != nil {
			return nil, fmt.Errorf("invalid offset: %s", qs.Get("offset"))
		}
	}

	// Facets
	var facets bool
	if qs.Get("facets") != "" {
		var err error
		facets, err = strconv.ParseBool(qs.Get("facets"))
		if err != nil {
			return nil, fmt.Errorf("invalid facets: %s", qs.Get("facets"))
		}
	}

	// Kinds
	kinds := make([]hub.RepositoryKind, 0, len(qs["kind"]))
	for _, kindStr := range qs["kind"] {
		kind, err := strconv.Atoi(kindStr)
		if err != nil {
			return nil, fmt.Errorf("invalid kind: %s", kindStr)
		}
		kinds = append(kinds, hub.RepositoryKind(kind))
	}

	// Only display content from verified publishers
	var verifiedPublisher bool
	if qs.Get("verified_publisher") != "" {
		var err error
		verifiedPublisher, err = strconv.ParseBool(qs.Get("verified_publisher"))
		if err != nil {
			return nil, fmt.Errorf("invalid verified publisher: %s", qs.Get("verified_publisher"))
		}
	}

	// Only display content from official repositories
	var official bool
	if qs.Get("official") != "" {
		var err error
		official, err = strconv.ParseBool(qs.Get("official"))
		if err != nil {
			return nil, fmt.Errorf("invalid official: %s", qs.Get("official"))
		}
	}

	// Only display operators
	var operators bool
	if qs.Get("operators") != "" {
		var err error
		operators, err = strconv.ParseBool(qs.Get("operators"))
		if err != nil {
			return nil, fmt.Errorf("invalid operators: %s", qs.Get("operators"))
		}
	}

	// Include deprecated packages
	var deprecated bool
	if qs.Get("deprecated") != "" {
		var err error
		deprecated, err = strconv.ParseBool(qs.Get("deprecated"))
		if err != nil {
			return nil, fmt.Errorf("invalid deprecated: %s", qs.Get("deprecated"))
		}
	}

	return &hub.SearchPackageInput{
		Limit:             limit,
		Offset:            offset,
		Facets:            facets,
		TSQueryWeb:        qs.Get("ts_query_web"),
		TSQuery:           qs.Get("ts_query"),
		Users:             qs["user"],
		Orgs:              qs["org"],
		Repositories:      qs["repo"],
		RepositoryKinds:   kinds,
		VerifiedPublisher: verifiedPublisher,
		Official:          official,
		Operators:         operators,
		Deprecated:        deprecated,
		Licenses:          qs["license"],
		Capabilities:      qs["capabilities"],
	}, nil
}

// BuildURL builds the url of a given package.
func BuildURL(baseURL string, p *hub.Package, version string) string {
	pkgPath := fmt.Sprintf("/packages/%s/%s/%s",
		hub.GetKindName(p.Repository.Kind),
		p.Repository.Name,
		p.NormalizedName,
	)
	if version != "" {
		pkgPath += "/" + version
	}
	return baseURL + pkgPath
}
