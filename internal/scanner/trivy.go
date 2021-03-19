package scanner

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"strings"

	"github.com/google/go-containerregistry/pkg/name"
	"github.com/spf13/viper"
)

// ErrImageNotFound represents that the image provided was not found in the
// repository.
var ErrImageNotFound = errors.New("image not found")

// TrivyScanner is an implementation of the Scanner interface that uses Trivy.
type TrivyScanner struct {
	Ctx context.Context
	Cfg *viper.Viper
	URL string
}

// Scan implements the Scanner interface.
func (s *TrivyScanner) Scan(image string) ([]byte, error) {
	// Setup trivy command
	cmd := exec.CommandContext(s.Ctx, "trivy", "--quiet", "client", "--remote", s.URL, "-f", "json", image) // #nosec
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	// clean environment
	cmd.Env = []string{
		"PATH=" + os.Getenv("PATH"),
		"USER=" + os.Getenv("USER"),
		"HOME=" + os.Getenv("HOME"),
		"TRIVY_CACHE_DIR=" + os.Getenv("TRIVY_CACHE_DIR"),
	}

	// If the registry is the Docker Hub, include credentials to avoid rate
	// limiting issues. Empty registry names will also match this check as the
	// registry name will be set to index.docker.io when parsing the reference.
	ref, err := name.ParseReference(image)
	if err != nil {
		return nil, fmt.Errorf("error parsing image %s ref: %w", image, err)
	}
	if strings.HasSuffix(ref.Context().Registry.Name(), "docker.io") {
		cmd.Env = append(cmd.Env,
			"TRIVY_USERNAME="+s.Cfg.GetString("creds.dockerUsername"),
			"TRIVY_PASSWORD="+s.Cfg.GetString("creds.dockerPassword"),
		)
	}

	// Run trivy command
	if err := cmd.Run(); err != nil {
		if strings.Contains(stderr.String(), "Cannot connect to the Docker daemon") {
			return nil, ErrImageNotFound
		}
		return nil, fmt.Errorf("error running trivy on image %s: %w: %s", image, err, stderr.String())
	}
	return stdout.Bytes(), nil
}
