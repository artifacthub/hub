package helm

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"path"
	"strconv"
	"strings"
	"sync"

	"github.com/Masterminds/semver/v3"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/license"
	"github.com/artifacthub/hub/internal/pkg"
	"github.com/artifacthub/hub/internal/repo"
	"github.com/artifacthub/hub/internal/tracker/source"
	"github.com/containerd/containerd/remotes/docker"
	"github.com/deislabs/oras/pkg/content"
	ctxo "github.com/deislabs/oras/pkg/context"
	"github.com/deislabs/oras/pkg/oras"
	"gopkg.in/yaml.v3"
	"helm.sh/helm/v3/pkg/chart"
	"helm.sh/helm/v3/pkg/chart/loader"
	helmrepo "helm.sh/helm/v3/pkg/repo"
)

const (
	concurrency = 10

	changesAnnotation              = "artifacthub.io/changes"
	crdsAnnotation                 = "artifacthub.io/crds"
	crdsExamplesAnnotation         = "artifacthub.io/crdsExamples"
	imagesAnnotation               = "artifacthub.io/images"
	licenseAnnotation              = "artifacthub.io/license"
	linksAnnotation                = "artifacthub.io/links"
	maintainersAnnotation          = "artifacthub.io/maintainers"
	operatorAnnotation             = "artifacthub.io/operator"
	operatorCapabilitiesAnnotation = "artifacthub.io/operatorCapabilities"
	prereleaseAnnotation           = "artifacthub.io/prerelease"
	recommendationsAnnotation      = "artifacthub.io/recommendations"
	securityUpdatesAnnotation      = "artifacthub.io/containsSecurityUpdates"

	helmChartConfigMediaType       = "application/vnd.cncf.helm.config.v1+json"
	helmChartContentLayerMediaType = "application/tar+gzip"
)

// TrackerSource is a hub.TrackerSource implementation for Helm repositories.
type TrackerSource struct {
	i  *hub.TrackerSourceInput
	il hub.HelmIndexLoader
	tg hub.OCITagsGetter
}

// NewTrackerSource creates a new TrackerSource instance.
func NewTrackerSource(i *hub.TrackerSourceInput, opts ...func(s *TrackerSource)) *TrackerSource {
	s := &TrackerSource{i: i}
	for _, o := range opts {
		o(s)
	}
	if s.il == nil {
		s.il = &repo.HelmIndexLoader{}
	}
	if s.tg == nil {
		s.tg = &repo.OCITagsGetter{}
	}
	return s
}

// GetPackagesAvailable implements the TrackerSource interface.
func (s *TrackerSource) GetPackagesAvailable() (map[string]*hub.Package, error) {
	var mu sync.Mutex
	packagesAvailable := make(map[string]*hub.Package)

	// Iterate over charts versions available in the repository
	charts, err := s.getCharts()
	if err != nil {
		return nil, err
	}
	limiter := make(chan struct{}, concurrency)
	var wg sync.WaitGroup
	for _, chartVersions := range charts {
		for _, chartVersion := range chartVersions {
			// Return ASAP if context is cancelled
			select {
			case <-s.i.Svc.Ctx.Done():
				wg.Wait()
				return nil, s.i.Svc.Ctx.Err()
			default:
			}

			// Prepare and store package version
			limiter <- struct{}{}
			wg.Add(1)
			go func(chartVersion *helmrepo.ChartVersion) {
				defer func() {
					<-limiter
					wg.Done()
				}()
				p, err := s.preparePackage(chartVersion)
				if err != nil {
					s.warn(chartVersion.Metadata, fmt.Errorf("error preparing package: %w", err))
					return
				}
				mu.Lock()
				packagesAvailable[pkg.BuildKey(p)] = p
				mu.Unlock()
			}(chartVersion)
		}
	}
	wg.Wait()

	return packagesAvailable, nil
}

