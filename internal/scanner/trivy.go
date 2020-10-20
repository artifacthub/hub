package scanner

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os/exec"
	"strings"
)

// ErrImageNotFound represents that the image provided was not found in the
// repository.
var ErrImageNotFound = errors.New("image not found")

// TrivyScanner is an implementation of the Scanner interface that uses Trivy.
type TrivyScanner struct {
	Ctx context.Context
	URL string
}

// Scan implements the Scanner interface.
func (s *TrivyScanner) Scan(image string) ([]byte, error) {
	cmd := exec.CommandContext(s.Ctx, "trivy", "client", "--quiet", "--remote", s.URL, "-f", "json", image) // #nosec
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		if strings.Contains(stderr.String(), "Cannot connect to the Docker daemon") {
			return nil, ErrImageNotFound
		}
		return nil, fmt.Errorf("error running trivy on image %s: %w: %s", image, err, stderr.String())
	}
	return stdout.Bytes(), nil
}
