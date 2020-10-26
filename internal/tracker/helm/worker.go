package helm

import (
	"errors"
	"fmt"
	"image"
	"io/ioutil"
	"net/http"
	"net/url"
	"path"
	"runtime/debug"
	"strconv"
	"strings"
	"sync"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/license"
	"github.com/artifacthub/hub/internal/tracker"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/vincent-petithory/dataurl"
	"golang.org/x/time/rate"
	"gopkg.in/yaml.v3"
	"helm.sh/helm/v3/pkg/chart"
	"helm.sh/helm/v3/pkg/chart/loader"
)

const (
	crdsAnnotation                 = "artifacthub.io/crds"
	crdsExamplesAnnotation         = "artifacthub.io/crdsExamples"
	imagesAnnotation               = "artifacthub.io/images"
	maintainersAnnotation          = "artifacthub.io/maintainers"
	linksAnnotation                = "artifacthub.io/links"
	operatorAnnotation             = "artifacthub.io/operator"
	operatorCapabilitiesAnnotation = "artifacthub.io/operatorCapabilities"
	whatsnewAnnotation             = "artifacthub.io/whatsnew"
)

// githubRL represents a rate limiter used when loading charts from Github, to
// avoid some rate limiting issues were are experiencing.
var githubRL = rate.NewLimiter(2, 1)

// Worker is in charge of handling Helm packages register and unregister jobs
// generated by the tracker.
type Worker struct {
	svc    *tracker.Services
	r      *hub.Repository
	logger zerolog.Logger
}

// NewWorker creates a new worker instance.
func NewWorker(
	svc *tracker.Services,
	r *hub.Repository,
) *Worker {
	return &Worker{
		svc:    svc,
		r:      r,
		logger: log.With().Str("repo", r.Name).Str("kind", hub.GetKindName(r.Kind)).Logger(),
	}
}

// Run instructs the worker to start handling jobs. It will keep running until
// the jobs queue is empty or the context is done.
func (w *Worker) Run(wg *sync.WaitGroup, queue chan *Job) {
	defer wg.Done()
	for {
		select {
		case j, ok := <-queue:
			if !ok {
				return
			}
			switch j.Kind {
			case Register:
				w.handleRegisterJob(j)
			case Unregister:
				w.handleUnregisterJob(j)
			}
		case <-w.svc.Ctx.Done():
			return
		}
	}
}