// getCharts returns the charts available in the repository.
func (s *TrackerSource) getCharts() (map[string][]*helmrepo.ChartVersion, error) {
	charts := make(map[string][]*helmrepo.ChartVersion)

	u, _ := url.Parse(s.i.Repository.URL)
	switch u.Scheme {
	case "http", "https":
		// Load repository index file
		indexFile, _, err := s.il.LoadIndex(s.i.Repository)
		if err != nil {
			return nil, fmt.Errorf("error loading repository index file: %w", err)
		}

		// Read available charts versions from index file
		for name, chartVersions := range indexFile.Entries {
			for _, chartVersion := range chartVersions {
				charts[name] = append(charts[name], chartVersion)
			}
		}
	case "oci":
		// Get versions (tags) available in the repository
		versions, err := s.tg.Tags(s.i.Svc.Ctx, s.i.Repository)
		if err != nil {
			return nil, fmt.Errorf("error getting repository available versions: %w", err)
		}

		// Prepare chart versions using the list of versions available
		name := path.Base(s.i.Repository.URL)
		for _, version := range versions {
			charts[name] = append(charts[name], &helmrepo.ChartVersion{
				Metadata: &chart.Metadata{
					Name:    name,
					Version: version,
				},
				URLs: []string{s.i.Repository.URL + ":" + version},
			})
		}
	default:
		return nil, repo.ErrSchemeNotSupported
	}

	return charts, nil
}

// preparePackage prepares a package version using the chart version provided.
func (s *TrackerSource) preparePackage(chartVersion *helmrepo.ChartVersion) (*hub.Package, error) {
	// Parse package version
	md := chartVersion.Metadata
	sv, err := semver.NewVersion(md.Version)
	if err != nil {
		return nil, fmt.Errorf("invalid package version: %w", err)
	}
	version := sv.String()

	// Prepare chart archive url
	chartURL, err := url.Parse(chartVersion.URLs[0])
	if err != nil {
		return nil, fmt.Errorf("invalid chart url %s: %w", chartVersion.URLs[0], err)
	}
	if !chartURL.IsAbs() {
		repoURL, _ := url.Parse(s.i.Repository.URL)
		chartURL.Scheme = repoURL.Scheme
		chartURL.Host = repoURL.Host
		if !strings.HasPrefix(chartURL.Path, "/") {
			chartURL.Path = path.Join(repoURL.Path, chartURL.Path)
		}
	}

	// Prepare package version
	p := &hub.Package{
		Name:       chartVersion.Name,
		Version:    version,
		Digest:     chartVersion.Digest,
		ContentURL: chartURL.String(),
		Repository: s.i.Repository,
	}
	if !chartVersion.Created.IsZero() {
		p.TS = chartVersion.Created.Unix()
	}

	// If the package version is not registered yet or if it needs to be
	// registered again, we need to enrich the package with extra information
	// available in the chart archive, like the readme file, the license, etc.
	// Otherwise, the minimal version of the package prepared above is enough.
	bypassDigestCheck := s.i.Svc.Cfg.GetBool("tracker.bypassDigestCheck")
	digest, ok := s.i.PackagesRegistered[pkg.BuildKey(p)]
	if !ok || chartVersion.Digest != digest || bypassDigestCheck {
		// Load chart from remote archive
		chart, err := s.loadChartArchive(chartURL)
		if err != nil {
			return nil, fmt.Errorf("error loading chart (%s): %w", chartURL.String(), err)
		}

		// Validate chart version metadata for known issues and sanitize some strings
		if err := chart.Validate(); err != nil {
			return nil, fmt.Errorf("invalid metadata: %w", err)
		}

		// Store logo when available if requested
		if md.Icon != "" {
			logoImageID, err := s.i.Svc.Is.DownloadAndSaveImage(s.i.Svc.Ctx, md.Icon)
			if err == nil {
				p.LogoURL = md.Icon
				p.LogoImageID = logoImageID
			} else {
				s.warn(md, fmt.Errorf("error getting logo image %s: %w", md.Icon, err))
			}
		}

		// Check if the chart version is signed (has provenance file)
		if repo.SchemeIsHTTP(chartURL) {
			hasProvenanceFile, err := s.chartHasProvenanceFile(chartURL.String())
			if err != nil {
				return nil, fmt.Errorf("error checking provenance file: %w", err)
			}
			p.Signed = hasProvenanceFile
		}

		// Enrich package from data available in chart archive
		if err := enrichPackageFromArchive(p, chart); err != nil {
			return nil, fmt.Errorf("error enriching package from archive: %w", err)
		}
	}

	return p, nil
}

