package generic

import (
	"errors"
	"fmt"
	"image"
	"os"
	"path"
	"path/filepath"
	"strings"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/oci"
	"github.com/artifacthub/hub/internal/pkg"
	"github.com/artifacthub/hub/internal/util"
	ignore "github.com/sabhiram/go-gitignore"
	"gopkg.in/yaml.v3"
)

const (
	// ArgoTemplateKey represents the key used in the package's data field that
	// contains the template.
	ArgoTemplateKey = "template"

	// FalcoRulesKey represents the key used in the package's data field that
	// contains the raw rules.
	FalcoRulesKey = "rules"

	// GatekeeperExamplesKey represents the key used in the package's data
	// field that contains the examples.
	GatekeeperExamplesKey = "examples"

	// GatekeeperTemplateKey represents the key used in the package's data field
	// that contains the template.
	GatekeeperTemplateKey = "template"

	// KubeArmorPoliciesKey represents the key used in the package's data field
	// that contains the raw policies.
	KubeArmorPoliciesKey = "policies"

	// KyvernoPolicyKey represents the key used in the package's data field that
	// contains the raw policy.
	KyvernoPolicyKey = "policy"

	// mesheryDesignKey represents the key used in the package's data field that
	// contains the design.
	MesheryDesignKey = "design"

	// OPAPoliciesKey represents the key used in the package's data field that
	// contains the raw policies.
	OPAPoliciesKey = "policies"

	// RadiusRecipeKey represents the key used in the package's data field that
	// contains the raw recipe files.
	RadiusRecipeKey = "recipe"

	// argoTemplateManifests represents the filename that contains the Argo
	// template manifests.
	argoTemplateManifests = "manifests.yaml"

	// falcoRulesSuffix is the suffix that each of the rules files in the
	// package must use.
	falcoRulesSuffix = "-rules.yaml"

	// kubeArmorPoliciesSuffix is the suffix that each of the policies files in
	// the package must use.
	kubeArmorPoliciesSuffix = ".yaml"

	// mesheryDesignFile represents the filename that contains the Meshery
	// design file.
	mesheryDesignFile = "design.yml"

	// opaPoliciesSuffix is the suffix that each of the policies files in the
	// package must use.
	opaPoliciesSuffix = ".rego"

	// radiusBicepRecipe represents the filename that contains the Radius
	// recipe file in Bicep format.
	radiusBicepRecipe = "recipe.bicep"

	// radiusTFRecipe represents the filename that contains the Radius recipe
	// file in Terraform format (main).
	radiusTFRecipe = "main.tf"

	// radiusTFRecipeVariables represents the filename that contains the
	// variables used by the Radius recipe file in Terraform format.
	radiusTFRecipeVariables = "variables.tf"
)

// TrackerSource is a hub.TrackerSource implementation used by several kinds
// of repositories.
type TrackerSource struct {
	i *hub.TrackerSourceInput
}

// NewTrackerSource creates a new TrackerSource instance.
func NewTrackerSource(i *hub.TrackerSourceInput, opts ...func(s *TrackerSource)) *TrackerSource {
	return &TrackerSource{i: i}
}

