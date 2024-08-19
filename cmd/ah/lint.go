package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path"
	"path/filepath"
	"reflect"
	"sort"
	"strconv"
	"strings"

	"github.com/Masterminds/semver/v3"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/pkg"
	"github.com/artifacthub/hub/internal/tracker/source/generic"
	"github.com/artifacthub/hub/internal/tracker/source/helm"
	"github.com/artifacthub/hub/internal/tracker/source/helmplugin"
	"github.com/artifacthub/hub/internal/tracker/source/krew"
	"github.com/artifacthub/hub/internal/tracker/source/olm"
	"github.com/artifacthub/hub/internal/tracker/source/tekton"
	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing"
	"github.com/hashicorp/go-multierror"
	"github.com/spf13/cobra"
	"helm.sh/helm/v3/pkg/chart/loader"
	"helm.sh/helm/v3/pkg/plugin"
)

const (
	sepLen      = 120
	success     = '✓'
	failure     = '✗'
	warning     = '!'
	provided    = "PROVIDED"
	notProvided = "*** NOT PROVIDED ***"
)

// lintDesc represents the long description of the lint command.
var lintDesc = `Check the repository's packages are ready for Artifact Hub

Use this command to check that the packages in your repository are ready to be
listed on Artifact Hub. This command checks that the packages metadata provided
is valid and displays some information about the data that will be collected so
that you can verify everything looks right.`

var (
	// errLintFailed indicates that the lint command failed. This happens
	// when errors are found in any of the packages available in the path
	// provided.
	errLintFailed = errors.New("lint failed")

	// errNoPackagesFound indicates that no packages were found in the provided
	// path.
	errNoPackagesFound = errors.New("no packages found")
)

// lintOptions represents the options that can be passed to the lint command.
type lintOptions struct {
	// kind represents the repository kind.
	kind string

	// path represents the base path to walk looking for packages.
	path string

	// tektonVersioning represents the versioning option to use when processing
	// Tekton repositories. Options are: directory or git.
	tektonVersioning string
}

// lintReport represents the results of checking all the packages found in the
// provided path. For each package, an entry is created with some information
// about the package and the errors found on it during the check.
type lintReport struct {
	entries []*lintReportEntry
}

// lintReportEntry represents an entry of the lint report. A lint report
// entry contains a package and the errors found on it during the check.
type lintReportEntry struct {
	pkg    *hub.Package
	path   string
	result *multierror.Error
}

// newLintCmd creates a new lint command.
func newLintCmd() *cobra.Command {
	opts := &lintOptions{}
	lintCmd := &cobra.Command{
		Use:   "lint",
		Short: "Check the repository's packages are ready for Artifact Hub",
		Long:  lintDesc,
		RunE: func(cmd *cobra.Command, args []string) error {
			return lint(opts, &output{cmd.OutOrStdout()})
		},
	}
	lintCmd.Flags().StringVarP(&opts.kind, "kind", "k", "helm", "repository kind: argo-template, backstage, coredns, falco, gatekeeper, headlamp, helm, helm-plugin, inspektor-gadget, kcl, keda-scaler, keptn, knative-client-plugin, krew, kubearmor, kubewarden, kyverno, meshery, olm, opa, opencost, radius, tbaction, tekton-pipeline, tekton-stepaction, tekton-task")
	lintCmd.Flags().StringVarP(&opts.path, "path", "p", ".", "repository's packages path")
	lintCmd.Flags().StringVarP(&opts.tektonVersioning, "tekton-versioning", "", hub.TektonDirBasedVersioning, "tekton versioning option: directory, git")
	return lintCmd
}