// loadChartArchive loads a chart from a remote archive located at the url
// provided.
func (s *TrackerSource) loadChartArchive(u *url.URL) (*chart.Chart, error) {
	var r io.Reader

	switch u.Scheme {
	case "http", "https":
		// Get chart content
		req, _ := http.NewRequest("GET", u.String(), nil)
		if u.Host == "github.com" || u.Host == "raw.githubusercontent.com" {
			// Authenticate and rate limit requests to Github
			githubToken := s.i.Svc.Cfg.GetString("creds.githubToken")
			if githubToken != "" {
				req.Header.Set("Authorization", fmt.Sprintf("token %s", githubToken))
			}
			if s.i.Svc.GithubRL != nil {
				_ = s.i.Svc.GithubRL.Wait(s.i.Svc.Ctx)
			}
		}
		if s.i.Repository.AuthUser != "" || s.i.Repository.AuthPass != "" {
			req.SetBasicAuth(s.i.Repository.AuthUser, s.i.Repository.AuthPass)
		}
		resp, err := s.i.Svc.Hc.Do(req)
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("unexpected status code received: %d", resp.StatusCode)
		}
		r = resp.Body
	case "oci":
		// Pull reference layers from OCI registry
		ref := strings.TrimPrefix(u.String(), hub.RepositoryOCIPrefix)
		resolverOptions := docker.ResolverOptions{}
		if s.i.Repository.AuthUser != "" || s.i.Repository.AuthPass != "" {
			resolverOptions.Authorizer = docker.NewDockerAuthorizer(
				docker.WithAuthCreds(func(string) (string, string, error) {
					return s.i.Repository.AuthUser, s.i.Repository.AuthPass, nil
				}),
			)
		}
		store := content.NewMemoryStore()
		_, layers, err := oras.Pull(
			ctxo.WithLoggerDiscarded(s.i.Svc.Ctx),
			docker.NewResolver(resolverOptions),
			ref,
			store,
			oras.WithPullEmptyNameAllowed(),
			oras.WithAllowedMediaTypes([]string{helmChartConfigMediaType, helmChartContentLayerMediaType}),
		)
		if err != nil {
			return nil, err
		}

		// Create reader for Helm chart content layer, if available
		for _, layer := range layers {
			if layer.MediaType == helmChartContentLayerMediaType {
				_, b, ok := store.Get(layer)
				if ok {
					r = bytes.NewReader(b)
					break
				}
			}
		}
		if r == nil {
			return nil, errors.New("content layer not found")
		}
	default:
		return nil, repo.ErrSchemeNotSupported
	}

	// Load chart from reader previously set up
	chart, err := loader.LoadArchive(r)
	if err != nil {
		return nil, err
	}
	return chart, nil
}

// chartHasProvenanceFile checks if a chart version has a provenance file
// checking if a .prov file exists for the chart version url provided.
func (s *TrackerSource) chartHasProvenanceFile(u string) (bool, error) {
	req, _ := http.NewRequest("GET", u+".prov", nil)
	if s.i.Repository.AuthUser != "" || s.i.Repository.AuthPass != "" {
		req.SetBasicAuth(s.i.Repository.AuthUser, s.i.Repository.AuthPass)
	}
	resp, err := s.i.Svc.Hc.Do(req)
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusOK {
		return true, nil
	}
	return false, nil
}

// warn is a helper that sends the error provided to the errors collector and
// logs it as a warning.
func (s *TrackerSource) warn(md *chart.Metadata, err error) {
	err = fmt.Errorf("%w (package: %s version: %s)", err, md.Name, md.Version)
	s.i.Svc.Logger.Warn().Err(err).Send()
	if !md.Deprecated {
		s.i.Svc.Ec.Append(s.i.Repository.RepositoryID, err.Error())
	}
}

