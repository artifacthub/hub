package scanner

import (
	"context"
	"encoding/json"
	"errors"
	"testing"

	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/repo"
	"github.com/artifacthub/hub/internal/tests"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestScanSnapshot(t *testing.T) {
	ctx := context.Background()
	repositoryID := "00000000-0000-0000-0000-000000000001"
	packageID := "00000000-0000-0000-0000-000000000001"
	packageName := "pkg1"
	version := "1.0.0"
	image := "repo/image:tag"

	t.Run("error scanning image", func(t *testing.T) {
		t.Parallel()
		scannerMock := &Mock{}
		scannerMock.On("Scan", image).Return(nil, tests.ErrFake)
		ecMock := &repo.ErrorsCollectorMock{}
		ecMock.On("Init", repositoryID)
		ecMock.On("Append", repositoryID, "error scanning image repo/image:tag: fake error for tests (package pkg1:1.0.0)")

		snapshot := &hub.SnapshotToScan{
			RepositoryID: repositoryID,
			PackageID:    packageID,
			PackageName:  packageName,
			Version:      version,
			ContainersImages: []*hub.ContainerImage{
				{
					Image: image,
				},
			},
		}
		report, err := ScanSnapshot(ctx, scannerMock, snapshot, ecMock)
		require.True(t, errors.Is(err, tests.ErrFake))
		assert.Nil(t, report)
		scannerMock.AssertExpectations(t)
		ecMock.AssertExpectations(t)
	})

	t.Run("image not found", func(t *testing.T) {
		t.Parallel()
		scannerMock := &Mock{}
		scannerMock.On("Scan", image).Return(nil, ErrImageNotFound)
		ecMock := &repo.ErrorsCollectorMock{}
		ecMock.On("Init", repositoryID)
		ecMock.On("Append", repositoryID, "image not found: repo/image:tag (package pkg1:1.0.0)")

		snapshot := &hub.SnapshotToScan{
			RepositoryID: repositoryID,
			PackageID:    packageID,
			PackageName:  packageName,
			Version:      version,
			ContainersImages: []*hub.ContainerImage{
				{
					Image: image,
				},
			},
		}
		report, err := ScanSnapshot(ctx, scannerMock, snapshot, ecMock)
		require.Nil(t, err)
		assert.Equal(t, &hub.SnapshotSecurityReport{
			PackageID: packageID,
			Version:   version,
			Full:      nil,
			Summary:   nil,
		}, report)
		scannerMock.AssertExpectations(t)
		ecMock.AssertExpectations(t)
	})

	t.Run("error unmarshalling report", func(t *testing.T) {
		t.Parallel()
		scannerMock := &Mock{}
		scannerMock.On("Scan", image).Return(`invalid: "`, nil)
		ecMock := &repo.ErrorsCollectorMock{}
		ecMock.On("Init", repositoryID)

		snapshot := &hub.SnapshotToScan{
			RepositoryID: repositoryID,
			PackageID:    packageID,
			PackageName:  packageName,
			Version:      version,
			ContainersImages: []*hub.ContainerImage{
				{
					Image: image,
				},
			},
		}
		report, err := ScanSnapshot(ctx, scannerMock, snapshot, ecMock)
		require.Error(t, err)
		assert.Nil(t, report)
		scannerMock.AssertExpectations(t)
		ecMock.AssertExpectations(t)
	})

	t.Run("image report generated successfully", func(t *testing.T) {
		t.Parallel()
		scannerMock := &Mock{}
		scannerMock.On("Scan", image).Return(sampleReportData, nil)
		ecMock := &repo.ErrorsCollectorMock{}
		ecMock.On("Init", repositoryID)

		snapshot := &hub.SnapshotToScan{
			RepositoryID: repositoryID,
			PackageID:    packageID,
			PackageName:  packageName,
			Version:      version,
			ContainersImages: []*hub.ContainerImage{
				{
					Image: image,
				},
			},
		}
		report, err := ScanSnapshot(ctx, scannerMock, snapshot, ecMock)
		require.Nil(t, err)
		var expectedImageFullReport []interface{}
		err = json.Unmarshal(sampleReportData, &expectedImageFullReport)
		require.NoError(t, err)
		assert.Equal(t, &hub.SnapshotSecurityReport{
			PackageID: packageID,
			Version:   version,
			Full: map[string][]interface{}{
				image: expectedImageFullReport,
			},
			Summary: &hub.SecurityReportSummary{
				High:   8,
				Medium: 1,
			},
		}, report)
		scannerMock.AssertExpectations(t)
		ecMock.AssertExpectations(t)
	})
}

var sampleReportData = []byte(`
[
  {
    "Target": "artifacthub/hub:v0.7.0 (alpine 3.12.0)",
    "Type": "alpine",
    "Vulnerabilities": null
  },
  {
    "Target": "home/hub/web/yarn.lock",
    "Type": "yarn",
    "Vulnerabilities": [
      {
        "VulnerabilityID": "CVE-2020-13822",
        "PkgName": "elliptic",
        "InstalledVersion": "6.5.2",
        "FixedVersion": "6.5.3",
        "Layer": {
          "Digest": "sha256:e87ff7207519865cc1a4e87549731ea6f19be5e5fb00e8eb9559bf0ec804826f",
          "DiffID": "sha256:292691adbcc6d61785ff4f48b2eb9c26699141b7de6e43195dd8a15ce4e78802"
        },
        "SeveritySource": "nvd",
        "Title": "nodejs-elliptic: improper encoding checks allows a certain degree of signature malleability in ECDSA signatures",
        "Description": "The Elliptic package 6.5.2 for Node.js allows ECDSA signature malleability via variations in encoding, leading '\\0' bytes, or integer overflows. This could conceivably have a security-relevant impact if an application relied on a single canonical signature.",
        "Severity": "HIGH",
        "CweIDs": [
          "CWE-190"
        ],
        "CVSS": {
          "nvd": {
            "V2Vector": "AV:N/AC:M/Au:N/C:P/I:P/A:P",
            "V3Vector": "CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:L",
            "V2Score": 6.8,
            "V3Score": 7.7
          },
          "redhat": {
            "V3Vector": "CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:L",
            "V3Score": 7.7
          }
        },
        "References": [
          "https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2020-13822",
          "https://github.com/advisories/GHSA-vh7m-p724-62c2",
          "https://github.com/indutny/elliptic/issues/226",
          "https://medium.com/@herman_10687/malleability-attack-why-it-matters-7b5f59fb99a4",
          "https://nvd.nist.gov/vuln/detail/CVE-2020-13822",
          "https://snyk.io/vuln/SNYK-JS-ELLIPTIC-571484",
          "https://www.npmjs.com/package/elliptic",
          "https://yondon.blog/2019/01/01/how-not-to-use-ecdsa/"
        ],
        "PublishedDate": "2020-06-04T15:15:00Z",
        "LastModifiedDate": "2020-07-02T13:17:00Z"
      },
      {
        "VulnerabilityID": "GHSA-6x33-pw7p-hmpq",
        "PkgName": "http-proxy",
        "InstalledVersion": "1.18.0",
        "FixedVersion": "1.18.1",
        "Layer": {
          "Digest": "sha256:e87ff7207519865cc1a4e87549731ea6f19be5e5fb00e8eb9559bf0ec804826f",
          "DiffID": "sha256:292691adbcc6d61785ff4f48b2eb9c26699141b7de6e43195dd8a15ce4e78802"
        },
        "Title": "Denial of Service in http-proxy",
        "Description": "",
        "Severity": "HIGH",
        "References": [
          "https://github.com/advisories/GHSA-6x33-pw7p-hmpq",
          "https://github.com/http-party/node-http-proxy/pull/1447/files"
        ]
      },
      {
        "VulnerabilityID": "CVE-2020-8203",
        "PkgName": "lodash",
        "InstalledVersion": "4.17.15",
        "FixedVersion": "4.17.19",
        "Layer": {
          "Digest": "sha256:e87ff7207519865cc1a4e87549731ea6f19be5e5fb00e8eb9559bf0ec804826f",
          "DiffID": "sha256:292691adbcc6d61785ff4f48b2eb9c26699141b7de6e43195dd8a15ce4e78802"
        },
        "SeveritySource": "nvd",
        "Title": "nodejs-lodash: prototype pollution in zipObjectDeep function",
        "Description": "Prototype pollution attack when using _.zipObjectDeep in lodash \u003c= 4.17.15.",
        "Severity": "HIGH",
        "CweIDs": [
          "CWE-770"
        ],
        "CVSS": {
          "nvd": {
            "V2Vector": "AV:N/AC:M/Au:N/C:N/I:P/A:P",
            "V3Vector": "CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:N/I:H/A:H",
            "V2Score": 5.8,
            "V3Score": 7.4
          },
          "redhat": {
            "V3Vector": "CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:N/I:H/A:H",
            "V3Score": 7.4
          }
        },
        "References": [
          "https://github.com/advisories/GHSA-p6mc-m468-83gw",
          "https://github.com/lodash/lodash/issues/4874",
          "https://hackerone.com/reports/712065",
          "https://nvd.nist.gov/vuln/detail/CVE-2020-8203",
          "https://security.netapp.com/advisory/ntap-20200724-0006/",
          "https://www.npmjs.com/advisories/1523"
        ],
        "PublishedDate": "2020-07-15T17:15:00Z",
        "LastModifiedDate": "2020-08-17T16:49:00Z"
      },
      {
        "VulnerabilityID": "NSWG-ECO-516",
        "PkgName": "lodash",
        "InstalledVersion": "4.17.15",
        "FixedVersion": "\u003e=4.17.19",
        "Layer": {
          "Digest": "sha256:e87ff7207519865cc1a4e87549731ea6f19be5e5fb00e8eb9559bf0ec804826f",
          "DiffID": "sha256:292691adbcc6d61785ff4f48b2eb9c26699141b7de6e43195dd8a15ce4e78802"
        },
        "SeveritySource": "nodejs-security-wg",
        "Title": "Allocation of Resources Without Limits or Throttling",
        "Description": "Prototype pollution attack (lodash)",
        "Severity": "HIGH",
        "References": [
          "https://github.com/lodash/lodash/pull/4759",
          "https://hackerone.com/reports/712065",
          "https://www.npmjs.com/advisories/1523"
        ]
      },
      {
        "VulnerabilityID": "CVE-2020-15168",
        "PkgName": "node-fetch",
        "InstalledVersion": "2.6.0",
        "FixedVersion": "3.0.0-beta.9, 2.6.1",
        "Layer": {
          "Digest": "sha256:e87ff7207519865cc1a4e87549731ea6f19be5e5fb00e8eb9559bf0ec804826f",
          "DiffID": "sha256:292691adbcc6d61785ff4f48b2eb9c26699141b7de6e43195dd8a15ce4e78802"
        },
        "SeveritySource": "nvd",
        "Title": "node-fetch: size of data after fetch() JS thread leads to DoS",
        "Description": "node-fetch before versions 2.6.1 and 3.0.0-beta.9 did not honor the size option after following a redirect, which means that when a content size was over the limit, a FetchError would never get thrown and the process would end without failure. For most people, this fix will have a little or no impact. However, if you are relying on node-fetch to gate files above a size, the impact could be significant, for example: If you don't double-check the size of the data after fetch() has completed, your JS thread could get tied up doing work on a large file (DoS) and/or cost you money in computing.",
        "Severity": "MEDIUM",
        "CweIDs": [
          "CWE-770"
        ],
        "CVSS": {
          "nvd": {
            "V2Vector": "AV:N/AC:L/Au:N/C:N/I:N/A:P",
            "V3Vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:L",
            "V2Score": 5,
            "V3Score": 5.3
          },
          "redhat": {
            "V3Vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:L",
            "V3Score": 5.3
          }
        },
        "References": [
          "https://github.com/advisories/GHSA-w7rc-rwvf-8q5r",
          "https://github.com/node-fetch/node-fetch/security/advisories/GHSA-w7rc-rwvf-8q5r",
          "https://nvd.nist.gov/vuln/detail/CVE-2020-15168",
          "https://www.npmjs.com/package/node-fetch"
        ],
        "PublishedDate": "2020-09-10T19:15:00Z",
        "LastModifiedDate": "2020-09-17T20:21:00Z"
      },
      {
        "VulnerabilityID": "CVE-2020-7720",
        "PkgName": "node-forge",
        "InstalledVersion": "0.9.0",
        "FixedVersion": "0.10.0",
        "Layer": {
          "Digest": "sha256:e87ff7207519865cc1a4e87549731ea6f19be5e5fb00e8eb9559bf0ec804826f",
          "DiffID": "sha256:292691adbcc6d61785ff4f48b2eb9c26699141b7de6e43195dd8a15ce4e78802"
        },
        "SeveritySource": "nvd",
        "Title": "nodejs-node-forge: prototype pollution via the util.setPath function",
        "Description": "The package node-forge before 0.10.0 is vulnerable to Prototype Pollution via the util.setPath function. Note: Version 0.10.0 is a breaking change removing the vulnerable functions.",
        "Severity": "HIGH",
        "CweIDs": [
          "CWE-20"
        ],
        "CVSS": {
          "nvd": {
            "V2Vector": "AV:N/AC:L/Au:N/C:P/I:P/A:P",
            "V3Vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:L",
            "V2Score": 7.5,
            "V3Score": 7.3
          },
          "redhat": {
            "V3Vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:L",
            "V3Score": 7.3
          }
        },
        "References": [
          "https://github.com/advisories/GHSA-92xj-mqp7-vmcj",
          "https://github.com/digitalbazaar/forge/blob/master/CHANGELOG.md",
          "https://nvd.nist.gov/vuln/detail/CVE-2020-7720",
          "https://snyk.io/vuln/SNYK-JAVA-ORGWEBJARSNPM-609293",
          "https://snyk.io/vuln/SNYK-JS-NODEFORGE-598677"
        ],
        "PublishedDate": "2020-09-01T10:15:00Z",
        "LastModifiedDate": "2020-09-04T15:12:00Z"
      },
      {
        "VulnerabilityID": "CVE-2020-15256",
        "PkgName": "object-path",
        "InstalledVersion": "0.11.4",
        "FixedVersion": "0.11.5",
        "Layer": {
          "Digest": "sha256:e87ff7207519865cc1a4e87549731ea6f19be5e5fb00e8eb9559bf0ec804826f",
          "DiffID": "sha256:292691adbcc6d61785ff4f48b2eb9c26699141b7de6e43195dd8a15ce4e78802"
        },
        "Title": "Prototype pollution in object-path",
        "Description": "",
        "Severity": "HIGH",
        "CweIDs": [
          "CWE-20",
          "CWE-471"
        ],
        "References": [
          "https://github.com/advisories/GHSA-cwx2-736x-mf6w",
          "https://github.com/mariocasciaro/object-path/commit/2be3354c6c46215c7635eb1b76d80f1319403c68",
          "https://github.com/mariocasciaro/object-path/security/advisories/GHSA-cwx2-736x-mf6w",
          "https://nvd.nist.gov/vuln/detail/CVE-2020-15256"
        ],
        "PublishedDate": "2020-10-19T22:15:00Z",
        "LastModifiedDate": "2020-10-19T22:15:00Z"
      },
      {
        "VulnerabilityID": "CVE-2020-7660",
        "PkgName": "serialize-javascript",
        "InstalledVersion": "2.1.2",
        "FixedVersion": "3.1.0",
        "Layer": {
          "Digest": "sha256:e87ff7207519865cc1a4e87549731ea6f19be5e5fb00e8eb9559bf0ec804826f",
          "DiffID": "sha256:292691adbcc6d61785ff4f48b2eb9c26699141b7de6e43195dd8a15ce4e78802"
        },
        "SeveritySource": "nvd",
        "Title": "npm-serialize-javascript: allows remote attackers to inject arbitrary code via the function deleteFunctions within index.js",
        "Description": "serialize-javascript prior to 3.1.0 allows remote attackers to inject arbitrary code via the function \"deleteFunctions\" within \"index.js\".",
        "Severity": "HIGH",
        "CweIDs": [
          "CWE-502"
        ],
        "CVSS": {
          "nvd": {
            "V2Vector": "AV:N/AC:M/Au:N/C:P/I:P/A:P",
            "V3Vector": "CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:H",
            "V2Score": 6.8,
            "V3Score": 8.1
          },
          "redhat": {
            "V3Vector": "CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:H",
            "V3Score": 8.1
          }
        },
        "References": [
          "https://github.com/advisories/GHSA-hxcc-f52p-wc94",
          "https://github.com/yahoo/serialize-javascript/commit/f21a6fb3ace2353413761e79717b2d210ba6ccbd",
          "https://nvd.nist.gov/vuln/detail/CVE-2020-7660"
        ],
        "PublishedDate": "2020-06-01T15:15:00Z",
        "LastModifiedDate": "2020-06-08T16:35:00Z"
      },
      {
        "VulnerabilityID": "CVE-2020-7662",
        "PkgName": "websocket-extensions",
        "InstalledVersion": "0.1.3",
        "FixedVersion": "0.1.4",
        "Layer": {
          "Digest": "sha256:e87ff7207519865cc1a4e87549731ea6f19be5e5fb00e8eb9559bf0ec804826f",
          "DiffID": "sha256:292691adbcc6d61785ff4f48b2eb9c26699141b7de6e43195dd8a15ce4e78802"
        },
        "SeveritySource": "nvd",
        "Title": "npmjs-websocket-extensions: ReDoS vulnerability in Sec-WebSocket-Extensions parser",
        "Description": "websocket-extensions npm module prior to 1.0.4 allows Denial of Service (DoS) via Regex Backtracking. The extension parser may take quadratic time when parsing a header containing an unclosed string parameter value whose content is a repeating two-byte sequence of a backslash and some other character. This could be abused by an attacker to conduct Regex Denial Of Service (ReDoS) on a single-threaded server by providing a malicious payload with the Sec-WebSocket-Extensions header.",
        "Severity": "HIGH",
        "CVSS": {
          "nvd": {
            "V2Vector": "AV:N/AC:L/Au:N/C:N/I:N/A:P",
            "V3Vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H",
            "V2Score": 5,
            "V3Score": 7.5
          },
          "redhat": {
            "V3Vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H",
            "V3Score": 7.5
          }
        },
        "References": [
          "https://blog.jcoglan.com/2020/06/02/redos-vulnerability-in-websocket-extensions",
          "https://github.com/advisories/GHSA-g78m-2chm-r7qv",
          "https://github.com/faye/websocket-extensions-node/commit/29496f6838bfadfe5a2f85dff33ed0ba33873237",
          "https://github.com/faye/websocket-extensions-node/security/advisories/GHSA-g78m-2chm-r7qv",
          "https://nvd.nist.gov/vuln/detail/CVE-2020-7662",
          "https://snyk.io/vuln/SNYK-JS-WEBSOCKETEXTENSIONS-570623"
        ],
        "PublishedDate": "2020-06-02T19:15:00Z",
        "LastModifiedDate": "2020-06-04T16:41:00Z"
      }
    ]
  }
]
`)