// GetPackagesAvailable implements the TrackerSource interface.
func (s *TrackerSource) GetPackagesAvailable() (map[string]*hub.Package, error) {
	packagesAvailable := make(map[string]*hub.Package)

	// Walk the path provided looking for available packages
	err := filepath.Walk(s.i.BasePath, func(pkgPath string, info os.FileInfo, err error) error {
		// Return ASAP if context is cancelled
		select {
		case <-s.i.Svc.Ctx.Done():
			return s.i.Svc.Ctx.Err()
		default:
		}

		// If an error is raised while visiting a path or the path is not a
		// directory, we skip it
		if err != nil || !info.IsDir() {
			return nil
		}

		// Get package version metadata
		md, err := pkg.GetPackageMetadata(
			s.i.Repository.Kind,
			filepath.Join(pkgPath, hub.PackageMetadataFile),
		)
		if err != nil {
			if !errors.Is(err, os.ErrNotExist) {
				s.warn(fmt.Errorf("error getting package metadata (path: %s): %w", pkgPath, err))
			}
			return nil
		}

		// Prepare and store package version
		p, err := PreparePackage(s.i.Repository, md, pkgPath)
		if err != nil {
			s.warn(err)
			return nil
		}
		p.RelativePath = strings.TrimPrefix(pkgPath, s.i.BasePath)
		packagesAvailable[pkg.BuildKey(p)] = p

		// Prepare and store logo image when available
		logoImageID, err := s.prepareLogoImage(md, pkgPath)
		if err != nil {
			s.warn(fmt.Errorf("error preparing package %s version %s logo image: %w", md.Name, md.Version, err))
		} else {
			p.LogoImageID = logoImageID
		}

		// Check if the package is signed (for applicable kinds)
		switch p.Repository.Kind {
		case hub.InspektorGadget, hub.Kubewarden:
			// We'll consider the package signed if all images are signed
			signedImages := 0
			for _, entry := range p.ContainersImages {
				hasCosignSignature, err := s.i.Svc.Sc.HasCosignSignature(s.i.Svc.Ctx, entry.Image, "", "")
				if err != nil {
					s.warn(fmt.Errorf(
						"error checking package %s version %s image %s signature: %w",
						md.Name, md.Version, entry.Image, err,
					))
				} else if hasCosignSignature {
					signedImages++
				}
			}
			if len(p.ContainersImages) > 0 && signedImages == len(p.ContainersImages) {
				p.Signed = true
				p.Signatures = []string{oci.Cosign}
			}
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	return packagesAvailable, nil
}

// prepareLogoImage processes and stores the logo image provided.
func (s *TrackerSource) prepareLogoImage(md *hub.PackageMetadata, pkgPath string) (string, error) {
	var logoImageID string
	var err error

	// Store logo image when available
	if md.LogoPath != "" {
		data, err := os.ReadFile(filepath.Join(pkgPath, md.LogoPath))
		if err != nil {
			return "", fmt.Errorf("error reading logo image: %w", err)
		}
		logoImageID, err = s.i.Svc.Is.SaveImage(s.i.Svc.Ctx, data)
		if err != nil && !errors.Is(err, image.ErrFormat) {
			return "", fmt.Errorf("error saving logo image: %w", err)
		}
	} else if md.LogoURL != "" {
		logoImageID, err = s.i.Svc.Is.DownloadAndSaveImage(s.i.Svc.Ctx, md.LogoURL)
		if err != nil {
			return "", fmt.Errorf("error downloading and saving logo image: %w", err)
		}
	}

	return logoImageID, nil
}

// warn is a helper that sends the error provided to the errors collector and
// logs it as a warning.
func (s *TrackerSource) warn(err error) {
	s.i.Svc.Logger.Warn().Err(err).Send()
	s.i.Svc.Ec.Append(s.i.Repository.RepositoryID, err.Error())
}

// PreparePackage prepares a package version using the metadata and the files
// in the path provided.
func PreparePackage(r *hub.Repository, md *hub.PackageMetadata, pkgPath string) (*hub.Package, error) {
	// Prepare package from metadata
	p, err := pkg.PreparePackageFromMetadata(md)
	if err != nil {
		return nil, fmt.Errorf("error preparing package %s version %s from metadata: %w", md.Name, md.Version, err)
	}
	p.Repository = r

	// If the readme content hasn't been provided in the metadata file, try to
	// get it from the README.md file.
	if p.Readme == "" {
		readme, err := util.ReadRegularFile(filepath.Join(pkgPath, "README.md"))
		if err == nil {
			p.Readme = string(readme)
		}
	}

	// Include kind specific data into package
	ignorer := ignore.CompileIgnoreLines(append(md.Ignore, "artifacthub-*")...)
	var kindData map[string]interface{}
	switch r.Kind {
	case hub.ArgoTemplate:
		kindData, err = prepareArgoTemplateData(pkgPath)
	case hub.Falco:
		kindData, err = prepareFalcoData(pkgPath, ignorer)
	case hub.Gatekeeper:
		kindData, err = prepareGatekeeperData(pkgPath)
	case hub.KubeArmor:
		kindData, err = prepareKubeArmorData(pkgPath, ignorer)
	case hub.Kyverno:
		kindData, err = prepareKyvernoData(pkgPath, p.Name)
	case hub.Meshery:
		kindData, err = prepareMesheryData(pkgPath)
	case hub.OPA:
		kindData, err = prepareOPAData(pkgPath, ignorer)
	case hub.Radius:
		kindData, err = prepareRadiusData(pkgPath)
	}
	if err != nil {
		return nil, fmt.Errorf("error preparing package %s version %s data: %w", md.Name, md.Version, err)
	}
	if kindData != nil {
		if p.Data == nil {
			p.Data = kindData
		} else {
			for k, v := range kindData {
				p.Data[k] = v
			}
		}
	}

	return p, nil
}

// prepareArgoTemplateData reads and formats Argo templates specific data
// available in the path provided, returning the resulting data structure.
func prepareArgoTemplateData(pkgPath string) (map[string]interface{}, error) {
	// Read manifests file
	manifestsPath := path.Join(pkgPath, argoTemplateManifests)
	template, err := util.ReadRegularFile(manifestsPath)
	if err != nil {
		return nil, fmt.Errorf("error reading argo template manifests: %w", err)
	}

	// Return package data field
	return map[string]interface{}{
		ArgoTemplateKey: string(template),
	}, nil
}

// prepareFalcoData reads and formats Falco specific data available in the path
// provided, returning the resulting data structure.
func prepareFalcoData(pkgPath string, ignorer ignore.IgnoreParser) (map[string]interface{}, error) {
	// Read rules files
	files, err := GetFilesWithSuffix(falcoRulesSuffix, pkgPath, ignorer)
	if err != nil {
		return nil, fmt.Errorf("error getting falco rules files: %w", err)
	}
	if len(files) == 0 {
		return nil, errors.New("no falco rules files found")
	}

	// Return package data field
	return map[string]interface{}{
		FalcoRulesKey: files,
	}, nil
}

// prepareGatekeeperData reads and formats Gatekeeper specific data available
// in the path provided, returning the resulting data structure.
func prepareGatekeeperData(pkgPath string) (map[string]interface{}, error) {
	// Read template file
	templatePath := path.Join(pkgPath, "template.yaml")
	template, err := util.ReadRegularFile(templatePath)
	if err != nil {
		return nil, fmt.Errorf("error reading gatekeeper template file: %w", err)
	}

	// Read examples
	var examples []*GKExample
	suitePath := path.Join(pkgPath, "suite.yaml")
	suiteYaml, err := util.ReadRegularFile(suitePath)
	if err != nil {
		if !errors.Is(err, os.ErrNotExist) {
			return nil, fmt.Errorf("error reading gatekeeper suite: %w", err)
		}
	} else {
		var suite *GKSuite
		if err := yaml.Unmarshal(suiteYaml, &suite); err != nil {
			return nil, fmt.Errorf("error reading parsing suite file: %w", err)
		}
		for _, t := range suite.Tests {
			var cases []*GKExampleCase
			if t.Constraint != "" {
				content, err := util.ReadRegularFile(path.Join(pkgPath, t.Constraint))
				if err != nil {
					return nil, fmt.Errorf("error reading constraint file (%s): %w", t.Constraint, err)
				}
				cases = append(cases, &GKExampleCase{
					Name:    "constraint",
					Path:    t.Constraint,
					Content: string(content),
				})
			}
			for _, c := range t.Cases {
				content, err := util.ReadRegularFile(path.Join(pkgPath, c.Object))
				if err != nil {
					return nil, fmt.Errorf("error reading example file (%s): %w", c.Object, err)
				}
				cases = append(cases, &GKExampleCase{
					Name:    c.Name,
					Path:    c.Object,
					Content: string(content),
				})
			}
			examples = append(examples, &GKExample{
				Name:  t.Name,
				Cases: cases,
			})
		}
	}

	// Return package data field
	return map[string]interface{}{
		GatekeeperTemplateKey: string(template),
		GatekeeperExamplesKey: examples,
	}, nil
}

// prepareKubeArmorData reads and formats KubeArmor specific data available in
// the path provided, returning the resulting data structure.
func prepareKubeArmorData(pkgPath string, ignorer ignore.IgnoreParser) (map[string]interface{}, error) {
	// Read policies files
	policies, err := GetFilesWithSuffix(kubeArmorPoliciesSuffix, pkgPath, ignorer)
	if err != nil {
		return nil, fmt.Errorf("error getting kubearmor policies files: %w", err)
	}

	// Return package data field
	return map[string]interface{}{
		KubeArmorPoliciesKey: policies,
	}, nil
}

// prepareKyernoData reads and formats Kyverno specific data available in the
// path provided, returning the resulting data structure.
func prepareKyvernoData(pkgPath, pkgName string) (map[string]interface{}, error) {
	// Read policy file
	policyPath := path.Join(pkgPath, path.Base(pkgPath)+".yaml")
	if _, err := os.Stat(policyPath); os.IsNotExist(err) {
		policyPath = path.Join(pkgPath, pkgName+".yaml")
	}
	policy, err := util.ReadRegularFile(policyPath)
	if err != nil {
		return nil, fmt.Errorf("error reading kyverno policy file: %w", err)
	}

	// Return package data field
	return map[string]interface{}{
		KyvernoPolicyKey: string(policy),
	}, nil
}

// prepareMesheryData reads and formats Meshery designs specific data available
// in the path provided, returning the resulting data structure.
func prepareMesheryData(pkgPath string) (map[string]interface{}, error) {
	// Read design file
	designPath := path.Join(pkgPath, mesheryDesignFile)
	design, err := util.ReadRegularFile(designPath)
	if err != nil {
		return nil, fmt.Errorf("error reading meshery design file: %w", err)
	}

	// Return package data field
	return map[string]interface{}{
		MesheryDesignKey: string(design),
	}, nil
}

// prepareOPAData reads and formats OPA specific data available in the path
// provided, returning the resulting data structure.
func prepareOPAData(pkgPath string, ignorer ignore.IgnoreParser) (map[string]interface{}, error) {
	// Read policies files
	files, err := GetFilesWithSuffix(opaPoliciesSuffix, pkgPath, ignorer)
	if err != nil {
		return nil, fmt.Errorf("error getting opa policies files: %w", err)
	}
	if len(files) == 0 {
		return nil, errors.New("no opa policies files found")
	}

	// Return package data field
	return map[string]interface{}{
		OPAPoliciesKey: files,
	}, nil
}

// prepareRadiusData reads and formats Radius specific data available in the
// path provided, returning the resulting data structure.
func prepareRadiusData(pkgPath string) (map[string]interface{}, error) {
	// Read recipe files
	files := make(map[string]string)
	for _, fileName := range []string{radiusBicepRecipe, radiusTFRecipe, radiusTFRecipeVariables} {
		filePath := path.Join(pkgPath, fileName)
		content, err := util.ReadRegularFile(filePath)
		if err == nil {
			files[fileName] = string(content)
		} else if !errors.Is(err, os.ErrNotExist) {
			return nil, fmt.Errorf("error reading recipe file (%s): %w", fileName, err)
		}
	}

	// Check recipe files found
	_, bicepFound := files[radiusBicepRecipe]
	_, tfFound := files[radiusTFRecipe]
	if bicepFound && tfFound {
		return nil, errors.New("invalid recipe: both bicep and terraform files found")
	}
	if len(files) == 0 {
		return nil, errors.New("no recipe files found")
	}

	// Return package data field
	return map[string]interface{}{
		RadiusRecipeKey: files,
	}, nil
}

// GetFilesWithSuffix returns the files with a given suffix in the path
// provided, ignoring the ones the ignorer matches.
func GetFilesWithSuffix(suffix, rootPath string, ignorer ignore.IgnoreParser) (map[string]string, error) {
	files := make(map[string]string)
	err := filepath.Walk(rootPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return fmt.Errorf("error reading files: %w", err)
		}
		if info.IsDir() {
			return nil
		}
		name := strings.TrimPrefix(path, rootPath+"/")
		if ignorer != nil && ignorer.MatchesPath(name) {
			return nil
		}
		if !strings.HasSuffix(info.Name(), suffix) {
			return nil
		}
		content, err := util.ReadRegularFile(path)
		if err != nil {
			return fmt.Errorf("error reading file: %w", err)
		}
		files[name] = string(content)
		return nil
	})
	if err != nil {
		return nil, err
	}
	return files, nil
}