// lint checks that the packages found in the path provided are ready to be
// listed on Artifact Hub. The resulting lint report will be printed to the
// output provided.
func lint(opts *lintOptions, out *output) error {
	// Check all packages available in the path provided. Different kinds may
	// use a specific linter. The linter will return a lint report that will be
	// printed once the check has finished.
	kind, err := hub.GetKindFromName(opts.kind)
	if err != nil {
		return err
	}
	var report *lintReport
	switch kind {
	case
		hub.ArgoTemplate,
		hub.Backstage,
		hub.CoreDNS,
		hub.Falco,
		hub.Gatekeeper,
		hub.Headlamp,
		hub.InspektorGadget,
		hub.KCL,
		hub.KedaScaler,
		hub.Keptn,
		hub.KnativeClientPlugin,
		hub.KubeArmor,
		hub.Kubewarden,
		hub.Kyverno,
		hub.Meshery,
		hub.OPA,
		hub.OpenCost,
		hub.Radius,
		hub.TBAction:
		report = lintGeneric(opts.path, kind)
	case hub.Helm:
		report = lintHelm(opts.path)
	case hub.HelmPlugin:
		report = lintHelmPlugin(opts.path)
	case hub.Krew:
		var err error
		report, err = lintKrew(opts.path)
		if err != nil {
			return err
		}
	case hub.OLM:
		report = lintOLM(opts.path)
	case hub.TektonTask, hub.TektonPipeline, hub.TektonStepAction:
		var err error
		report, err = lintTekton(opts.path, kind, opts.tektonVersioning)
		if err != nil {
			return err
		}
	default:
		return errors.New("kind not supported yet")
	}

	// Print lint report and return the corresponding error
	if len(report.entries) == 0 {
		return errNoPackagesFound
	}
	out.printReport(report)
	for _, entry := range report.entries {
		if entry.result.ErrorOrNil() != nil {
			return errLintFailed
		}
	}
	return nil
}

// lintGeneric checks if the packages available in the path provided are ready
// to be processed by the generic tracker source and listed on Artifact Hub.
func lintGeneric(basePath string, kind hub.RepositoryKind) *lintReport {
	report := &lintReport{}

	// Walk the path provided looking for available packages
	_ = filepath.Walk(basePath, func(pkgPath string, info os.FileInfo, err error) error {
		// If an error is raised while visiting a path or the path is not a
		// directory, we skip it
		if err != nil || !info.IsDir() {
			return nil
		}

		// Initialize report entry. If a package is found in the current path,
		// errors found while processing it will be added to the report.
		e := &lintReportEntry{
			path: pkgPath,
		}

		// Get package version metadata and prepare entry package
		mdFilePath := filepath.Join(pkgPath, hub.PackageMetadataFile)
		md, err := pkg.GetPackageMetadata(kind, mdFilePath)
		if err != nil {
			if errors.Is(err, os.ErrNotExist) {
				return nil
			}
			e.result = multierror.Append(e.result, err)
		} else {
			e.pkg, err = generic.PreparePackage(&hub.Repository{Kind: kind}, md, pkgPath)
			if err != nil {
				e.result = multierror.Append(e.result, err)
			}
		}

		report.entries = append(report.entries, e)
		return nil
	})

	return report
}

// lintHelm checks if the Helm charts available in the path provided are ready
// to be processed by the Helm tracker source and listed on Artifact Hub.
func lintHelm(basePath string) *lintReport {
	report := &lintReport{}

	// Walk the path provided looking for available charts
	_ = filepath.Walk(basePath, func(chartPath string, info os.FileInfo, err error) error {
		// If an error is raised while visiting a path or the path is not a
		// directory, we skip it
		if err != nil || !info.IsDir() {
			return nil
		}

		// Initialize report entry. If a package is found in the current path,
		// errors found while processing it will be added to the report.
		e := &lintReportEntry{
			path: chartPath,
		}

		// Try loading chart in the current path (may or may not be found)
		chrt, err := loader.LoadDir(chartPath)
		if err != nil {
			if chrt != nil && chrt.Metadata != nil {
				// A chart was found in the current path, but it is not valid.
				// We have enough information to keep checking other pieces of
				// data, so we track the error and continue.
				e.result = multierror.Append(e.result, err)
			} else {
				// A chart was not found in the current path
				return nil
			}
		}

		// Prepare entry package from Helm chart information
		e.pkg = &hub.Package{
			Name:       chrt.Metadata.Name,
			Version:    chrt.Metadata.Version,
			LogoURL:    chrt.Metadata.Icon,
			Repository: &hub.Repository{Kind: hub.Helm},
		}
		helm.EnrichPackageFromChart(e.pkg, chrt)
		err = helm.EnrichPackageFromAnnotations(e.pkg, chrt.Metadata.Annotations)
		e.result = multierror.Append(e.result, err)

		report.entries = append(report.entries, e)
		return nil
	})

	return report
}

