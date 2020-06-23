package main

import (
	"context"
	"encoding/base64"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"regexp"
	"runtime/debug"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/Masterminds/semver/v3"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/img"
	"github.com/artifacthub/hub/internal/repo"
	"github.com/artifacthub/hub/internal/tracker"
	"github.com/ghodss/yaml"
	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing"
	"github.com/operator-framework/api/pkg/manifests"
	operatorsv1alpha1 "github.com/operator-framework/api/pkg/operators/v1alpha1"
	"github.com/operator-framework/api/pkg/validation"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

var (
	// channelVersionRE is a regexp used to extract the version from the
	// channel CurrentCSVName.
	channelVersionRE = regexp.MustCompile(`^[A-Za-z0-9_-]+\.v?(.*)$`)
)

// Tracker is in charge of tracking an OLM operators repository, registering
// and unregistering operators versions as needed.
type Tracker struct {
	ctx    context.Context
	r      *hub.Repository
	rm     hub.RepositoryManager
	pm     hub.PackageManager
	is     img.Store
	ec     tracker.ErrorsCollector
	Logger zerolog.Logger
}

// NewTracker creates a new Tracker instance.
func NewTracker(
	ctx context.Context,
	r *hub.Repository,
	rm hub.RepositoryManager,
	pm hub.PackageManager,
	is img.Store,
	ec tracker.ErrorsCollector,
) *Tracker {
	return &Tracker{
		ctx:    ctx,
		r:      r,
		rm:     rm,
		pm:     pm,
		is:     is,
		ec:     ec,
		Logger: log.With().Str("repo", r.Name).Logger(),
	}
}

// Track registers or unregisters the operators versions available in the
// repository provided as needed.
func (t *Tracker) Track(wg *sync.WaitGroup) error {
	defer wg.Done()
	defer func() {
		if rv := recover(); rv != nil {
			t.Logger.Error().Bytes("stacktrace", debug.Stack()).Interface("recover", rv).Send()
		}
	}()

	// Clone repository
	tmpDir, operatorsPath, err := t.cloneRepository()
	if err != nil {
		return err
	}
	defer os.RemoveAll(tmpDir)

	// Load packages already registered from this repository
	packagesRegistered, err := t.rm.GetPackagesDigest(t.ctx, t.r.RepositoryID)
	if err != nil {
		return fmt.Errorf("error getting registered packages: %w", err)
	}

	// Register operators versions available when needed
	packagesAvailable := make(map[string]struct{})
	operatorsFullPath := filepath.Join(tmpDir, operatorsPath)
	operators, err := ioutil.ReadDir(operatorsFullPath)
	if err != nil {
		return fmt.Errorf("error reading operators: %w", err)
	}
	for _, entryO := range operators {
		if !entryO.IsDir() {
			continue
		}
		operatorPath := filepath.Join(operatorsFullPath, entryO.Name())

		// Get operator package manifest
		manifest, err := t.getOperatorManifest(operatorPath)
		if err != nil {
			t.Warn(fmt.Errorf("error getting operator manifest from %s: %w", operatorPath, err))
			continue
		}
		operator := manifest.PackageName

		// Get versions available for the operator
		versionsUnfiltered, err := ioutil.ReadDir(operatorPath)
		if err != nil {
			t.Warn(fmt.Errorf("error reading operator %s versions: %w", operator, err))
			continue
		}
		var versions []os.FileInfo
		for _, entryV := range versionsUnfiltered {
			if !entryV.IsDir() {
				continue
			}
			if _, err := semver.StrictNewVersion(entryV.Name()); err != nil {
				errW := fmt.Errorf("invalid operator %s version (%s): %w", operator, entryV.Name(), err)
				t.ec.Append(t.r.RepositoryID, errW)
				continue
			} else {
				versions = append(versions, entryV)
			}
		}
		sort.Slice(versions, func(i, j int) bool {
			vi, _ := semver.NewVersion(versions[i].Name())
			vj, _ := semver.NewVersion(versions[j].Name())
			return vj.LessThan(vi)
		})

		// Process operator versions found
		for i, entryV := range versions {
			select {
			case <-t.ctx.Done():
				return nil
			default:
			}
			version := entryV.Name()

			// Get operator version CSV
			operatorVersionPath := filepath.Join(operatorPath, version)
			csv, err := t.getCSV(operatorVersionPath)
			if err != nil {
				t.Warn(fmt.Errorf("error getting operator %s version %s csv: %w", operator, version, err))
				continue
			}

			// Check if this operator version is already registered
			key := fmt.Sprintf("%s@%s", operator, getOperatorVersion(csv))
			packagesAvailable[key] = struct{}{}
			if _, ok := packagesRegistered[key]; ok {
				continue
			}

			// Register operator version
			t.Logger.Debug().Str("name", operator).Str("v", version).Msg("registering operator version")
			var storeLogo bool
			if i == 0 {
				storeLogo = true
			}
			err = t.registerOperatorVersion(operator, manifest, csv, storeLogo)
			if err != nil {
				t.Warn(fmt.Errorf("error registering package %s version %s: %w", operator, version, err))
			}
		}
	}

	// Unregister operator versions not available anymore
	for key := range packagesRegistered {
		select {
		case <-t.ctx.Done():
			return nil
		default:
		}
		if _, ok := packagesAvailable[key]; !ok {
			p := strings.Split(key, "@")
			name := p[0]
			version := p[1]
			t.Logger.Debug().Str("name", name).Str("v", version).Msg("unregistering operator version")
			if err := t.unregisterOperatorVersion(name, version); err != nil {
				t.Warn(fmt.Errorf("error unregistering package %s version %s: %w", name, version, err))
			}
		}
	}

	return nil
}

// Warn is a helper that sends the error provided to the errors collector and
// logs it as a warning.
func (t *Tracker) Warn(err error) {
	t.ec.Append(t.r.RepositoryID, err)
	log.Warn().Err(err).Send()
}

// cloneRepository clones the operators repository provided in a temporary dir,
// returning the temporary directory path and the path where the operators are
// located. It's the caller's responsibility to delete them temporary dir when
// done.
func (t *Tracker) cloneRepository() (string, string, error) {
	t.Logger.Debug().Msg("cloning repository")

	// Parse repository url
	var repoBaseURL, operatorsPath string
	matches := repo.OLMRepoURLRE.FindStringSubmatch(t.r.URL)
	if len(matches) < 2 {
		return "", "", fmt.Errorf("invalid repository url")
	}
	if len(matches) >= 2 {
		repoBaseURL = matches[1]
	}
	if len(matches) == 4 {
		operatorsPath = matches[3]
	}

	// Clone git repository
	tmpDir, err := ioutil.TempDir("", "olm-tracker")
	if err != nil {
		return "", "", fmt.Errorf("error creating temp dir: %w", err)
	}
	_, err = git.PlainCloneContext(t.ctx, tmpDir, false, &git.CloneOptions{
		URL:           repoBaseURL,
		ReferenceName: plumbing.NewBranchReferenceName("master"),
		SingleBranch:  true,
		Depth:         1,
	})
	if err != nil {
		return "", "", fmt.Errorf("error cloning repository: %w", err)
	}

	return tmpDir, operatorsPath, nil
}

// getOperatorManifest reads and parses the operator package manifest.
func (t *Tracker) getOperatorManifest(path string) (*manifests.PackageManifest, error) {
	// Locate operator package manifest file
	matches, err := filepath.Glob(filepath.Join(path, "*.package.yaml"))
	if err != nil {
		return nil, fmt.Errorf("error locating package manifest file: %w", err)
	}
	if len(matches) != 1 {
		return nil, fmt.Errorf("package manigest file not found in %s", path)
	}
	manifestPath := matches[0]

	// Read and parse operator package manifest file
	manifestData, err := ioutil.ReadFile(manifestPath)
	if err != nil {
		return nil, fmt.Errorf("error reading package manifest file: %w", err)
	}
	manifest := &manifests.PackageManifest{}
	if err = yaml.Unmarshal(manifestData, &manifest); err != nil {
		return nil, fmt.Errorf("error unmarshaling package manifest file: %w", err)
	}

	return manifest, nil
}

// getCSV reads, parses and validates the cluster service version file of the
// given operator version.
func (t *Tracker) getCSV(path string) (*operatorsv1alpha1.ClusterServiceVersion, error) {
	// Locate cluster service version file
	matches, err := filepath.Glob(filepath.Join(path, "*.clusterserviceversion.yaml"))
	if err != nil {
		return nil, fmt.Errorf("error locating csv file: %w", err)
	}
	if len(matches) != 1 {
		return nil, fmt.Errorf("csv file not found in %s", path)
	}
	csvPath := matches[0]

	// Read and parse cluster service version file
	csvData, err := ioutil.ReadFile(csvPath)
	if err != nil {
		return nil, fmt.Errorf("error reading csv file: %w", err)
	}
	csv := &operatorsv1alpha1.ClusterServiceVersion{}
	if err = yaml.Unmarshal(csvData, &csv); err != nil {
		return nil, fmt.Errorf("error unmarshaling csv file: %w", err)
	}

	// Validate cluster service version
	results := validation.ClusterServiceVersionValidator.Validate(csv)
	for _, result := range results {
		for _, err := range result.Errors {
			errW := fmt.Errorf("error validating csv (%s): %w", filepath.Base(csvPath), err)
			t.ec.Append(t.r.RepositoryID, errW)
		}
	}

	return csv, nil
}

// registerOperatorVersion registers the operator version provided.
func (t *Tracker) registerOperatorVersion(
	operatorName string,
	manifest *manifests.PackageManifest,
	csv *operatorsv1alpha1.ClusterServiceVersion,
	storeLogo bool,
) error {
	// Store logo when available if requested
	var logoImageID string
	if storeLogo && len(csv.Spec.Icon) > 0 && csv.Spec.Icon[0].Data != "" {
		data, err := base64.StdEncoding.DecodeString(csv.Spec.Icon[0].Data)
		if err != nil {
			errW := fmt.Errorf("error decoding operator %s logo image: %w", operatorName, err)
			t.ec.Append(t.r.RepositoryID, errW)
		} else {
			logoImageID, err = t.is.SaveImage(t.ctx, data)
			if err != nil {
				errW := fmt.Errorf("error saving operator %s image: %w", operatorName, err)
				t.ec.Append(t.r.RepositoryID, errW)
			}
		}
	}

	// Prepare package from CSV content
	p := &hub.Package{
		Name:           operatorName,
		DisplayName:    csv.Spec.DisplayName,
		LogoImageID:    logoImageID,
		Description:    csv.Annotations["description"],
		Keywords:       csv.Spec.Keywords,
		Readme:         csv.Spec.Description,
		Version:        getOperatorVersion(csv),
		IsOperator:     true,
		DefaultChannel: manifest.DefaultChannelName,
		ContainerImage: csv.Annotations["containerImage"],
		Provider:       csv.Spec.Provider.Name,
		Repository:     t.r,
	}
	createdAt, err := time.Parse(time.RFC3339, csv.Annotations["createdAt"])
	if err == nil {
		p.CreatedAt = createdAt.Unix()
	}
	for _, channel := range manifest.Channels {
		matches := channelVersionRE.FindStringSubmatch(channel.CurrentCSVName)
		if len(matches) != 2 {
			t.Warn(fmt.Errorf("error getting version from %s", channel.CurrentCSVName))
			continue
		}
		version := matches[1]
		p.Channels = append(p.Channels, &hub.Channel{
			Name:    channel.Name,
			Version: version,
		})
	}
	p.Keywords = append(p.Keywords, strings.Split(csv.Annotations["categories"], ",")...)
	for _, link := range csv.Spec.Links {
		p.Links = append(p.Links, &hub.Link{
			Name: link.Name,
			URL:  link.URL,
		})
	}
	if csv.Annotations["repository"] != "" {
		p.Links = append(p.Links, &hub.Link{
			Name: "source",
			URL:  csv.Annotations["repository"],
		})
	}
	for _, maintainer := range csv.Spec.Maintainers {
		p.Maintainers = append(p.Maintainers, &hub.Maintainer{
			Name:  maintainer.Name,
			Email: maintainer.Email,
		})
	}
	var isGlobalOperator bool
	for _, e := range csv.Spec.InstallModes {
		if e.Type == operatorsv1alpha1.InstallModeTypeAllNamespaces && e.Supported {
			isGlobalOperator = true
		}
	}
	crds := make([]map[string]string, 0, len(csv.Spec.CustomResourceDefinitions.Owned))
	for _, crd := range csv.Spec.CustomResourceDefinitions.Owned {
		crds = append(crds, map[string]string{
			"name":        crd.Name,
			"version":     crd.Version,
			"kind":        crd.Kind,
			"displayName": crd.DisplayName,
			"description": crd.Description,
		})
	}
	p.Data = map[string]interface{}{
		"capabilities":                       csv.Annotations["capabilities"],
		"isGlobalOperator":                   isGlobalOperator,
		"customResourcesDefinitions":         crds,
		"customResourcesDefinitionsExamples": csv.Annotations["alm-examples"],
	}

	// Register package
	return t.pm.Register(t.ctx, p)
}

// unregisterOperatorVersion unregisters the operator version provided.
func (t *Tracker) unregisterOperatorVersion(name, version string) error {
	p := &hub.Package{
		Name:       name,
		Version:    version,
		Repository: t.r,
	}
	return t.pm.Unregister(t.ctx, p)
}

// getOperatorVersion returns the operator version from the cluster service
// version provided.
func getOperatorVersion(csv *operatorsv1alpha1.ClusterServiceVersion) string {
	return csv.Spec.Version.String()
}
