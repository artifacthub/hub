package scanner

import (
	"bytes"
	"context"
	"crypto/sha512"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"sort"
	"strings"

	trivy "github.com/aquasecurity/trivy/pkg/types"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/oci"
	"github.com/google/go-containerregistry/pkg/name"
	"github.com/rs/zerolog/log"
	"github.com/spf13/viper"
)

var (
	// ErrImageNotFound indicates that the image provided was not found in the
	// registry.
	ErrImageNotFound = errors.New("image not found")

	// ErrSchemaV1NotSupported indicates that the image provided is using a v1
	// schema which is not supported.
	ErrSchemaV1NotSupported = errors.New("schema v1 manifest not supported by trivy")
)

// ImageScanner describes the methods an ImageScanner implementation must
// provide. An image scanner is responsible of scanning a container image for
// security vulnerabilities.
type ImageScanner interface {
	// ScanImage scans the provided image for security vulnerabilities,
	// returning a report in json format.
	ScanImage(image string) ([]byte, error)
}

// Scanner is in charge of scanning packages' snapshots for security
// vulnerabilities. It relies on an image scanner to scan all the containers
// images listed on the snapshot.
type Scanner struct {
	is ImageScanner
	ec hub.ErrorsCollector
}

// New creates a new Scanner instance.
func New(
	ctx context.Context,
	cfg *viper.Viper,
	ec hub.ErrorsCollector,
	opts ...func(s *Scanner),
) *Scanner {
	if cfg.GetString("scanner.trivyURL") == "" {
		log.Fatal().Msg("trivy url not set")
	}
	s := &Scanner{
		is: &TrivyScanner{
			ctx: ctx,
			cfg: cfg,
		},
		ec: ec,
	}
	for _, o := range opts {
		o(s)
	}
	return s
}

// WithImageScanner allows providing a specific ImageScanner implementation for
// a Scanner instance.
func WithImageScanner(is ImageScanner) func(s *Scanner) {
	return func(s *Scanner) {
		s.is = is
	}
}

// Scan scans the provided package's snapshot for security vulnerabilities
// returning a report with the results.
func (s *Scanner) Scan(sn *hub.SnapshotToScan) (*hub.SnapshotSecurityReport, error) {
	s.ec.Init(sn.RepositoryID)

	report := &hub.SnapshotSecurityReport{
		PackageID: sn.PackageID,
		Version:   sn.Version,
	}

	imagesReports := make(map[string]*trivy.Report)
	for _, image := range sn.ContainersImages {
		imageReportJSON, err := s.is.ScanImage(image.Image)
		if err != nil {
			err := fmt.Errorf("error scanning image %s: %w (package %s:%s)", image.Image, err, sn.PackageName, sn.Version)
			s.ec.Append(sn.RepositoryID, err.Error())
			return report, err
		}
		var imageReport *trivy.Report
		if err := json.Unmarshal(imageReportJSON, &imageReport); err != nil {
			return report, fmt.Errorf("error unmarshalling image %s report: %w", image.Image, err)
		}
		if imageReport != nil && len(imageReport.Results) > 0 {
			imagesReports[image.Image] = imageReport
		}
	}
	if len(imagesReports) > 0 {
		report.ImagesReports = imagesReports
		report.Summary = generateSummary(imagesReports)
		report.AlertDigest = generateAlertDigest(imagesReports)
	}

	return report, nil
}

// generateSummary generates a summary of the security report from the images
// reports.
func generateSummary(imagesReports map[string]*trivy.Report) *hub.SecurityReportSummary {
	summary := &hub.SecurityReportSummary{}
	for _, imageReport := range imagesReports {
		for _, result := range imageReport.Results {
			for _, vulnerability := range result.Vulnerabilities {
				switch vulnerability.Severity {
				case "CRITICAL":
					summary.Critical++
				case "HIGH":
					summary.High++
				case "MEDIUM":
					summary.Medium++
				case "LOW":
					summary.Low++
				case "UNKNOWN":
					summary.Unknown++
				}
			}
		}
	}
	return summary
}

// generateAlertDigest generates an alert digest of the security report from
// the images reports. At the moment the digest is based on the vulnerabilities
// with a severity of high or critical.
func generateAlertDigest(imagesReports map[string]*trivy.Report) string {
	var vs []string
	for _, imageReport := range imagesReports {
		for _, result := range imageReport.Results {
			for _, v := range result.Vulnerabilities {
				if v.Severity == "HIGH" || v.Severity == "CRITICAL" {
					vs = append(vs, fmt.Sprintf("[%s:%s]", v.Severity, v.VulnerabilityID))
				}
			}
		}
	}
	var digest string
	if len(vs) > 0 {
		sort.Strings(vs)
		digest = fmt.Sprintf("%x", sha512.Sum512([]byte(strings.Join(vs, ""))))
	}
	return digest
}

// TrivyScanner is an ImageScanner implementation that uses Trivy to scan
// containers images for security vulnerabilities.
type TrivyScanner struct {
	ctx context.Context
	cfg *viper.Viper
}

// ScanImage implements the ImageScanner interface.
func (s *TrivyScanner) ScanImage(image string) ([]byte, error) {
	// Setup trivy command
	trivyURL := s.cfg.GetString("scanner.trivyURL")
	cmd := exec.CommandContext(s.ctx, "trivy", "--quiet", "image", "--list-all-pkgs", "--security-checks", "vuln", "--server", trivyURL, "--timeout", "15m", "-f", "json", image) // #nosec
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	cmd.Env = []string{
		"PATH=" + os.Getenv("PATH"),
		"USER=" + os.Getenv("USER"),
		"HOME=" + os.Getenv("HOME"),
		"TRIVY_CACHE_DIR=" + os.Getenv("TRIVY_CACHE_DIR"),
		"TRIVY_NEW_JSON_SCHEMA=true", // Not needed in Trivy >= 0.20.0
	}

	// If the registry is the Docker Hub, include credentials to avoid rate
	// limiting issues. Empty registry names will also match this check as the
	// registry name will be set to index.docker.io when parsing the reference.
	ref, err := name.ParseReference(image)
	if err != nil {
		return nil, fmt.Errorf("error parsing image %s ref: %w", image, err)
	}
	if oci.RegistryIsDockerHub(ref) {
		cmd.Env = append(cmd.Env,
			"TRIVY_USERNAME="+s.cfg.GetString("creds.dockerUsername"),
			"TRIVY_PASSWORD="+s.cfg.GetString("creds.dockerPassword"),
		)
	}

	// Run trivy command
	if err := cmd.Run(); err != nil {
		if strings.Contains(stderr.String(), "MANIFEST_UNKNOWN") {
			return nil, ErrImageNotFound
		}
		if strings.Contains(stderr.String(), "UNAUTHORIZED") {
			return nil, ErrImageNotFound
		}
		if strings.Contains(stderr.String(), `unsupported MediaType: "application/vnd.docker.distribution.manifest.v1+prettyjws"`) {
			return nil, ErrSchemaV1NotSupported
		}
		trivyError := stderr.String()
		parts := strings.Split(stderr.String(), "podman/podman.sock: no such file or directory")
		if len(parts) > 1 {
			trivyError = strings.TrimSpace(parts[1])
		}
		return nil, fmt.Errorf("error running trivy on image %s: %s", image, trivyError)
	}
	return stdout.Bytes(), nil
}