// lintHelmPlugin checks if the Helm plugins available in the path provided are
// ready to be processed by the Helm plugins tracker source and listed on
// Artifact Hub.
func lintHelmPlugin(basePath string) *lintReport {
	report := &lintReport{}

	// Walk the path provided looking for available plugins
	_ = filepath.Walk(basePath, func(pkgPath string, info os.FileInfo, err error) error {
		// If an error is raised while visiting a path or the path is not a
		// directory, we skip it
		if err != nil || !info.IsDir() {
			return nil
		}

		// Initialize report entry. If a package is found in the current path,
		// errors found while processing it will be added to the report.
		e := &lintReportEntry{
			path: pkgPath,
		}

		// Get Helm plugin metadata and prepare package
		mdFilePath := filepath.Join(pkgPath, plugin.PluginFileName)
		md, err := helmplugin.GetMetadata(mdFilePath)
		if err != nil {
			if errors.Is(err, os.ErrNotExist) {
				return nil
			}
			e.result = multierror.Append(e.result, err)
		} else {
			repo := &hub.Repository{
				Kind: hub.HelmPlugin,
				URL:  "https://github.com/user/repo/path",
			}
			e.pkg, err = helmplugin.PreparePackage(repo, md, pkgPath)
			if err != nil {
				e.result = multierror.Append(e.result, err)
			}
		}

		report.entries = append(report.entries, e)
		return nil
	})

	return report
}

// lintKrew checks if the Krew plugins available in the path provided are ready
// to be processed by the Krew tracker source and listed on Artifact Hub.
func lintKrew(basePath string) (*lintReport, error) {
	report := &lintReport{}

	// Process plugins available in the path provided
	pluginsPath := filepath.Join(basePath, "plugins")
	pluginManifestFiles, err := os.ReadDir(pluginsPath)
	if err != nil {
		return nil, err
	}
	for _, file := range pluginManifestFiles {
		// Only process plugins files
		if !file.Type().IsRegular() || filepath.Ext(file.Name()) != ".yaml" {
			continue
		}

		// Initialize report entry. If a package is found in the current path,
		// errors found while processing it will be added to the report.
		pluginPath := filepath.Join(pluginsPath, file.Name())
		e := &lintReportEntry{
			path: pluginPath,
		}

		// Get Krew plugin manifest and prepare package
		manifest, manifestRaw, err := krew.GetManifest(filepath.Join(pluginsPath, file.Name()))
		if err != nil {
			e.result = multierror.Append(e.result, err)
		} else {
			e.pkg, err = krew.PreparePackage(&hub.Repository{Kind: hub.Krew}, manifest, manifestRaw)
			if err != nil {
				e.result = multierror.Append(e.result, err)
			}
		}

		report.entries = append(report.entries, e)
	}

	return report, nil
}

// lintOLM checks if the OLM operators available in the path provided are ready
// to be processed by the OLM tracker source and listed on Artifact Hub.
func lintOLM(basePath string) *lintReport {
	report := &lintReport{}

	// Walk the path provided looking for available OLM operators
	_ = filepath.Walk(basePath, func(pkgPath string, info os.FileInfo, err error) error {
		// If an error is raised while visiting a path or the path is not a
		// directory, we skip it
		if err != nil || !info.IsDir() {
			return nil
		}

		// Initialize report entry. If a package is found in the current path,
		// errors found while processing it will be added to the report.
		e := &lintReportEntry{
			path: pkgPath,
		}

		// Get metadata and prepare package
		md, err := olm.GetMetadata(pkgPath)
		switch {
		case err != nil:
			e.result = multierror.Append(e.result, err)
		case md == nil:
			// Package manifest not found, not a package path
			return nil
		default:
			repo := &hub.Repository{
				Kind: hub.OLM,
			}
			e.pkg, err = olm.PreparePackage(repo, md)
			if err != nil {
				e.result = multierror.Append(e.result, err)
			}
		}

		report.entries = append(report.entries, e)
		return nil
	})

	return report
}

