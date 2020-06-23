package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"image"
	"io/ioutil"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/img"
	"github.com/artifacthub/hub/internal/pkg"
	"github.com/artifacthub/hub/internal/util"
	"github.com/rs/zerolog/log"
	"gopkg.in/yaml.v2"
)

var basePath = flag.String("base-path", ".", "Path containing SecurityHub yaml files to process")
var repoID = flag.String("repo-id", "", "ID of the repository that will own the packages added")

func main() {
	flag.Parse()

	// Setup configuration and logger
	cfg, err := util.SetupConfig("securityhub-poc")
	if err != nil {
		log.Fatal().Err(err).Msg("Configuration setup failed")
	}
	if err := util.SetupLogger(cfg, nil); err != nil {
		log.Fatal().Err(err).Msg("Logger setup failed")
	}

	// Setup SecurityHub entries registrar
	db, err := util.SetupDB(cfg)
	if err != nil {
		log.Fatal().Err(err).Msg("Database setup failed")
	}
	pkgManager := pkg.NewManager(db)
	imageStore, err := util.SetupImageStore(cfg, db)
	if err != nil {
		log.Fatal().Err(err).Msg("ImageStore setup failed")
	}
	r := &SecurityHubRegistrar{
		ctx:        context.Background(),
		pkgManager: pkgManager,
		imageStore: imageStore,
	}

	// Walk the path provided looking for SecurityHub yaml files to process
	err = filepath.Walk(*basePath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			return nil
		}
		if !strings.HasSuffix(info.Name(), "yaml") {
			return nil
		}
		return r.registerPackage(*repoID, *basePath, path)
	})
	if err != nil {
		log.Fatal().Err(err).Msg("Error processing SecurityHub yaml files")
	}
}

type SecurityHubEntry struct {
	Kind             string    `yaml:"kind"`
	Name             string    `yaml:"name"`
	ShortDescription string    `yaml:"shortDescription"`
	Version          string    `yaml:"version"`
	Description      string    `yaml:"description"`
	Keywords         []string  `yaml:"keywords"`
	Icon             string    `yaml:"icon"`
	Rules            []*Rule   `yaml:"rules"`
	Policies         []*Policy `yaml:"policies"`
}

type Rule struct {
	Raw string `yaml:"raw"`
}

type Policy struct {
	Raw string `yaml:"raw"`
}

type SecurityHubRegistrar struct {
	ctx        context.Context
	pkgManager hub.PackageManager
	imageStore img.Store
}

func (r *SecurityHubRegistrar) registerPackage(orgID, basePath, pkgPath string) error {
	// Parse SecurityHub entry in yaml file
	data, err := ioutil.ReadFile(pkgPath)
	if err != nil {
		return err
	}
	var e *SecurityHubEntry
	if err = yaml.Unmarshal(data, &e); err != nil {
		return err
	}

	// Register logo image if needed
	var logoURL, logoImageID string
	if e.Icon != "" {
		logoURL = e.Icon
		data, err := downloadImage(logoURL)
		if err != nil {
			return err
		}
		logoImageID, err = r.imageStore.SaveImage(r.ctx, data)
		if err != nil && !errors.Is(err, image.ErrFormat) {
			return err
		}
	}

	// Build package to register
	p := &hub.Package{
		Name:        e.Name,
		LogoURL:     logoURL,
		LogoImageID: logoImageID,
		Description: e.ShortDescription,
		Keywords:    e.Keywords,
		Version:     e.Version,
		Readme:      e.Description,
		Repository: &hub.Repository{
			RepositoryID: *repoID,
		},
	}
	switch e.Kind {
	case "FalcoRules":
		yamlFile := strings.TrimPrefix(pkgPath, basePath)
		sourceURL := fmt.Sprintf("https://github.com/falcosecurity/cloud-native-security-hub/blob/master/resources%s", yamlFile)
		p.Links = []*hub.Link{
			{
				Name: "source",
				URL:  sourceURL,
			},
		}
		p.Data = map[string]interface{}{"rules": e.Rules}
	}

	return r.pkgManager.Register(r.ctx, p)
}

func downloadImage(u string) ([]byte, error) {
	resp, err := http.Get(fmt.Sprint(u))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusOK {
		return ioutil.ReadAll(resp.Body)
	}
	return nil, fmt.Errorf("unexpected status code received: %d", resp.StatusCode)
}
