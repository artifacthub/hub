package repo

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"strings"

	"github.com/artifacthub/hub/internal/hub"
)

// OLMOCIExporter provides a mechanism to export the packages available in an
// OLM repository stored in an OCI registry.
type OLMOCIExporter struct{}

// ExportRepository exports the packages available in a repository stored in a
// OCI registry using the appregistry manifest format. It returns the temporary
// directory where the packages will be stored. It's the caller's responsibility
// to delete it when done.
func (e *OLMOCIExporter) ExportRepository(ctx context.Context, r *hub.Repository) (string, error) {
	// Setup temporary directory to store content
	tmpDir, err := os.MkdirTemp("", "artifact-hub")
	if err != nil {
		return "", fmt.Errorf("error creating temp dir: %w", err)
	}

	// Export repository packages using opm (external tool)
	indexRef := strings.TrimPrefix(r.URL, hub.RepositoryOCIPrefix)
	cmd := exec.CommandContext(ctx, "opm", "index", "export", "-i", indexRef, "-f", tmpDir) // #nosec
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	cmd.Env = []string{
		"PATH=" + os.Getenv("PATH"),
		"USER=" + os.Getenv("USER"),
		"HOME=" + os.Getenv("HOME"),
	}
	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("error running opm index export (%s): %w: %s", indexRef, err, stderr.String())
	}

	return tmpDir, nil
}