// lintTekton checks if the Tekton tasks, pipelines or stepactions available in
// the catalog provided are ready to be processed by the Tekton tracker source
// and listed on Artifact Hub.
func lintTekton(basePath string, kind hub.RepositoryKind, versioning string) (*lintReport, error) {
	switch versioning {
	case hub.TektonDirBasedVersioning:
		return lintTektonDirBasedCatalog(basePath, kind)
	case hub.TektonGitBasedVersioning:
		return lintTektonGitBasedCatalog(basePath, kind)
	default:
		return nil, errors.New("invalid Tekton versioning option provided")
	}
}

// lintTektonDirBasedCatalog checks Tekton repositories that use the directory
// versioning options.
func lintTektonDirBasedCatalog(basePath string, kind hub.RepositoryKind) (*lintReport, error) {
	report := &lintReport{}
	repository := &hub.Repository{
		Kind: kind,
		URL:  "https://github.com/user/repo/path",
		Data: json.RawMessage(fmt.Sprintf(`{"versioning": "%s"}`, hub.TektonDirBasedVersioning)),
	}

	// Read catalog path to get available packages
	packages, err := os.ReadDir(basePath)
	if err != nil {
		return nil, err
	}
	for _, p := range packages {
		// If the path is not a directory, we skip it
		if !p.IsDir() {
			continue
		}

		// Read package versions
		pkgName := p.Name()
		pkgBasePath := path.Join(basePath, pkgName)
		versions, err := os.ReadDir(pkgBasePath)
		if err != nil {
			continue
		}
		for _, v := range versions {
			// If the path is not a directory or a ~valid semver version, we skip it
			if !p.IsDir() {
				continue
			}
			sv, err := semver.NewVersion(v.Name())
			if err != nil {
				continue
			}

			// Initialize report entry. If a package is found in the current path,
			// errors found while processing it will be added to the report.
			pkgPath := path.Join(pkgBasePath, v.Name())
			e := &lintReportEntry{
				path: pkgPath,
			}

			// Get package manifest
			manifest, manifestRaw, err := tekton.GetManifest(kind, pkgName, pkgPath)
			if err != nil {
				e.result = multierror.Append(e.result, err)
			} else {
				// Prepare package version
				e.pkg, err = tekton.PreparePackage(&tekton.PreparePackageInput{
					R:           repository,
					Tag:         "",
					Manifest:    manifest,
					ManifestRaw: manifestRaw,
					BasePath:    basePath,
					PkgName:     pkgName,
					PkgPath:     pkgPath,
					PkgVersion:  sv.String(),
				})
				if err != nil {
					e.result = multierror.Append(e.result, err)
				}
			}

			report.entries = append(report.entries, e)
		}
	}

	return report, nil
}