// handleRegisterJob handles the provided Helm package registration job. This
// involves downloading the chart archive, extracting its contents and register
// the corresponding package.
func (w *Worker) handleRegisterJob(j *Job) {
	md := j.ChartVersion.Metadata

	defer func() {
		if r := recover(); r != nil {
			w.logger.Error().
				Str("package", md.Name).
				Str("version", md.Version).
				Bytes("stacktrace", debug.Stack()).
				Interface("recover", r).
				Msg("handleRegisterJob panic")
		}
	}()

	// Prepare chart archive url
	u, err := url.Parse(j.ChartVersion.URLs[0])
	if err != nil {
		w.warn(md, fmt.Errorf("invalid chart url %s: %w", w.r.URL, err))
		return
	}
	if !u.IsAbs() {
		repoURL, _ := url.Parse(w.r.URL)
		u.Scheme = repoURL.Scheme
		u.Host = repoURL.Host
		if !strings.HasPrefix(u.Path, "/") {
			u.Path = path.Join(repoURL.Path, u.Path)
		}
	}
	chartURL := u.String()

	// Load chart from remote archive
	chart, err := w.loadChart(chartURL)
	if err != nil {
		w.warn(md, fmt.Errorf("error loading chart (%s): %w", chartURL, err))
		return
	}
	md = chart.Metadata

	// Store logo when available if requested
	var logoURL, logoImageID string
	if j.StoreLogo && md.Icon != "" {
		logoURL = md.Icon
		data, err := w.getImage(md.Icon)
		if err != nil {
			w.warn(md, fmt.Errorf("error getting image %s: %w", md.Icon, err))
		} else {
			logoImageID, err = w.svc.Is.SaveImage(w.svc.Ctx, data)
			if err != nil && !errors.Is(err, image.ErrFormat) {
				w.warn(md, fmt.Errorf("error saving image %s: %w", md.Icon, err))
			}
		}
	}

	// Prepare package to be registered
	p := &hub.Package{
		Name:         md.Name,
		LogoURL:      logoURL,
		LogoImageID:  logoImageID,
		Description:  md.Description,
		Keywords:     md.Keywords,
		HomeURL:      md.Home,
		Version:      md.Version,
		AppVersion:   md.AppVersion,
		Digest:       j.ChartVersion.Digest,
		Deprecated:   md.Deprecated,
		ContentURL:   chartURL,
		ValuesSchema: chart.Schema,
		CreatedAt:    j.ChartVersion.Created.Unix(),
		Repository:   w.r,
	}
	readme := getFile(chart, "README.md")
	if readme != nil {
		p.Readme = string(readme.Data)
	}
	licenseFile := getFile(chart, "LICENSE")
	if licenseFile != nil {
		p.License = license.Detect(licenseFile.Data)
	}
	hasProvenanceFile, err := w.chartVersionHasProvenanceFile(chartURL)
	if err == nil {
		p.Signed = hasProvenanceFile
	} else {
		w.warn(md, fmt.Errorf("error checking provenance file: %w", err))
	}
	var maintainers []*hub.Maintainer
	for _, entry := range md.Maintainers {
		if entry.Email != "" {
			maintainers = append(maintainers, &hub.Maintainer{
				Name:  entry.Name,
				Email: entry.Email,
			})
		}
	}
	links := make([]*hub.Link, 0, len(md.Sources))
	for _, sourceURL := range md.Sources {
		links = append(links, &hub.Link{
			Name: "source",
			URL:  sourceURL,
		})
	}
	if len(links) > 0 {
		p.Links = links
	}
	if len(maintainers) > 0 {
		p.Maintainers = maintainers
	}
	if strings.Contains(strings.ToLower(md.Name), "operator") {
		p.IsOperator = true
	}
	dependencies := make([]map[string]string, 0, len(md.Dependencies))
	for _, dependency := range md.Dependencies {
		dependencies = append(dependencies, map[string]string{
			"name":       dependency.Name,
			"version":    dependency.Version,
			"repository": dependency.Repository,
		})
	}
	if len(dependencies) > 0 {
		p.Data = map[string]interface{}{
			"dependencies": dependencies,
		}
	}

	// Enrich package with information from annotations
	if err := enrichPackageFromAnnotations(p, md.Annotations); err != nil {
		w.warn(md, fmt.Errorf("error enriching package: %w", err))
	}

	// Register package
	w.logger.Debug().Str("name", md.Name).Str("v", md.Version).Msg("registering package")
	if err := w.svc.Pm.Register(w.svc.Ctx, p); err != nil {
		w.warn(md, fmt.Errorf("error registering package: %w", err))
	}
}

// handleUnregisterJob handles the provided Helm package unregistration job.
// This involves deleting the package version corresponding to a given chart
// version.
func (w *Worker) handleUnregisterJob(j *Job) {
	md := j.ChartVersion.Metadata

	// Unregister package
	p := &hub.Package{
		Name:       md.Name,
		Version:    md.Version,
		Repository: w.r,
	}
	w.logger.Debug().Str("name", p.Name).Str("v", p.Version).Msg("unregistering package")
	if err := w.svc.Pm.Unregister(w.svc.Ctx, p); err != nil {
		w.warn(md, fmt.Errorf("error unregistering package: %w", err))
	}
}

// loadChart loads a chart from a remote archive located at the url provided.
func (w *Worker) loadChart(u string) (*chart.Chart, error) {
	// Rate limit requests to Github to avoid them being rejected
	if strings.HasPrefix(u, "https://github.com") {
		_ = githubRL.Wait(w.svc.Ctx)
	}

	resp, err := w.svc.Hg.Get(u)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusOK {
		chart, err := loader.LoadArchive(resp.Body)
		if err != nil {
			return nil, err
		}
		return chart, nil
	}
	return nil, fmt.Errorf("unexpected status code received: %d", resp.StatusCode)
}

