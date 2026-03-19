package scanner

import (
	"encoding/json"
	"testing"

	trivy "github.com/aquasecurity/trivy/pkg/types"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestBuildAlertDigest(t *testing.T) {
	t.Parallel()

	digestWithDuplicates := BuildAlertDigest(map[string]*trivy.Report{
		"image-a": mustParseReport(t, `
		{
			"Results": [
				{
					"Vulnerabilities": [
						{"VulnerabilityID": "CVE-1", "Severity": "HIGH"},
						{"VulnerabilityID": "CVE-2", "Severity": "CRITICAL"}
					]
				}
			]
		}
		`),
		"image-b": mustParseReport(t, `
		{
			"Results": [
				{
					"Vulnerabilities": [
						{"VulnerabilityID": "CVE-1", "Severity": "HIGH"},
						{"VulnerabilityID": "CVE-2", "Severity": "CRITICAL"}
					]
				}
			]
		}
		`),
	})
	digestNormalized := BuildAlertDigest(map[string]*trivy.Report{
		"image-a": mustParseReport(t, `
		{
			"Results": [
				{
					"Vulnerabilities": [
						{"VulnerabilityID": "CVE-1", "Severity": "HIGH"},
						{"VulnerabilityID": "CVE-2", "Severity": "CRITICAL"}
					]
				}
			]
		}
		`),
	})

	assert.Equal(t, digestNormalized, digestWithDuplicates)
}

func TestShouldNotifyOnNewOrEscalatedAlerts(t *testing.T) {
	t.Parallel()

	testCases := []struct {
		name                 string
		currentReports       map[string]*trivy.Report
		expectedErrMsg       string
		expectedShouldNotify bool
		previousReportJSON   []byte
	}{
		{
			name: "current report has no alerts",
			currentReports: map[string]*trivy.Report{
				"image-a": mustParseReport(t, `
				{
					"Results": [
						{
							"Vulnerabilities": [
								{"VulnerabilityID": "CVE-1", "Severity": "MEDIUM"}
							]
						}
					]
				}
				`),
			},
			expectedShouldNotify: false,
		},
		{
			name: "first alert detected",
			currentReports: map[string]*trivy.Report{
				"image-a": mustParseReport(t, `
				{
					"Results": [
						{
							"Vulnerabilities": [
								{"VulnerabilityID": "CVE-1", "Severity": "HIGH"}
							]
						}
					]
				}
				`),
			},
			expectedShouldNotify: true,
		},
		{
			name: "duplicate target churn does not notify",
			currentReports: map[string]*trivy.Report{
				"image-a": mustParseReport(t, `
				{
					"Results": [
						{
							"Vulnerabilities": [
								{"VulnerabilityID": "CVE-1", "Severity": "HIGH"}
							]
						}
					]
				}
				`),
				"image-b": mustParseReport(t, `
				{
					"Results": [
						{
							"Vulnerabilities": [
								{"VulnerabilityID": "CVE-1", "Severity": "HIGH"}
							]
						}
					]
				}
				`),
			},
			expectedShouldNotify: false,
			previousReportJSON: mustMarshalImagesReports(t, map[string]*trivy.Report{
				"image-a": mustParseReport(t, `
				{
					"Results": [
						{
							"Vulnerabilities": [
								{"VulnerabilityID": "CVE-1", "Severity": "HIGH"}
							]
						}
					]
				}
				`),
			}),
		},
		{
			name: "new alert notifies",
			currentReports: map[string]*trivy.Report{
				"image-a": mustParseReport(t, `
				{
					"Results": [
						{
							"Vulnerabilities": [
								{"VulnerabilityID": "CVE-1", "Severity": "HIGH"},
								{"VulnerabilityID": "CVE-2", "Severity": "HIGH"}
							]
						}
					]
				}
				`),
			},
			expectedShouldNotify: true,
			previousReportJSON: mustMarshalImagesReports(t, map[string]*trivy.Report{
				"image-a": mustParseReport(t, `
				{
					"Results": [
						{
							"Vulnerabilities": [
								{"VulnerabilityID": "CVE-1", "Severity": "HIGH"}
							]
						}
					]
				}
				`),
			}),
		},
		{
			name: "severity downgrade does not notify",
			currentReports: map[string]*trivy.Report{
				"image-a": mustParseReport(t, `
				{
					"Results": [
						{
							"Vulnerabilities": [
								{"VulnerabilityID": "CVE-1", "Severity": "HIGH"}
							]
						}
					]
				}
				`),
			},
			expectedShouldNotify: false,
			previousReportJSON: mustMarshalImagesReports(t, map[string]*trivy.Report{
				"image-a": mustParseReport(t, `
				{
					"Results": [
						{
							"Vulnerabilities": [
								{"VulnerabilityID": "CVE-1", "Severity": "CRITICAL"}
							]
						}
					]
				}
				`),
			}),
		},
		{
			name: "severity upgrade notifies",
			currentReports: map[string]*trivy.Report{
				"image-a": mustParseReport(t, `
				{
					"Results": [
						{
							"Vulnerabilities": [
								{"VulnerabilityID": "CVE-1", "Severity": "CRITICAL"}
							]
						}
					]
				}
				`),
			},
			expectedShouldNotify: true,
			previousReportJSON: mustMarshalImagesReports(t, map[string]*trivy.Report{
				"image-a": mustParseReport(t, `
				{
					"Results": [
						{
							"Vulnerabilities": [
								{"VulnerabilityID": "CVE-1", "Severity": "HIGH"}
							]
						}
					]
				}
				`),
			}),
		},
		{
			name: "removed alert does not notify",
			currentReports: map[string]*trivy.Report{
				"image-a": mustParseReport(t, `
				{
					"Results": [
						{
							"Vulnerabilities": [
								{"VulnerabilityID": "CVE-1", "Severity": "HIGH"}
							]
						}
					]
				}
				`),
			},
			expectedShouldNotify: false,
			previousReportJSON: mustMarshalImagesReports(t, map[string]*trivy.Report{
				"image-a": mustParseReport(t, `
				{
					"Results": [
						{
							"Vulnerabilities": [
								{"VulnerabilityID": "CVE-1", "Severity": "HIGH"},
								{"VulnerabilityID": "CVE-2", "Severity": "HIGH"}
							]
						}
					]
				}
				`),
			}),
		},
		{
			name: "invalid previous report",
			currentReports: map[string]*trivy.Report{
				"image-a": mustParseReport(t, `
				{
					"Results": [
						{
							"Vulnerabilities": [
								{"VulnerabilityID": "CVE-1", "Severity": "HIGH"}
							]
						}
					]
				}
				`),
			},
			expectedErrMsg:     "error unmarshalling previous security report",
			previousReportJSON: []byte(`{"invalid"`),
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			shouldNotify, err := ShouldNotifyOnNewOrEscalatedAlerts(
				tc.previousReportJSON,
				tc.currentReports,
			)

			if tc.expectedErrMsg != "" {
				require.Error(t, err)
				assert.Contains(t, err.Error(), tc.expectedErrMsg)
				return
			}

			require.NoError(t, err)
			assert.Equal(t, tc.expectedShouldNotify, shouldNotify)
		})
	}
}

// mustParseReport unmarshals a Trivy report fixture for tests.
func mustParseReport(t *testing.T, data string) *trivy.Report {
	t.Helper()

	var report *trivy.Report
	err := json.Unmarshal([]byte(data), &report)
	require.NoError(t, err)

	return report
}

// mustMarshalImagesReports marshals image reports into the stored JSON format.
func mustMarshalImagesReports(
	t *testing.T,
	imagesReports map[string]*trivy.Report,
) []byte {
	t.Helper()

	dataJSON, err := json.Marshal(imagesReports)
	require.NoError(t, err)

	return dataJSON
}
