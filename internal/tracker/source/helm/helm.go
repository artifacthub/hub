package helm

import (
	"bufio"
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"path"
	"regexp"
	"runtime/debug"
	"strconv"
	"strings"
	"sync"

	"github.com/Masterminds/semver/v3"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/license"
	"github.com/artifacthub/hub/internal/oci"
	"github.com/artifacthub/hub/internal/pkg"
	"github.com/artifacthub/hub/internal/repo"
	"github.com/artifacthub/hub/internal/tracker/source"
	"github.com/artifacthub/hub/internal/util"
	"github.com/hashicorp/go-multierror"
	"gopkg.in/yaml.v3"
	"helm.sh/helm/v3/pkg/action"
	"helm.sh/helm/v3/pkg/chart"
	"helm.sh/helm/v3/pkg/chart/loader"
	"helm.sh/helm/v3/pkg/chartutil"
	helmrepo "helm.sh/helm/v3/pkg/repo"
)

const (
	concurrency = 10

	alternativeNameAnnotation      = "artifacthub.io/alternativeName"
	categoryAnnotation             = "artifacthub.io/category"
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
	screenshotsAnnotation          = "artifacthub.io/screenshots"
	securityUpdatesAnnotation      = "artifacthub.io/containsSecurityUpdates"
	signKeyAnnotation              = "artifacthub.io/signKey"

	legacyChartContentLayerMediaType = "application/tar+gzip"
	ChartContentLayerMediaType       = "application/vnd.cncf.helm.chart.content.v1.tar+gzip"
	ChartProvenanceLayerMediaType    = "application/vnd.cncf.helm.chart.provenance.v1.prov"

	apiVersionKey   = "apiVersion"
	dependenciesKey = "dependencies"
	kubeVersionKey  = "kubeVersion"
	typeKey         = "type"

	// Provisioning file signature
	prov = "prov"
)