// lintTektonGitBasedCatalog checks Tekton repositories that use the git
// versioning options.
func lintTektonGitBasedCatalog(basePath string, kind hub.RepositoryKind) (*lintReport, error) {
	report := &lintReport{}
	repository := &hub.Repository{
		Kind: kind,
		URL:  "https://github.com/user/repo/path",
		Data: json.RawMessage(fmt.Sprintf(`{"versioning": "%s"}`, hub.TektonGitBasedVersioning)),
	}

	// Open git repository and fetch all tags available
	wt, tags, err := tekton.OpenGitRepository(basePath)
	if err != nil {
		return nil, err
	}

	// Read packages available in the catalog for each tag/version
	_ = tags.ForEach(func(tag *plumbing.Reference) error {
		// Skip tags that cannot be parsed as ~valid semver
		sv, err := semver.NewVersion(tag.Name().Short())
		if err != nil {
			return nil
		}

		// Checkout version tag
		if err := wt.Checkout(&git.CheckoutOptions{
			Hash: tag.Hash(),
		}); err != nil {
			return nil
		}

		// Process version packages
		packages, err := os.ReadDir(basePath)
		if err != nil {
			return nil
		}
		for _, p := range packages {
			// If the path is not a directory, we skip it
			if !p.IsDir() {
				continue
			}

			// Initialize report entry. If a package is found in the current path,
			// errors found while processing it will be added to the report.
			pkgName := p.Name()
			pkgPath := path.Join(basePath, pkgName)
			e := &lintReportEntry{
				path: pkgPath,
			}

			// Get package manifest
			manifest, manifestRaw, err := tekton.GetManifest(repository.Kind, pkgName, pkgPath)
			if err != nil {
				e.result = multierror.Append(e.result, err)
			} else {
				// Prepare package version
				e.pkg, err = tekton.PreparePackage(&tekton.PreparePackageInput{
					R:           repository,
					Tag:         tag.Name().Short(),
					Manifest:    manifest,
					ManifestRaw: manifestRaw,
					BasePath:    basePath,
					PkgName:     pkgName,
					PkgPath:     pkgPath,
					PkgVersion:  sv.String(),
				})
				if err != nil {
					e.result = multierror.Append(e.result, err)
				}
			}

			report.entries = append(report.entries, e)
		}

		return nil
	})

	return report, nil
}

// output represents a wrapper around an io.Writer used to print lint reports.
type output struct {
	io.Writer
}

// printReport prints the provided lint report to the receiver output.
func (out *output) printReport(report *lintReport) {
	// Sort report entries leaving the ones with errors at the end
	sort.Slice(report.entries, func(i, j int) bool {
		if report.entries[i].result.ErrorOrNil() != nil && report.entries[j].result.ErrorOrNil() == nil {
			return false
		}
		if report.entries[i].result.ErrorOrNil() == nil && report.entries[j].result.ErrorOrNil() != nil {
			return true
		}

		if report.entries[i].pkg != nil && report.entries[j].pkg != nil {
			if report.entries[i].pkg.Name == report.entries[j].pkg.Name {
				return report.entries[i].pkg.Version < report.entries[j].pkg.Version
			}
			return report.entries[i].pkg.Name < report.entries[j].pkg.Name
		}

		return false
	})

	// Print packages checks results
	for _, e := range report.entries {
		// Setup minimal skeleton package if not provided
		if e.pkg == nil {
			e.pkg = &hub.Package{
				Name:    "name: ?",
				Version: "version: ?",
			}
		}

		// Header
		var mark rune
		if e.result.ErrorOrNil() != nil {
			mark = failure
		} else {
			mark = success
		}
		fmt.Fprintf(out, "\n%s\n", strings.Repeat("-", sepLen))
		fmt.Fprintf(out, "%c %s %s (%s)\n", mark, e.pkg.Name, e.pkg.Version, e.path)
		fmt.Fprintf(out, "%s\n\n", strings.Repeat("-", sepLen))

		// Details
		if e.result.ErrorOrNil() == nil {
			fmt.Fprintf(out, "Package lint SUCCEEDED!\n\n")
			out.printPkgDetails(e.pkg)
		} else {
			fmt.Fprintf(out, "Package lint FAILED. %d error(s) occurred:\n\n", len(e.result.Errors))
			for _, err := range e.result.Errors {
				fmt.Fprintf(out, "  * %s\n", strings.TrimSpace(err.Error()))
			}
		}
	}

	// Print footer summary
	var pkgsWithErrors int
	for _, e := range report.entries {
		if e.result.ErrorOrNil() != nil {
			pkgsWithErrors++
		}
	}
	fmt.Fprintf(out, "\n%s\n", strings.Repeat("-", sepLen))
	fmt.Fprintf(out, "\n%d package(s) found, %d package(s) with errors\n\n", len(report.entries), pkgsWithErrors)
}

