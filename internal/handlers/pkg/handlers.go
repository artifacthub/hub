package pkg

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"text/template"
	"time"

	"github.com/Masterminds/semver/v3"
	"github.com/artifacthub/hub/internal/handlers/helpers"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/tracker/source/helm"
	"github.com/go-chi/chi/v5"
	"github.com/gorilla/feeds"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/spf13/viper"
	"golang.org/x/text/cases"
	"golang.org/x/text/language"
	"helm.sh/helm/v3/pkg/chart"
)

const (
	searchDefaultLimit = 20
)

// Handlers represents a group of http handlers in charge of handling packages
// operations.
type Handlers struct {
	pkgManager      hub.PackageManager
	repoManager     hub.RepositoryManager
	cfg             *viper.Viper
	logger          zerolog.Logger
	hc              hub.HTTPClient
	op              hub.OCIPuller
	vt              hub.ViewsTracker
	tmplChangelogMD *template.Template
}

// NewHandlers creates a new Handlers instance.
func NewHandlers(
	pkgManager hub.PackageManager,
	repoManager hub.RepositoryManager,
	cfg *viper.Viper,
	hc hub.HTTPClient,
	op hub.OCIPuller,
	vt hub.ViewsTracker,
) *Handlers {
	return &Handlers{
		pkgManager:      pkgManager,
		repoManager:     repoManager,
		cfg:             cfg,
		logger:          log.With().Str("handlers", "pkg").Logger(),
		hc:              hc,
		op:              op,
		vt:              vt,
		tmplChangelogMD: setupChangelogMDTmpl(),
	}
}

// setupChangelogMDTmpl prepares the template used to generate a package's
// changelog in markdown format.
func setupChangelogMDTmpl() *template.Template {
	funcMap := template.FuncMap{
		"Capitalize": func(s string) string {
			return cases.Title(language.English).String(s)
		},
		"GetChanges": func(versionChanges *hub.VersionChanges, kind string) []string {
			var changes []string
			for _, change := range versionChanges.Changes {
				if change.Kind == kind {
					changes = append(changes, change.Description)
				}
			}
			return changes
		},
		"GetKinds": func(versionChanges *hub.VersionChanges) []string {
			var kinds []string
			for _, change := range versionChanges.Changes {
				if !contains(kinds, change.Kind) {
					kinds = append(kinds, change.Kind)
				}
			}
			return kinds
		},
		"ToDate": func(ts int64) string {
			t := time.Unix(ts, 0)
			return t.Format("2006-01-02")
		},
	}

	return template.Must(template.New("").Funcs(funcMap).Parse(`
# Changelog

{{ range $version := . -}}
## {{ $version.Version }} - {{ $version.TS | ToDate }}
{{ range $kind := GetKinds $version }}
{{- if $kind }}
### {{ $kind | Capitalize }}
{{ end -}}
{{ range $change := GetChanges $version $kind }}
- {{ $change -}}
{{ end }}
{{ end }}
{{ end -}}
	`))
}

// AddProductionUsage is an http handler used to add the given organization to
// the list of production users for the provided package.
func (h *Handlers) AddProductionUsage(w http.ResponseWriter, r *http.Request) {
	repoName := chi.URLParam(r, "repoName")
	pkgName := chi.URLParam(r, "packageName")
	orgName := chi.URLParam(r, "orgName")
	err := h.pkgManager.AddProductionUsage(r.Context(), repoName, pkgName, orgName)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "AddProductionUsage").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	w.WriteHeader(http.StatusCreated)
}

// DeleteProductionUsage is an http handler used to add the given organization
// from the list of production users for the provided package.
func (h *Handlers) DeleteProductionUsage(w http.ResponseWriter, r *http.Request) {
	repoName := chi.URLParam(r, "repoName")
	pkgName := chi.URLParam(r, "packageName")
	orgName := chi.URLParam(r, "orgName")
	err := h.pkgManager.DeleteProductionUsage(r.Context(), repoName, pkgName, orgName)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "DeleteProductionUsage").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// GenerateChangelogMD is an http handler used to generate a changelog in
