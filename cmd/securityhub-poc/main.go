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
	"github.com/artifacthub/hub/internal/util"
	"github.com/rs/zerolog/log"
	"gopkg.in/yaml.v2"
)

var path = flag.String("path", ".", "Path containing SecurityHub yaml files to process")

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
	hubAPI := hub.New(db, nil)
	imageStore, err := util.SetupImageStore(cfg, db)
	if err != nil {
		log.Fatal().Err(err).Msg("ImageStore setup failed")
	}
	r := &SecurityHubRegistrar{
		ctx:        context.Background(),
		hubAPI:     hubAPI,
		imageStore: imageStore,
	}

	// Walk the path provided looking for SecurityHub yaml files to process
	err = filepath.Walk(*path, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			return nil
		}
		if !strings.HasSuffix(info.Name(), "yaml") {
			return nil
		}
		return r.registerPackage(path)
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
	hubAPI     *hub.Hub
	imageStore img.Store
}

func (r *SecurityHubRegistrar) registerPackage(path string) error {
	// Parse SecurityHub entry in yaml file
	data, err := ioutil.ReadFile(path)
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
		Description: e.ShortDescription,
		LogoURL:     logoURL,
		LogoImageID: logoImageID,
		Keywords:    e.Keywords,
		Version:     e.Version,
		Readme:      e.Description,
	}
	switch e.Kind {
	case "FalcoRules":
		p.Kind = hub.Falco
		p.Data = map[string]interface{}{"rules": e.Rules}
	case "OpenPolicyAgentPolicies":
		p.Kind = hub.OPA
		p.Data = map[string]interface{}{"policies": e.Policies}
	}

	return r.hubAPI.RegisterPackage(r.ctx, p)
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