// printPkgDetails prints the details of the package provided to the receiver
// output. A mark will be added to each of the fields to indicate if the value
// was provided or not.
func (out *output) printPkgDetails(pkg *hub.Package) {
	// General
	out.print("Name", pkg.Name)
	out.print("Display name", pkg.DisplayName)
	out.print("Version", pkg.Version)
	out.print("App version", pkg.AppVersion)
	out.print("Description", pkg.Description)
	out.print("Keywords", pkg.Keywords)
	out.print("License", pkg.License)
	out.print("Logo URL", pkg.LogoURL)
	out.print("Home URL", pkg.HomeURL)
	out.print("Deprecated", strconv.FormatBool(pkg.Deprecated))
	out.print("Pre-release", strconv.FormatBool(pkg.Prerelease))
	out.print("Contains security updates", strconv.FormatBool(pkg.ContainsSecurityUpdates))
	out.print("Provider", pkg.Provider)

	// Readme
	if pkg.Readme != "" {
		fmt.Fprintf(out, "%c Readme: %s\n", success, provided)
	} else {
		fmt.Fprintf(out, "%c Readme: %s\n", warning, notProvided)
	}

	// Keywords
	if len(pkg.Keywords) > 0 {
		fmt.Fprintf(out, "%c Keywords:\n", success)
		for _, keyword := range pkg.Keywords {
			fmt.Fprintf(out, "  - %s\n", keyword)
		}
	} else {
		fmt.Fprintf(out, "%c Keywords: %s\n", warning, notProvided)
	}

	// Links
	if len(pkg.Links) > 0 {
		fmt.Fprintf(out, "%c Links:\n", success)
		for _, l := range pkg.Links {
			fmt.Fprintf(out, "  - Name: %s | URL: %s\n", l.Name, l.URL)
		}
	} else {
		fmt.Fprintf(out, "%c Links: %s\n", warning, notProvided)
	}

	// Maintainers
	if len(pkg.Maintainers) > 0 {
		fmt.Fprintf(out, "%c Maintainers:\n", success)
		for _, m := range pkg.Maintainers {
			fmt.Fprintf(out, "  - Name: %s | Email: %s\n", m.Name, m.Email)
		}
	} else {
		fmt.Fprintf(out, "%c Maintainers: %s\n", warning, notProvided)
	}

	// Containers images
	if len(pkg.ContainersImages) > 0 {
		fmt.Fprintf(out, "%c Containers images:\n", success)
		for _, i := range pkg.ContainersImages {
			fmt.Fprintf(out, "  - Name: %s | Image: %s\n", i.Name, i.Image)
		}
	} else {
		fmt.Fprintf(out, "%c Containers images: %s\n", warning, notProvided)
	}

	// Changes
	if len(pkg.Changes) > 0 {
		fmt.Fprintf(out, "%c Changes:\n", success)
		for _, c := range pkg.Changes {
			fmt.Fprintf(out, "  - Kind: %s | Description: %s\n", c.Kind, c.Description)
			if len(c.Links) > 0 {
				fmt.Fprintf(out, "    - Links:\n")
				for _, l := range c.Links {
					fmt.Fprintf(out, "      - Name: %s | URL: %s\n", l.Name, l.URL)
				}
			}
		}
	} else {
		fmt.Fprintf(out, "%c Changes: %s\n", warning, notProvided)
	}

	// Recommendations
	if len(pkg.Recommendations) > 0 {
		fmt.Fprintf(out, "%c Recommendations:\n", success)
		for _, r := range pkg.Recommendations {
			fmt.Fprintf(out, "  - %s\n", r.URL)
		}
	} else {
		fmt.Fprintf(out, "%c Recommendations: %s\n", warning, notProvided)
	}

	// Screenshots
	if len(pkg.Screenshots) > 0 {
		fmt.Fprintf(out, "%c Screenshots:\n", success)
		for _, s := range pkg.Screenshots {
			fmt.Fprintf(out, "      - Title: %s | URL: %s\n", s.Title, s.URL)
		}
	} else {
		fmt.Fprintf(out, "%c Screenshots: %s\n", warning, notProvided)
	}

	// Operator
	out.print("Operator", strconv.FormatBool(pkg.IsOperator))
	if pkg.IsOperator {
		out.print("Operator capabilities", pkg.Capabilities)
		out.print("CRDs", pkg.CRDs)
		out.print("CRDs examples", pkg.CRDsExamples)
	}

	// Values specific to a repository kind
	switch pkg.Repository.Kind {
	case
		hub.ArgoTemplate,
		hub.Backstage,
		hub.CoreDNS,
		hub.Falco,
		hub.Gatekeeper,
		hub.Headlamp,
		hub.InspektorGadget,
		hub.KCL,
		hub.KedaScaler,
		hub.Keptn,
		hub.KnativeClientPlugin,
		hub.KubeArmor,
		hub.Kubewarden,
		hub.Kyverno,
		hub.Meshery,
		hub.OPA,
		hub.OpenCost,
		hub.Radius,
		hub.TBAction:

		// Install
		if pkg.Install != "" {
			fmt.Fprintf(out, "%c Install: %s\n", success, provided)
		} else {
			fmt.Fprintf(out, "%c Install: %s\n", warning, notProvided)
		}

		switch pkg.Repository.Kind {
		case hub.Falco:
			// Rules files
			fmt.Fprintf(out, "%c Rules: %s\n", success, provided)
			for name := range pkg.Data[generic.FalcoRulesKey].(map[string]string) {
				fmt.Fprintf(out, "  - %s\n", name)
			}
		case hub.OPA:
			// Policies files
			fmt.Fprintf(out, "%c Policies: %s\n", success, provided)
			for name := range pkg.Data[generic.OPAPoliciesKey].(map[string]string) {
				fmt.Fprintf(out, "  - %s\n", name)
			}
		}
	case hub.Helm:
		out.print("Sign key", pkg.SignKey)

		// Values schema
		if pkg.ValuesSchema != nil {
			fmt.Fprintf(out, "%c Values schema: %s\n", success, provided)
		} else {
			fmt.Fprintf(out, "%c Values schema: %s\n", warning, notProvided)
		}
	case hub.Krew:
		// Platforms
		if v, ok := pkg.Data[krew.PlatformsKey]; ok {
			platforms, ok := v.([]string)
			if ok && len(platforms) > 0 {
				fmt.Fprintf(out, "%c Platforms: %s\n", success, provided)
				for _, platform := range platforms {
					fmt.Fprintf(out, "  - %s\n", platform)
				}
			} else {
				fmt.Fprintf(out, "%c Platforms: %s\n", warning, notProvided)
			}
		}
	case hub.OLM:
		out.print("Default channel", pkg.DefaultChannel)

		// Channels
		if len(pkg.Channels) > 0 {
			fmt.Fprintf(out, "%c Channels:\n", success)
			for _, channel := range pkg.Channels {
				fmt.Fprintf(out, "  - %s -> %s\n", channel.Name, channel.Version)
			}
		} else {
			fmt.Fprintf(out, "%c Channels: %s\n", warning, notProvided)
		}
	}
}

// print is a helper function used to print the label and values provided with
// a success or warning mark that indicates if the value was provided or not.
func (out *output) print(label string, value interface{}) {
	switch reflect.TypeOf(value).Kind() {
	case reflect.String:
		if value != "" {
			fmt.Fprintf(out, "%c %s: %s\n", success, label, value)
		} else {
			fmt.Fprintf(out, "%c %s: %s\n", warning, label, notProvided)
		}
	case reflect.Ptr:
		if !reflect.ValueOf(value).IsNil() {
			fmt.Fprintf(out, "%c %s: %s\n", success, label, provided)
		} else {
			fmt.Fprintf(out, "%c %s: %s\n", warning, label, notProvided)
		}
	}
}
