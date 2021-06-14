package scanner

import (
	"context"
	"crypto/sha512"
	"encoding/json"
	"fmt"
	"sort"
	"strings"

	"github.com/artifacthub/hub/internal/hub"
)

// Scanner describes the methods a Scanner implementation must provide.
type Scanner interface {
	Scan(image string) ([]byte, error)
}

// ScanSnapshot scans the provided package's snapshot for security
// vulnerabilities returning a report with the results.
func ScanSnapshot(
	ctx context.Context,
	scanner Scanner,
	s *hub.SnapshotToScan,
	ec hub.ErrorsCollector,
) (*hub.SnapshotSecurityReport, error) {
	full := make(map[string][]interface{})
	ec.Init(s.RepositoryID)

	for _, image := range s.ContainersImages {
		reportData, err := scanner.Scan(image.Image)
		if err != nil {
			err := fmt.Errorf("error scanning image %s: %w (package %s:%s)", image.Image, err, s.PackageName, s.Version)
			ec.Append(s.RepositoryID, err.Error())
			return nil, err
		}
		var imageFullReport []interface{}
		if err := json.Unmarshal(reportData, &imageFullReport); err != nil {
			return nil, fmt.Errorf("error unmarshalling image %s full report: %w", image.Image, err)
		}
		if imageFullReport != nil {
			full[image.Image] = imageFullReport
		}
	}
	var summary *hub.SecurityReportSummary
	var alertDigest string
	if len(full) > 0 {
		summary = generateSummary(full)
		alertDigest = generateAlertDigest(full)
	} else {
		full = nil
	}

	return &hub.SnapshotSecurityReport{
		PackageID:   s.PackageID,
		Version:     s.Version,
		AlertDigest: alertDigest,
		Full:        full,
		Summary:     summary,
	}, nil
}

// generateSummary generates a summary of the security report from the full
// report
func generateSummary(full map[string][]interface{}) *hub.SecurityReportSummary {
	summary := &hub.SecurityReportSummary{}
	for _, targets := range full {
		for _, entry := range targets {
			var target *Target
			entryJSON, err := json.Marshal(entry)
			if err != nil {
				continue
			}
			if err := json.Unmarshal(entryJSON, &target); err != nil {
				continue
			}
			for _, vulnerability := range target.Vulnerabilities {
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
// the full report. At the moment the digest is based on the vulnerabilities
// with a severity of high or critical.
func generateAlertDigest(full map[string][]interface{}) string {
	var vs []string
	for _, targets := range full {
		for _, entry := range targets {
			var target *Target
			entryJSON, err := json.Marshal(entry)
			if err != nil {
				continue
			}
			if err := json.Unmarshal(entryJSON, &target); err != nil {
				continue
			}
			for _, v := range target.Vulnerabilities {
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

// Target represents a target in a security report.
type Target struct {
	Vulnerabilities []*Vulnerability `json:"Vulnerabilities"`
}

// Vulnerability represents a vulnerability in a security report target.
type Vulnerability struct {
	VulnerabilityID string `json:"VulnerabilityID"`
	Severity        string `json:"Severity"`
}