// chartVersionHasProvenanceFile checks if a chart version has a provenance
// file checking if a .prov file exists for the chart version url provided.
func (w *Worker) chartVersionHasProvenanceFile(u string) (bool, error) {
	resp, err := w.svc.Hg.Get(u + ".prov")
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusOK {
		return true, nil
	}
	return false, nil
}

// getImage gets the image located at the url provided. If it's a data url the
// image is extracted from it. Otherwise it's downloaded using the url.
func (w *Worker) getImage(u string) ([]byte, error) {
	// Image in data url
	if strings.HasPrefix(u, "data:") {
		dataURL, err := dataurl.DecodeString(u)
		if err != nil {
			return nil, err
		}
		return dataURL.Data, nil
	}

	// Download image using url provided
	resp, err := w.svc.Hg.Get(u)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusOK {
		return ioutil.ReadAll(resp.Body)
	}
	return nil, fmt.Errorf("unexpected status code received: %d", resp.StatusCode)
}

// warn is a helper that sends the error provided to the errors collector and
// logs it as a warning.
func (w *Worker) warn(md *chart.Metadata, err error) {
	err = fmt.Errorf("%s (package: %s version: %s)", err.Error(), md.Name, md.Version)
	w.logger.Warn().Err(err).Send()
	if !md.Deprecated {
		w.svc.Ec.Append(w.r.RepositoryID, err)
	}
}

// getFile returns the file requested from the provided chart.
func getFile(chart *chart.Chart, name string) *chart.File {
	for _, file := range chart.Files {
		if file.Name == name {
			return file
		}
	}
	return nil
}

// enrichPackageFromAnnotations adds some extra information to the package from
// the provided annotations.
func enrichPackageFromAnnotations(p *hub.Package, annotations map[string]string) error {
	// CRDs
	if v, ok := annotations[crdsAnnotation]; ok {
		var crds []interface{}
		if err := yaml.Unmarshal([]byte(v), &crds); err == nil {
			p.CRDs = crds
		}
	}

	// CRDs examples
	if v, ok := annotations[crdsExamplesAnnotation]; ok {
		var crdsExamples []interface{}
		if err := yaml.Unmarshal([]byte(v), &crdsExamples); err == nil {
			p.CRDsExamples = crdsExamples
		} else {
			fmt.Println(err)
		}
	}

	// Images
	if v, ok := annotations[imagesAnnotation]; ok {
		var images []*hub.ContainerImage
		if err := yaml.Unmarshal([]byte(v), &images); err == nil {
			p.ContainersImages = images
		}
	}

	// Links
	if v, ok := annotations[linksAnnotation]; ok {
		var links []*hub.Link
		if err := yaml.Unmarshal([]byte(v), &links); err != nil {
			return fmt.Errorf("invalid links value: %s", v)
		}
	LL:
		for _, link := range links {
			for _, pLink := range p.Links {
				if link.URL == pLink.URL {
					pLink.Name = link.Name
					continue LL
				}
			}
			p.Links = append(p.Links, link)
		}
	}

	// Maintainers
	if v, ok := annotations[maintainersAnnotation]; ok {
		var maintainers []*hub.Maintainer
		if err := yaml.Unmarshal([]byte(v), &maintainers); err != nil {
			return fmt.Errorf("invalid maintainers value: %s", v)
		}
	ML:
		for _, maintainer := range maintainers {
			for _, pMaintainer := range p.Maintainers {
				if maintainer.Email == pMaintainer.Email {
					pMaintainer.Name = maintainer.Name
					continue ML
				}
			}
			p.Maintainers = append(p.Maintainers, maintainer)
		}
	}

	// Operator flag
	if v, ok := annotations[operatorAnnotation]; ok {
		isOperator, err := strconv.ParseBool(v)
		if err != nil {
			return errors.New("invalid operator value")
		}
		p.IsOperator = isOperator
	}

	// Operator capabilities
	p.Capabilities = annotations[operatorCapabilitiesAnnotation]

	// What's new
	if v, ok := annotations[whatsnewAnnotation]; ok {
		var whatsnew []string
		if err := yaml.Unmarshal([]byte(v), &whatsnew); err == nil {
			p.WhatsNew = whatsnew
		}
	}

	return nil
}
