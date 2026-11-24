package scanner

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	trivy "github.com/aquasecurity/trivy/pkg/types"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/oci"
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

	// ErrRateLimited indicates that the registry of the image provided is
	// limiting the requests received, so the image could not be scanned. The
	// snapshot should remain pending as this says nothing about the image.
	ErrRateLimited = errors.New("rate limited by registry")

	// ErrScanCanceled indicates that the scan was interrupted because the scanner
	// is shutting down. The snapshot should remain pending as this says nothing
	// about the image.
	ErrScanCanceled = errors.New("scan canceled")

	// ErrTrivyServerUnavailable indicates that the Trivy server is unavailable
	// or unable to scan images (for example, its vulnerability database is not
	// open or its storage is full). The snapshot should remain pending as this
	// says nothing about the image.
	ErrTrivyServerUnavailable = errors.New("trivy server unavailable")
)

// ImageScanner describes the methods an ImageScanner implementation must
// provide. An image scanner is responsible of scanning a container image for
// security vulnerabilities.
type ImageScanner interface {
	// Prepare gets the image scanner ready to scan images, downloading what it
	// needs. It must be called once, before scanning any image.
	Prepare() error

	// ScanImage scans the provided image for security vulnerabilities,
	// returning a report in json format.
	ScanImage(image string) ([]byte, error)

	// ServerUnavailable reports whether the image scanner has detected that the
	// backend scanning server is unavailable and stopped further scans.
	ServerUnavailable() bool

	// Close releases the resources used by the image scanner.
	Close() error
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
		is: newTrivyScanner(ctx, cfg),
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

// Close releases the resources used by the scanner. It must be called once all
// scans have finished.
func (s *Scanner) Close() error {
	return s.is.Close()
}

// Prepare gets the scanner ready to scan snapshots. It must be called once,
// before the first scan. The image scanner may check its backend server and
// download large databases, like the Java DB of Trivy, so it is better not to
// call it when there is nothing to scan. Scans should not be run if it fails.
// ErrScanCanceled is returned if the scanner is shutting down.
func (s *Scanner) Prepare() error {
	return s.is.Prepare()
}

// ServerUnavailable reports whether the scanner has detected that the backend
// scanning server is unavailable and stopped further scans.
func (s *Scanner) ServerUnavailable() bool {
	return s.is.ServerUnavailable()
}

// IsPending checks if the error provided means that a snapshot could not be
// scanned for reasons unrelated to its images. The report returned by Scan must
// be discarded in that case, so that the snapshot remains pending.
func IsPending(err error) bool {
	return errors.Is(err, ErrRateLimited) ||
		errors.Is(err, ErrScanCanceled) ||
		errors.Is(err, ErrTrivyServerUnavailable)
}

// Scan scans the provided package's snapshot for security vulnerabilities
// returning a report with the results. The repository errors remain untouched
// when the error returned is one for which IsPending returns true.
func (s *Scanner) Scan(sn *hub.SnapshotToScan) (_ *hub.SnapshotSecurityReport, scanErr error) {
	defer func() {
		if !IsPending(scanErr) {
			s.ec.Init(sn.RepositoryID)
		}
	}()

	report := &hub.SnapshotSecurityReport{
		PackageID: sn.PackageID,
		Version:   sn.Version,
	}

	imagesReports := make(map[string]*trivy.Report)
	for _, image := range sn.ContainersImages {
		imageReportJSON, err := s.is.ScanImage(image.Image)
		if errors.Is(err, oci.ErrImageTooLarge) {
			// Images too large are not scanned, this is not an error
			log.Info().Str("image", image.Image).Msg("image too large: skipped")
			continue
		}
		if err != nil {
			err := fmt.Errorf("error scanning image %s: %w (package %s:%s)", image.Image, err, sn.PackageName, sn.Version)
			if !IsPending(err) {
				s.ec.Append(sn.RepositoryID, err.Error())
			}
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
		report.AlertDigest = BuildAlertDigest(imagesReports)
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
				switch vulnerability.Severity { // nolint:staticcheck // SA1019: using legacy severity until Trivy DB v3 migration
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