// markdown format for a given package.
func (h *Handlers) GenerateChangelogMD(w http.ResponseWriter, r *http.Request) {
	// Get package details
	input := &hub.GetPackageInput{
		PackageName:    chi.URLParam(r, "packageName"),
		RepositoryName: chi.URLParam(r, "repoName"),
	}
	p, err := h.pkgManager.Get(r.Context(), input)
	if err != nil {
		h.logger.Error().Err(err).Interface("input", input).Str("method", "GenerateChangelogMD").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}

	// Get package changelog
	changelog, err := h.pkgManager.GetChangelog(r.Context(), p.PackageID)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GenerateChangelogMD").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}

	// Return changelog in markdown format if found
	if len(*changelog) == 0 {
		helpers.RenderErrorJSON(w, fmt.Errorf("changelog %w", hub.ErrNotFound))
		return
	}
	w.Header().Set("Content-Type", "text/markdown")
	w.Header().Set("Cache-Control", helpers.BuildCacheControlHeader(helpers.DefaultAPICacheMaxAge))
	if err := h.tmplChangelogMD.Execute(w, changelog); err != nil {
		h.logger.Error().Err(err).Msg("error executing changelog markdown template")
		http.Error(w, "", http.StatusInternalServerError)
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

// GetChangelog is an http handler used to get a package's changelog.
func (h *Handlers) GetChangelog(w http.ResponseWriter, r *http.Request) {
	packageID := chi.URLParam(r, "packageID")
	changelog, err := h.pkgManager.GetChangelog(r.Context(), packageID)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetChangelog").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	dataJSON, _ := json.Marshal(changelog)
	helpers.RenderJSON(w, dataJSON, helpers.DefaultAPICacheMaxAge, http.StatusOK)
}

// GetChartTemplates is an http handler used to get the templates for a given
// Helm chart package snapshot.
func (h *Handlers) GetChartTemplates(w http.ResponseWriter, r *http.Request) {
	// Get chart's archive from original source
	chrt, err := h.getChartArchive(
		r.Context(),
		chi.URLParam(r, "packageID"),
		chi.URLParam(r, "version"),
	)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetChartTemplates").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}

	// Prepare json data with templates and values and return it
	data := map[string]interface{}{
		"templates": chrt.Templates,
		"values":    chrt.Values,
	}
	dataJSON, _ := json.Marshal(data)
	helpers.RenderJSON(w, dataJSON, 24*time.Hour, http.StatusOK)
}

// GetChartValues is an http handler used to get the default values for a given
// Helm chart package snapshot.
func (h *Handlers) GetChartValues(w http.ResponseWriter, r *http.Request) {
	// Get chart's archive from original source
	chrt, err := h.getChartArchive(
		r.Context(),
		chi.URLParam(r, "packageID"),
		chi.URLParam(r, "version"),
	)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetChartValues").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}

	// Get raw values from chart archive and return them if available
	var data []byte
	for _, file := range chrt.Raw {
		if file.Name == "values.yaml" {
			data = file.Data
		}
	}
	if data == nil {
		w.WriteHeader(http.StatusNotFound)
		return
	}
	w.Header().Set("Cache-Control", helpers.BuildCacheControlHeader(24*time.Hour))
	w.Header().Set("Content-Length", strconv.Itoa(len(data)))
	w.Header().Set("Content-Type", "application/yaml")
	_, _ = w.Write(data)
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

// GetHelmExporterDump is an http handler used to get a summary of the latest
// version available of all packages of kind Helm in the hub database so that
// they can be used by Helm exporter.
func (h *Handlers) GetHelmExporterDump(w http.ResponseWriter, r *http.Request) {
	dataJSON, err := h.pkgManager.GetHelmExporterDumpJSON(r.Context())
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetHelmExporterDump").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	helpers.RenderJSON(w, dataJSON, 1*time.Hour, http.StatusOK)
}

// GetNovaDump is an http handler used to get a summary of all packages of kind
// Helm in the hub database so that they can be used by Fairwinds Nova.
func (h *Handlers) GetNovaDump(w http.ResponseWriter, r *http.Request) {
	dataJSON, err := h.pkgManager.GetNovaDumpJSON(r.Context())
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetNovaDump").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	helpers.RenderJSON(w, dataJSON, 2*time.Hour, http.StatusOK)
}

// GetProductionUsage is an http handler used to get a summary of which of the
// organizations the user belongs to are using the package in production.
func (h *Handlers) GetProductionUsage(w http.ResponseWriter, r *http.Request) {
	repoName := chi.URLParam(r, "repoName")
	pkgName := chi.URLParam(r, "packageName")
	dataJSON, err := h.pkgManager.GetProductionUsageJSON(r.Context(), repoName, pkgName)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetProductionUsage").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	helpers.RenderJSON(w, dataJSON, 0, http.StatusOK)
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
	helpers.RenderJSON(w, dataJSON, helpers.DefaultAPICacheMaxAge, http.StatusOK)
}

// GetStarredByUser is an http handler used to get the packages starred by the
// user doing the request.
func (h *Handlers) GetStarredByUser(w http.ResponseWriter, r *http.Request) {
	p, err := helpers.GetPagination(r.URL.Query(), helpers.PaginationDefaultLimit, helpers.PaginationMaxLimit)
	if err != nil {
		err = fmt.Errorf("%w: %w", hub.ErrInvalidInput, err)
		h.logger.Error().Err(err).Str("query", r.URL.RawQuery).Str("method", "GetStarredByUser").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	result, err := h.pkgManager.GetStarredByUserJSON(r.Context(), p)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetStarredByUser").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	w.Header().Set(helpers.PaginationTotalCount, strconv.Itoa(result.TotalCount))
	helpers.RenderJSON(w, result.Data, 0, http.StatusOK)
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

// GetViews is an http handler used to get the views of the package provided.
func (h *Handlers) GetViews(w http.ResponseWriter, r *http.Request) {
	packageID := chi.URLParam(r, "packageID")
	dataJSON, err := h.pkgManager.GetViewsJSON(r.Context(), packageID)
	if err != nil {
		h.logger.Error().Err(err).Str("method", "GetViews").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	helpers.RenderJSON(w, dataJSON, 1*time.Hour, http.StatusOK)
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
	if p.Repository.Kind != hub.Container {
		sort.Slice(feed.Items, func(i, j int) bool {
			vi, _ := semver.NewVersion(feed.Items[i].Title)
			vj, _ := semver.NewVersion(feed.Items[j].Title)
			return vj.LessThan(vi)
		})
	}
	rss, err := feed.ToRss()
	if err != nil {
		h.logger.Error().Err(err).Str("method", "RssFeed").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}

	data := []byte(rss)
	w.Header().Set("Cache-Control", helpers.BuildCacheControlHeader(helpers.DefaultAPICacheMaxAge))
	w.Header().Set("Content-Length", strconv.Itoa(len(data)))
	_, _ = w.Write(data)
}

// Search is an http handler used to search for packages in the hub database.
func (h *Handlers) Search(w http.ResponseWriter, r *http.Request) {
	input, err := buildSearchInput(r.URL.Query())
	if err != nil {
		err = fmt.Errorf("%w: %w", hub.ErrInvalidInput, err)
		h.logger.Error().Err(err).Str("query", r.URL.RawQuery).Str("method", "Search").Msg("invalid query")
		helpers.RenderErrorJSON(w, err)
		return
	}
	result, err := h.pkgManager.SearchJSON(r.Context(), input)
	if err != nil {
		h.logger.Error().Err(err).Str("query", r.URL.RawQuery).Str("method", "Search").Send()
		helpers.RenderErrorJSON(w, err)
		return
	}
	w.Header().Set(helpers.PaginationTotalCount, strconv.Itoa(result.TotalCount))
	helpers.RenderJSON(w, result.Data, helpers.DefaultAPICacheMaxAge, http.StatusOK)
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

// TrackView is an http handler used to track a view of a given package version.
func (h *Handlers) TrackView(w http.ResponseWriter, r *http.Request) {
	packageID := chi.URLParam(r, "packageID")
	version := chi.URLParam(r, "version")
	if err := h.vt.TrackView(packageID, version); err != nil {
		helpers.RenderErrorJSON(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// getChartArchive is a helper function used to download a chart's archive from
// the original source.
func (h *Handlers) getChartArchive(ctx context.Context, packageID, version string) (*chart.Chart, error) {
	// Get package from database as we need the content url
	input := &hub.GetPackageInput{
		PackageID: packageID,
		Version:   version,
	}
	p, err := h.pkgManager.Get(ctx, input)
	if err != nil {
		return nil, err
	}

	// Only Helm charts packages can have templates
	if p.Repository.Kind != hub.Helm {
		return nil, fmt.Errorf("%w: operation not supported for this repository kind", hub.ErrInvalidInput)
	}

	// Download chart package from remote source
	var username, password string
	if p.Repository.Private {
		// Get credentials if the repository is private
		repo, err := h.repoManager.GetByID(ctx, p.Repository.RepositoryID, true)
		if err != nil {
			return nil, err
		}
		username = repo.AuthUser
		password = repo.AuthPass
	}
	u, _ := url.Parse(p.ContentURL)
	chrt, err := helm.LoadChartArchive(
		ctx,
		u,
		&helm.LoadChartArchiveOptions{
			Hc:       h.hc,
			Op:       h.op,
			Username: username,
			Password: password,
		},
	)
	if err != nil {
		return nil, err
	}

	return chrt, nil
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
	} else {
		limit = searchDefaultLimit
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

	// Categories
	categories := make([]hub.PackageCategory, 0, len(qs["category"]))
	for _, categoryStr := range qs["category"] {
		category, err := strconv.Atoi(categoryStr)
		if err != nil {
			return nil, fmt.Errorf("invalid category: %s", categoryStr)
		}
		categories = append(categories, hub.PackageCategory(category))
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

	// Only display official packages
	var official bool
	if qs.Get("official") != "" {
		var err error
		official, err = strconv.ParseBool(qs.Get("official"))
		if err != nil {
			return nil, fmt.Errorf("invalid official: %s", qs.Get("official"))
		}
	}

	// Only display packages published by CNCF projects
	var cncf bool
	if qs.Get("cncf") != "" {
		var err error
		cncf, err = strconv.ParseBool(qs.Get("cncf"))
		if err != nil {
			return nil, fmt.Errorf("invalid cncf: %s", qs.Get("cncf"))
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
		Categories:        categories,
		VerifiedPublisher: verifiedPublisher,
		Official:          official,
		CNCF:              cncf,
		Operators:         operators,
		Deprecated:        deprecated,
		Licenses:          qs["license"],
		Capabilities:      qs["capabilities"],
		Sort:              qs.Get("sort"),
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

// contains is a helper to check if a list contains the string provided.
func contains(l []string, e string) bool {
	for _, x := range l {
		if x == e {
			return true
		}
	}
	return false
}
