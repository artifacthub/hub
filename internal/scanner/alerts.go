package scanner

import (
	"crypto/sha512"
	"encoding/json"
	"fmt"
	"sort"
	"strings"

	trivy "github.com/aquasecurity/trivy/pkg/types"
)

const (
	alertSeverityCritical = "CRITICAL"
	alertSeverityHigh     = "HIGH"
)

// BuildAlertDigest generates a digest from the normalized package-level high
// and critical alerts present in the images reports.
func BuildAlertDigest(imagesReports map[string]*trivy.Report) string {
	// Collapse repeated findings into a single package-level alert set
	alerts := normalizeAlertVulnerabilities(imagesReports)
	if len(alerts) == 0 {
		return ""
	}

	// Sort normalized alerts before hashing to keep the digest stable
	normalizedAlerts := make([]string, 0, len(alerts))
	for vulnerabilityID, severity := range alerts {
		normalizedAlerts = append(
			normalizedAlerts,
			fmt.Sprintf("[%s:%s]", severity, vulnerabilityID),
		)
	}
	sort.Strings(normalizedAlerts)

	return fmt.Sprintf(
		"%x",
		sha512.Sum512([]byte(strings.Join(normalizedAlerts, ""))),
	)
}

// ShouldNotifyOnNewOrEscalatedAlerts indicates if the current package-level
// high and critical alerts contain a new vulnerability or a severity upgrade.
func ShouldNotifyOnNewOrEscalatedAlerts(
	previousReportJSON []byte,
	imagesReports map[string]*trivy.Report,
) (bool, error) {
	// Normalize current alerts first so duplicate targets do not affect decisions
	currentAlerts := normalizeAlertVulnerabilities(imagesReports)
	if len(currentAlerts) == 0 {
		return false, nil
	}
	if isEmptySecurityReport(previousReportJSON) {
		return true, nil
	}

	// Decode the stored raw report and compare it using the same normalization
	var previousReports map[string]*trivy.Report
	if err := json.Unmarshal(previousReportJSON, &previousReports); err != nil {
		return false, fmt.Errorf(
			"error unmarshalling previous security report: %w",
			err,
		)
	}
	previousAlerts := normalizeAlertVulnerabilities(previousReports)
	for vulnerabilityID, severity := range currentAlerts {
		previousSeverity, ok := previousAlerts[vulnerabilityID]
		if !ok || isSeverityUpgrade(previousSeverity, severity) {
			return true, nil
		}
	}

	return false, nil
}

// isEmptySecurityReport indicates if the stored security report has no data.
func isEmptySecurityReport(reportJSON []byte) bool {
	// Normalize empty JSON payload representations produced by the database
	report := strings.TrimSpace(string(reportJSON))
	return report == "" || report == "{}" || report == "null"
}

// isSeverityUpgrade indicates if an alert moved from high to critical.
func isSeverityUpgrade(previousSeverity, currentSeverity string) bool {
	return previousSeverity == alertSeverityHigh &&
		currentSeverity == alertSeverityCritical
}

// normalizeAlertVulnerabilities builds the package-level alert set used by
// notification comparisons and digest generation.
func normalizeAlertVulnerabilities(
	imagesReports map[string]*trivy.Report,
) map[string]string {
	alerts := make(map[string]string)

	// Keep one entry per vulnerability and preserve the highest seen severity
	for _, imageReport := range imagesReports {
		if imageReport == nil {
			continue
		}
		for _, result := range imageReport.Results {
			for _, vulnerability := range result.Vulnerabilities {
				if vulnerability.VulnerabilityID == "" {
					continue
				}
				switch vulnerability.Severity {
				case alertSeverityCritical:
					alerts[vulnerability.VulnerabilityID] = vulnerability.Severity
				case alertSeverityHigh:
					if _, ok := alerts[vulnerability.VulnerabilityID]; !ok {
						alerts[vulnerability.VulnerabilityID] = vulnerability.Severity
					}
				}
			}
		}
	}

	return alerts
}