var (
	// containersImagesRE is a regexp used to extract containers images from
	// kubernetes manifests files.
	containersImagesRE = regexp.MustCompile(`^\s+(?:-\s+)?image:\s+(\S+)`)

	// errInvalidAnnotation indicates that the annotation provided is not valid.
	errInvalidAnnotation = errors.New("invalid annotation")

	// errRepositoryIndexMismatch indicates that the index.yaml file received
	// does not match the one we were expecting.
	errRepositoryIndexMismatch = errors.New("repository index mismatch: unexpected index.yaml file received (stale copy?), we'll retry soon")

	// readmeRE is a regexp used to locate the chart's readme file.
	readmeRE = regexp.MustCompile(`(?i)^readme\.md$`)

	// validOperatorCapabilities represents the valid operator capabilities
	// values that can be provided.
	validOperatorCapabilities = []string{
		"basic install",
		"seamless upgrades",
		"full lifecycle",
		"deep insights",
		"auto pilot",
	}
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
		s.tg = oci.NewTagsGetter(i.Svc.Cfg)
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
				defer func() {
					if r := recover(); r != nil {
						s.i.Svc.Logger.Error().Bytes("stacktrace", debug.Stack()).Interface("recover", r).Send()
					}
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
		indexFile, indexDigest, err := s.il.LoadIndex(s.i.Repository)
		if err != nil {
			return nil, fmt.Errorf("error loading repository index file: %w", err)
		}
		if s.i.RepositoryDigest != "" && s.i.RepositoryDigest != indexDigest {
			return nil, errRepositoryIndexMismatch
		}

		// Read available charts versions from index file
		for name, chartVersions := range indexFile.Entries {
			for _, chartVersion := range chartVersions {
				charts[name] = append(charts[name], chartVersion)
			}
		}
	case "oci":
		// Get versions (tags) available in the repository
		versions, err := s.tg.Tags(s.i.Svc.Ctx, s.i.Repository, true, true)
		if err != nil {
			return nil, fmt.Errorf("error getting repository available versions: %w", err)
		}

		// Prepare chart versions using the list of versions available
		name := path.Base(s.i.Repository.URL)
		for _, version := range versions {
			// See https://github.com/helm/helm/blob/14d0c13e9eefff5b4a1b511cf50643529692ec94/pkg/registry/client.go#L45C8-L50
			versionReplacingPlusSign := strings.Replace(version, "+", "_", 1)
			chartURL := fmt.Sprintf("%s:%s", s.i.Repository.URL, versionReplacingPlusSign)

			charts[name] = append(charts[name], &helmrepo.ChartVersion{
				Metadata: &chart.Metadata{
					Name:    name,
					Version: version,
				},
				URLs: []string{chartURL},
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
	if len(chartVersion.URLs) == 0 {
		return nil, errors.New("chart version does not contain any url")
	}
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
		chrt, err := LoadChartArchive(
			s.i.Svc.Ctx,
			chartURL,
			&LoadChartArchiveOptions{
				Hc:       s.i.Svc.Hc,
				Op:       s.i.Svc.Op,
				Username: s.i.Repository.AuthUser,
				Password: s.i.Repository.AuthPass,
			},
		)
		if err != nil {
			return nil, fmt.Errorf("error loading chart (%s): %w", chartURL.String(), err)
		}
		md := chrt.Metadata

		// Validate chart version metadata for known issues and sanitize some strings
		if err := chrt.Validate(); err != nil {
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

		// Check if the chart version is signed
		var signatures []string
		hasProvenanceFile, err := s.chartHasProvenanceFile(chartURL)
		if err != nil {
			s.warn(md, fmt.Errorf("error checking provenance file: %w", err))
		}
		if hasProvenanceFile {
			signatures = append(signatures, prov)
		}
		if repo.SchemeIsOCI(chartURL) {
			ref := strings.TrimPrefix(chartURL.String(), hub.RepositoryOCIPrefix)
			hasCosignSignature, err := s.i.Svc.Sc.HasCosignSignature(
				s.i.Svc.Ctx,
				ref,
				s.i.Repository.AuthUser,
				s.i.Repository.AuthPass,
			)
			if err != nil {
				s.warn(md, fmt.Errorf("error checking cosign signature: %w", err))
			}
			if hasCosignSignature {
				signatures = append(signatures, oci.Cosign)
			}
		}
		if len(signatures) > 0 {
			p.Signed = true
			p.Signatures = signatures
		}

		// Enrich package with data available in chart archive
		EnrichPackageFromChart(p, chrt)

		// Enrich package with information from annotations
		if err := EnrichPackageFromAnnotations(p, chrt.Metadata.Annotations); err != nil {
			return nil, fmt.Errorf("error enriching package from annotations: %w", err)
		}
	}

	return p, nil
}

// chartHasProvenanceFile checks if a chart version has a provenance file.
func (s *TrackerSource) chartHasProvenanceFile(chartURL *url.URL) (bool, error) {
	var data []byte

	switch chartURL.Scheme {
	case "http", "https":
		req, _ := http.NewRequest("GET", chartURL.String()+".prov", nil)
		req = req.WithContext(s.i.Svc.Ctx)
		if s.i.Repository.AuthUser != "" || s.i.Repository.AuthPass != "" {
			req.SetBasicAuth(s.i.Repository.AuthUser, s.i.Repository.AuthPass)
		}
		resp, err := s.i.Svc.Hc.Do(req)
		if err != nil {
			return false, err
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			return false, nil
		}
		data, err = io.ReadAll(resp.Body)
		if err != nil {
			return false, fmt.Errorf("error reading provenance file: %w", err)
		}
	case "oci":
		var err error
		_, data, err = s.i.Svc.Op.PullLayer(
			s.i.Svc.Ctx,
			strings.TrimPrefix(chartURL.String(), hub.RepositoryOCIPrefix),
			ChartProvenanceLayerMediaType,
			s.i.Repository.AuthUser,
			s.i.Repository.AuthPass,
		)
		if err != nil {
			if errors.Is(err, oci.ErrLayerNotFound) {
				return false, nil
			}
			return false, fmt.Errorf("error pulling provenance layer: %w", err)
		}
	default:
		return false, nil
	}

	if !bytes.Contains(data, []byte("PGP SIGNATURE")) {
		return false, errors.New("invalid provenance file")
	}

	return true, nil
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

// LoadChartArchiveOptions represents some options that can be provided to load
// a chart archive from its remote location.
type LoadChartArchiveOptions struct {
	Hc       hub.HTTPClient
	Op       hub.OCIPuller
	Username string
	Password string
}

// LoadChartArchive loads a chart from a remote archive located at the url
// provided.
func LoadChartArchive(ctx context.Context, u *url.URL, o *LoadChartArchiveOptions) (*chart.Chart, error) {
	var r io.Reader

	switch u.Scheme {
	case "http", "https":
		// Get chart content
		req, _ := http.NewRequest("GET", u.String(), nil)
		req = req.WithContext(ctx)
		req.Header.Set("Accept-Encoding", "identity")
		if o.Username != "" || o.Password != "" {
			req.SetBasicAuth(o.Username, o.Password)
		}
		hc := o.Hc
		if hc == nil {
			hc = util.SetupHTTPClient(false, util.HTTPClientDefaultTimeout)
		}
		resp, err := hc.Do(req)
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()
		switch resp.StatusCode {
		case http.StatusOK:
		case http.StatusNotFound:
			return nil, hub.ErrNotFound
		default:
			return nil, fmt.Errorf("unexpected status code received: %d", resp.StatusCode)
		}
		r = resp.Body
	case "oci":
		op := o.Op
		if op == nil {
			op = oci.NewPuller(nil)
		}
		ref := strings.TrimPrefix(u.String(), hub.RepositoryOCIPrefix)
		_, data, err := op.PullLayer(ctx, ref, ChartContentLayerMediaType, o.Username, o.Password)
		if err != nil {
			if errors.Is(err, oci.ErrLayerNotFound) {
				_, data, err = op.PullLayer(ctx, ref, legacyChartContentLayerMediaType, o.Username, o.Password)
				if err != nil {
					return nil, err
				}
			} else {
				return nil, err
			}
		}
		r = bytes.NewReader(data)
	default:
		return nil, repo.ErrSchemeNotSupported
	}

	// Load chart from reader previously set up
	chrt, err := loader.LoadArchive(r)
	if err != nil {
		return nil, err
	}
	return chrt, nil
}

// EnrichPackageFromChart adds some extra information to the package from the
// chart archive.
func EnrichPackageFromChart(p *hub.Package, chrt *chart.Chart) {
	md := chrt.Metadata
	p.Description = md.Description
	p.Keywords = md.Keywords
	p.HomeURL = md.Home
	p.AppVersion = md.AppVersion
	p.Deprecated = md.Deprecated
	p.ValuesSchema = chrt.Schema
	p.Data = map[string]interface{}{}

	// API version
	p.Data[apiVersionKey] = chrt.Metadata.APIVersion

	// Containers images
	imagesRefs, err := extractContainersImages(chrt)
	if err == nil && len(imagesRefs) > 0 {
		containersImages := make([]*hub.ContainerImage, 0, len(imagesRefs))
		for _, imageRef := range imagesRefs {
			containersImages = append(containersImages, &hub.ContainerImage{Image: imageRef})
		}
		if err := pkg.ValidateContainersImages(hub.Helm, containersImages); err == nil {
			p.ContainersImages = containersImages
		}
	}

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
		p.Data[dependenciesKey] = dependencies
	}

	// Kubernetes version
	p.Data[kubeVersionKey] = chrt.Metadata.KubeVersion

	// License
	licenseFile := getFile(chrt, "LICENSE")
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
	readme := getFileRE(chrt, readmeRE)
	if readme != nil {
		p.Readme = string(readme.Data)
	}

	// Type
	p.Data[typeKey] = chrt.Metadata.Type
}

// extractContainersImages extracts the containers images references found in
// the manifest generated as a result of Helm dry-run install with the default
// values.
func extractContainersImages(chrt *chart.Chart) (images []string, err error) {
	defer func() {
		if r := recover(); r != nil {
			err = fmt.Errorf("panic running helm dry-run install: %v", r)
		}
	}()

	// Dry-run Helm install
	install := action.NewInstall(&action.Configuration{
		Log: func(string, ...interface{}) {},
	})
	install.KubeVersion = &chartutil.KubeVersion{
		Version: "1.22",
		Major:   "1",
		Minor:   "22",
	}
	install.ReleaseName = "release-name"
	install.DryRun = true
	install.DisableHooks = true
	install.Replace = true
	install.ClientOnly = true
	install.IncludeCRDs = true
	install.DependencyUpdate = false
	release, err := install.Run(chrt, chartutil.Values{})
	if err != nil {
		return nil, err
	}

	// Extract containers images from release manifest
	s := bufio.NewScanner(strings.NewReader(release.Manifest))
	for s.Scan() {
		result := containersImagesRE.FindStringSubmatch(s.Text())
		if result == nil {
			continue
		}
		image := strings.Trim(result[1], `"'`)
		if image != "" && !contains(images, image) {
			images = append(images, image)
		}
	}

	return images, nil
}

// EnrichPackageFromAnnotations adds some extra information to the package from
// the provided annotations.
func EnrichPackageFromAnnotations(p *hub.Package, annotations map[string]string) error {
	var errs *multierror.Error

	// Alternative name
	if v, ok := annotations[alternativeNameAnnotation]; ok && v != "" {
		p.AlternativeName = v
	}

	// Category
	if v, ok := annotations[categoryAnnotation]; ok {
		category, err := hub.PackageCategoryFromName(v)
		if err != nil {
			errs = multierror.Append(errs, err)
		} else {
			p.Category = category
		}
	}

	// Changes
	if v, ok := annotations[changesAnnotation]; ok {
		changes, err := source.ParseChangesAnnotation(v)
		if err != nil {
			errs = multierror.Append(errs, err)
		} else {
			p.Changes = changes
		}
	}

	// CRDs
	if v, ok := annotations[crdsAnnotation]; ok {
		var crds []interface{}
		if err := yaml.Unmarshal([]byte(v), &crds); err != nil {
			errs = multierror.Append(errs, fmt.Errorf("%w: invalid crds value", errInvalidAnnotation))
		} else {
			p.CRDs = crds
		}
	}

	// CRDs examples
	if v, ok := annotations[crdsExamplesAnnotation]; ok {
		var crdsExamples []interface{}
		if err := yaml.Unmarshal([]byte(v), &crdsExamples); err != nil {
			errs = multierror.Append(errs, fmt.Errorf("%w: invalid crdsExamples value", errInvalidAnnotation))
		} else {
			p.CRDsExamples = crdsExamples
		}
	}

	// Images
	if v, ok := annotations[imagesAnnotation]; ok {
		var images []*hub.ContainerImage
		if err := yaml.Unmarshal([]byte(v), &images); err != nil {
			errs = multierror.Append(errs, fmt.Errorf("%w: invalid images value", errInvalidAnnotation))
		} else {
			if err := pkg.ValidateContainersImages(hub.Helm, images); err != nil {
				errs = multierror.Append(errs, fmt.Errorf("%w: %w", errInvalidAnnotation, err))
			} else {
				p.ContainersImages = images
			}
		}
	}

	// License
	if v, ok := annotations[licenseAnnotation]; ok && v != "" {
		p.License = v
	}

	// Links
	if v, ok := annotations[linksAnnotation]; ok {
		var links []*hub.Link
		if err := yaml.Unmarshal([]byte(v), &links); err != nil {
			errs = multierror.Append(errs, fmt.Errorf("%w: invalid links value", errInvalidAnnotation))
		} else {
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
	}

	// Maintainers
	if v, ok := annotations[maintainersAnnotation]; ok {
		var maintainers []*hub.Maintainer
		if err := yaml.Unmarshal([]byte(v), &maintainers); err != nil {
			errs = multierror.Append(errs, fmt.Errorf("%w: invalid maintainers value", errInvalidAnnotation))
		} else {
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
	}

	// Operator flag
	if v, ok := annotations[operatorAnnotation]; ok {
		isOperator, err := strconv.ParseBool(v)
		if err != nil {
			errs = multierror.Append(errs, fmt.Errorf("%w: invalid operator value", errInvalidAnnotation))
		} else {
			p.IsOperator = isOperator
		}
	}

	// Operator capabilities
	if v, ok := annotations[operatorCapabilitiesAnnotation]; ok {
		v = strings.ToLower(v)
		if !contains(validOperatorCapabilities, v) {
			errs = multierror.Append(errs, fmt.Errorf("%w: invalid operator capabilities value", errInvalidAnnotation))
		} else {
			p.Capabilities = v
		}
	}

	// Prerelease
	if v, ok := annotations[prereleaseAnnotation]; ok {
		prerelease, err := strconv.ParseBool(v)
		if err != nil {
			errs = multierror.Append(errs, fmt.Errorf("%w: invalid prerelease value", errInvalidAnnotation))
		} else {
			p.Prerelease = prerelease
		}
	}

	// Recommendations
	if v, ok := annotations[recommendationsAnnotation]; ok {
		var recommendations []*hub.Recommendation
		if err := yaml.Unmarshal([]byte(v), &recommendations); err != nil {
			errs = multierror.Append(errs, fmt.Errorf("%w: invalid recommendations value", errInvalidAnnotation))
		} else {
			p.Recommendations = recommendations
		}
	}

	// Screenshots
	if v, ok := annotations[screenshotsAnnotation]; ok {
		var screenshots []*hub.Screenshot
		if err := yaml.Unmarshal([]byte(v), &screenshots); err != nil {
			errs = multierror.Append(errs, fmt.Errorf("%w: invalid screenshots value", errInvalidAnnotation))
		} else {
			p.Screenshots = screenshots
		}
	}

	// Security updates
	if v, ok := annotations[securityUpdatesAnnotation]; ok {
		containsSecurityUpdates, err := strconv.ParseBool(v)
		if err != nil {
			errs = multierror.Append(errs, fmt.Errorf("%w: invalid containsSecurityUpdates value", errInvalidAnnotation))
		} else {
			p.ContainsSecurityUpdates = containsSecurityUpdates
		}
	}

	// Sign key
	if v, ok := annotations[signKeyAnnotation]; ok {
		var signKey *hub.SignKey
		if err := yaml.Unmarshal([]byte(v), &signKey); err != nil {
			errs = multierror.Append(errs, fmt.Errorf("%w: invalid sign key value", errInvalidAnnotation))
		} else {
			if signKey.URL == "" {
				errs = multierror.Append(errs, fmt.Errorf("%w: sign key url not provided", errInvalidAnnotation))
			} else {
				p.SignKey = signKey
			}
		}
	}

	return errs.ErrorOrNil()
}

// getFile returns the file requested from the provided chart.
func getFile(chrt *chart.Chart, name string) *chart.File {
	for _, file := range chrt.Files {
		if file.Name == name {
			return file
		}
	}
	return nil
}

// getFileRE returns the first file from the chart that matches the regex.
func getFileRE(chrt *chart.Chart, re *regexp.Regexp) *chart.File {
	for _, file := range chrt.Files {
		if re.Match([]byte(file.Name)) {
			return file
		}
	}
	return nil
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
