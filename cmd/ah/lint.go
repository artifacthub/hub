package main

import (
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"reflect"
	"strconv"
	"strings"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/tracker/source/helm"
	"github.com/hashicorp/go-multierror"
	"github.com/spf13/cobra"
	"helm.sh/helm/v3/pkg/chart/loader"
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
that you can verify everything looks right.

At the moment the only supported kind is helm. Support for other repositories
kinds will be added soon.`

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
	lintCmd.Flags().StringVarP(&opts.kind, "kind", "k", "helm", "repository kind")
	lintCmd.Flags().StringVarP(&opts.path, "path", "p", ".", "repository's packages path")
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
	case hub.Helm:
		report = lintHelm(opts.path)
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

// lintHelm is a linter used to check if the Helm charts available in the path
// provided are ready to be listed on Artifact Hub.
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

// output represents a wrapper around an io.Writer used to print lint reports.
type output struct {
	io.Writer
}

// printReport prints the provided lint report to the receiver output.
func (out *output) printReport(report *lintReport) {
	// Print packages checks results
	for _, e := range report.entries {
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
				fmt.Fprintf(out, "  * %s\n", err.Error())
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

	// Operator
	out.print("Operator", strconv.FormatBool(pkg.IsOperator))
	if pkg.IsOperator {
		out.print("Operator capabilities", pkg.Capabilities)
		out.print("CRDs", pkg.CRDs)
		out.print("CRDs examples", pkg.CRDsExamples)
	}

	// Values specific to a repository kind
	switch pkg.Repository.Kind {
	case hub.Helm:
		if pkg.ValuesSchema != nil {
			fmt.Fprintf(out, "%c Values schema: %s\n", success, provided)
		} else {
			fmt.Fprintf(out, "%c Values schema: %s\n", warning, notProvided)
		}
		out.print("Sign key", pkg.SignKey)
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