// enrichPackageFromArchive adds some extra information to the package from the
// chart archive.
func enrichPackageFromArchive(p *hub.Package, chart *chart.Chart) error {
	md := chart.Metadata
	p.Description = md.Description
	p.Keywords = md.Keywords
	p.HomeURL = md.Home
	p.AppVersion = md.AppVersion
	p.Deprecated = md.Deprecated
	p.ValuesSchema = chart.Schema
	p.Data = map[string]interface{}{}

	// API version
	p.Data["apiVersion"] = chart.Metadata.APIVersion

	// Dependencies
	dependencies := make([]map[string]string, 0, len(md.Dependencies))
	for _, dependency := range md.Dependencies {
		dependencies = append(dependencies, map[string]string{
			"name":       dependency.Name,
			"version":    dependency.Version,
			"repository": dependency.Repository,
		})
	}
	if len(dependencies) > 0 {
		p.Data["dependencies"] = dependencies
	}

	// Kubernetes version
	p.Data["kubeVersion"] = chart.Metadata.KubeVersion

	// License
	licenseFile := getFile(chart, "LICENSE")
	if licenseFile != nil {
		p.License = license.Detect(licenseFile.Data)
	}

	// Links
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

	// Maintainers
	var maintainers []*hub.Maintainer
	for _, entry := range md.Maintainers {
		if entry.Email != "" {
			maintainers = append(maintainers, &hub.Maintainer{
				Name:  entry.Name,
				Email: entry.Email,
			})
		}
	}
	if len(maintainers) > 0 {
		p.Maintainers = maintainers
	}

	// Operator
	if strings.Contains(strings.ToLower(md.Name), "operator") {
		p.IsOperator = true
	}

	// Readme
	readme := getFile(chart, "README.md")
	if readme != nil {
		p.Readme = string(readme.Data)
	}

	// Type
	p.Data["type"] = chart.Metadata.Type

	// Enrich package with information from annotations
	if err := enrichPackageFromAnnotations(p, md.Annotations); err != nil {
		return fmt.Errorf("error enriching package from annotations: %w", err)
	}

	return nil
}

// enrichPackageFromAnnotations adds some extra information to the package from
// the provided annotations.
func enrichPackageFromAnnotations(p *hub.Package, annotations map[string]string) error {
	// Changes
	if v, ok := annotations[changesAnnotation]; ok {
		changes, err := source.ParseChangesAnnotation(v)
		if err != nil {
			return err
		}
		p.Changes = changes
	}

	// CRDs
	if v, ok := annotations[crdsAnnotation]; ok {
		var crds []interface{}
		if err := yaml.Unmarshal([]byte(v), &crds); err != nil {
			return fmt.Errorf("invalid crds value: %s", v)
		}
		p.CRDs = crds
	}

	// CRDs examples
	if v, ok := annotations[crdsExamplesAnnotation]; ok {
		var crdsExamples []interface{}
		if err := yaml.Unmarshal([]byte(v), &crdsExamples); err != nil {
			return fmt.Errorf("invalid crdsExamples value: %s", v)
		}
		p.CRDsExamples = crdsExamples
	}

	// Images
	if v, ok := annotations[imagesAnnotation]; ok {
		var images []*hub.ContainerImage
		if err := yaml.Unmarshal([]byte(v), &images); err != nil {
			return fmt.Errorf("invalid images value: %s", v)
		}
		p.ContainersImages = images
	}

	// License
	if v, ok := annotations[licenseAnnotation]; ok && v != "" {
		p.License = v
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
			return fmt.Errorf("invalid operator value: %s", v)
		}
		p.IsOperator = isOperator
	}

	// Operator capabilities
	p.Capabilities = annotations[operatorCapabilitiesAnnotation]

	// Prerelease
	if v, ok := annotations[prereleaseAnnotation]; ok {
		prerelease, err := strconv.ParseBool(v)
		if err != nil {
			return fmt.Errorf("invalid prerelease value: %s", v)
		}
		p.Prerelease = prerelease
	}

	// Recommendations
	if v, ok := annotations[recommendationsAnnotation]; ok {
		var recommendations []*hub.Recommendation
		if err := yaml.Unmarshal([]byte(v), &recommendations); err != nil {
			return fmt.Errorf("invalid recommendations value: %s", v)
		}
		p.Recommendations = recommendations
	}

	// Security updates
	if v, ok := annotations[securityUpdatesAnnotation]; ok {
		containsSecurityUpdates, err := strconv.ParseBool(v)
		if err != nil {
			return fmt.Errorf("invalid containsSecurityUpdates value: %s", v)
		}
		p.ContainsSecurityUpdates = containsSecurityUpdates
	}

	return nil
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
