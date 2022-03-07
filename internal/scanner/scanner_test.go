package scanner

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"testing"

	trivy "github.com/aquasecurity/trivy/pkg/types"
	"github.com/artifacthub/hub/internal/hub"
	"github.com/artifacthub/hub/internal/repo"
	"github.com/spf13/viper"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestScan(t *testing.T) {
	ctx := context.Background()
	cfg := viper.New()
	cfg.Set("scanner.trivyURL", "http://localhost:8081")
	repositoryID := "00000000-0000-0000-0000-000000000001"
	packageID := "00000000-0000-0000-0000-000000000001"
	packageName := "pkg1"
	version := "1.0.0"
	image := "repo/image:tag"
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

	t.Run("error scanning image", func(t *testing.T) {
		testCases := []struct {
			scanError           error
			expectedLoggedError string
		}{
			{
				ErrImageNotFound,
				"error scanning image repo/image:tag: image not found (package pkg1:1.0.0)",
			},
			{
				ErrSchemaV1NotSupported,
				"error scanning image repo/image:tag: schema v1 manifest not supported by trivy (package pkg1:1.0.0)",
			},
		}
		for _, tc := range testCases {
			tc := tc
			t.Run(tc.scanError.Error(), func(t *testing.T) {
				t.Parallel()
				ecMock := &repo.ErrorsCollectorMock{}
				ecMock.On("Init", repositoryID)
				ecMock.On("Append", repositoryID, tc.expectedLoggedError)
				isMock := &ImageScannerMock{}
				isMock.On("ScanImage", image).Return(nil, tc.scanError)
				s := New(ctx, cfg, ecMock, WithImageScanner(isMock))

				report, err := s.Scan(snapshot)
				assert.True(t, errors.Is(err, tc.scanError))
				assert.Equal(t, &hub.SnapshotSecurityReport{
					PackageID: packageID,
					Version:   version,
				}, report)
				isMock.AssertExpectations(t)
				ecMock.AssertExpectations(t)
			})
		}
	})

	t.Run("error unmarshalling image report", func(t *testing.T) {
		t.Parallel()
		ecMock := &repo.ErrorsCollectorMock{}
		ecMock.On("Init", repositoryID)
		isMock := &ImageScannerMock{}
		isMock.On("ScanImage", image).Return(`invalid: "`, nil)
		s := New(ctx, cfg, ecMock, WithImageScanner(isMock))

		report, err := s.Scan(snapshot)
		require.Error(t, err)
		assert.True(t, strings.HasPrefix(err.Error(), "error unmarshalling"))
		assert.Equal(t, &hub.SnapshotSecurityReport{
			PackageID: packageID,
			Version:   version,
		}, report)
		isMock.AssertExpectations(t)
		ecMock.AssertExpectations(t)
	})

	t.Run("image report returned no results", func(t *testing.T) {
		t.Parallel()
		ecMock := &repo.ErrorsCollectorMock{}
		ecMock.On("Init", repositoryID)
		isMock := &ImageScannerMock{}
		isMock.On("ScanImage", image).Return(sampleReport1Data, nil)
		s := New(ctx, cfg, ecMock, WithImageScanner(isMock))

		report, err := s.Scan(snapshot)
		require.Nil(t, err)
		var expectedImageFullReport *trivy.Report
		err = json.Unmarshal(sampleReport1Data, &expectedImageFullReport)
		require.NoError(t, err)
		assert.Equal(t, &hub.SnapshotSecurityReport{
			PackageID: packageID,
			Version:   version,
		}, report)
		isMock.AssertExpectations(t)
		ecMock.AssertExpectations(t)
	})

	t.Run("image report generated successfully", func(t *testing.T) {
		t.Parallel()
		ecMock := &repo.ErrorsCollectorMock{}
		ecMock.On("Init", repositoryID)
		isMock := &ImageScannerMock{}
		isMock.On("ScanImage", image).Return(sampleReport2Data, nil)
		s := New(ctx, cfg, ecMock, WithImageScanner(isMock))

		report, err := s.Scan(snapshot)
		require.Nil(t, err)
		var expectedImageFullReport *trivy.Report
		err = json.Unmarshal(sampleReport2Data, &expectedImageFullReport)
		require.NoError(t, err)
		assert.Equal(t, &hub.SnapshotSecurityReport{
			PackageID:   packageID,
			Version:     version,
			AlertDigest: "a53cf4b4d20faac813dd30d4ed017df345f5675f5f83b52517d229e0c7fdbf5aa89e7a8b7dbc809164352af539990df894bf52824709605fe6fe289133843e1c",
			ImagesReports: map[string]*trivy.Report{
				image: expectedImageFullReport,
			},
			Summary: &hub.SecurityReportSummary{
				High:   3,
				Medium: 1,
			},
		}, report)
		isMock.AssertExpectations(t)
		ecMock.AssertExpectations(t)
	})
}

var sampleReport1Data = []byte(`
{
  "SchemaVersion": 2,
  "ArtifactName": "artifacthub/hub:v1.0.0",
  "ArtifactType": "container_image",
  "Metadata": {
    "OS": {
      "Family": "alpine",
      "Name": "3.13.5"
    },
    "RepoTags": [
      "artifacthub/hub:v1.0.0"
    ],
    "RepoDigests": [
      "artifacthub/hub@sha256:becb8e06fb01f0324dabac05d700755bcd324071e66ebf4bc10151e356de9c71"
    ]
  }
}
`)

var sampleReport2Data = []byte(`
{
  "SchemaVersion": 2,
  "ArtifactName": "artifacthub/hub:v1.0.0",
  "ArtifactType": "container_image",
  "Metadata": {
    "OS": {
      "Family": "alpine",
      "Name": "3.13.5"
    },
    "RepoTags": [
      "artifacthub/hub:v1.0.0"
    ],
    "RepoDigests": [
      "artifacthub/hub@sha256:becb8e06fb01f0324dabac05d700755bcd324071e66ebf4bc10151e356de9c71"
    ]
  },
  "Results": [
    {
      "Target": "artifacthub/hub:v1.0.0 (alpine 3.13.5)",
      "Class": "os-pkgs",
      "Type": "alpine"
    },
    {
      "Target": "home/hub/hub",
      "Class": "lang-pkgs",
      "Type": "gobinary",
      "Vulnerabilities": [
        {
          "VulnerabilityID": "CVE-2017-11468",
          "PkgName": "github.com/docker/distribution",
          "InstalledVersion": "v0.0.0-20191216044856-a8371794149d",
          "FixedVersion": "v2.7.0-rc.0+incompatible",
          "Layer": {
            "Digest": "sha256:5e6adef17f723fff566994a8e35003066b700e80962ab9674d979a41672ca521",
            "DiffID": "sha256:154557fb91cce66accd08103f7ba2084db5531051c0c56cf7ccd478839ac9c60"
          },
          "SeveritySource": "nvd",
          "PrimaryURL": "https://avd.aquasec.com/nvd/cve-2017-11468",
          "Title": "docker-distribution: Does not properly restrict the amount of content accepted from a user",
          "Description": "Docker Registry before 2.6.2 in Docker Distribution does not properly restrict the amount of content accepted from a user, which allows remote attackers to cause a denial of service (memory consumption) via the manifest endpoint.",
          "Severity": "HIGH",
          "CweIDs": [
            "CWE-770"
          ],
          "CVSS": {
            "nvd": {
              "V2Vector": "AV:N/AC:L/Au:N/C:N/I:N/A:P",
              "V3Vector": "CVSS:3.0/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H",
              "V2Score": 5,
              "V3Score": 7.5
            },
            "redhat": {
              "V3Vector": "CVSS:3.0/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:L",
              "V3Score": 5.3
            }
          },
          "References": [
            "http://lists.opensuse.org/opensuse-security-announce/2020-09/msg00047.html",
            "https://access.redhat.com/errata/RHSA-2017:2603",
            "https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2017-11468",
            "https://github.com/docker/distribution/pull/2340",
            "https://github.com/docker/distribution/releases/tag/v2.6.2"
          ],
          "PublishedDate": "2017-07-20T23:29:00Z",
          "LastModifiedDate": "2020-09-18T19:15:00Z"
        },
        {
          "VulnerabilityID": "CVE-2019-16884",
          "PkgName": "github.com/opencontainers/runc",
          "InstalledVersion": "v0.1.1",
          "FixedVersion": "v1.0.0-rc8.0.20190930145003-cad42f6e0932",
          "Layer": {
            "Digest": "sha256:5e6adef17f723fff566994a8e35003066b700e80962ab9674d979a41672ca521",
            "DiffID": "sha256:154557fb91cce66accd08103f7ba2084db5531051c0c56cf7ccd478839ac9c60"
          },
          "SeveritySource": "nvd",
          "PrimaryURL": "https://avd.aquasec.com/nvd/cve-2019-16884",
          "Title": "runc: AppArmor/SELinux bypass with malicious image that specifies a volume at /proc",
          "Description": "runc through 1.0.0-rc8, as used in Docker through 19.03.2-ce and other products, allows AppArmor restriction bypass because libcontainer/rootfs_linux.go incorrectly checks mount targets, and thus a malicious Docker image can mount over a /proc directory.",
          "Severity": "HIGH",
          "CweIDs": [
            "CWE-863"
          ],
          "CVSS": {
            "nvd": {
              "V2Vector": "AV:N/AC:L/Au:N/C:N/I:P/A:N",
              "V3Vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:H/A:N",
              "V2Score": 5,
              "V3Score": 7.5
            },
            "redhat": {
              "V3Vector": "CVSS:3.0/AV:L/AC:L/PR:L/UI:N/S:C/C:N/I:H/A:N",
              "V3Score": 6.5
            }
          },
          "References": [
            "http://lists.opensuse.org/opensuse-security-announce/2019-10/msg00073.html",
            "http://lists.opensuse.org/opensuse-security-announce/2019-11/msg00009.html",
            "http://lists.opensuse.org/opensuse-security-announce/2020-01/msg00010.html",
            "https://access.redhat.com/errata/RHSA-2019:3940",
            "https://access.redhat.com/errata/RHSA-2019:4074",
            "https://access.redhat.com/errata/RHSA-2019:4269",
            "https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2019-16884",
            "https://github.com/opencontainers/runc/issues/2128",
            "https://linux.oracle.com/cve/CVE-2019-16884.html",
            "https://linux.oracle.com/errata/ELSA-2019-4269.html",
            "https://lists.fedoraproject.org/archives/list/package-announce@lists.fedoraproject.org/message/62OQ2P7K5YDZ5BRCH2Q6DHUJIHQD3QCD/",
            "https://lists.fedoraproject.org/archives/list/package-announce@lists.fedoraproject.org/message/DGK6IV5JGVDXHOXEKJOJWKOVNZLT6MYR/",
            "https://lists.fedoraproject.org/archives/list/package-announce@lists.fedoraproject.org/message/SPK4JWP32BUIVDJ3YODZSOEVEW6BHQCF/",
            "https://nvd.nist.gov/vuln/detail/CVE-2019-16884",
            "https://security.gentoo.org/glsa/202003-21",
            "https://ubuntu.com/security/notices/USN-4297-1",
            "https://usn.ubuntu.com/4297-1/"
          ],
          "PublishedDate": "2019-09-25T18:15:00Z",
          "LastModifiedDate": "2019-10-08T03:15:00Z"
        },
        {
          "VulnerabilityID": "CVE-2019-19921",
          "PkgName": "github.com/opencontainers/runc",
          "InstalledVersion": "v0.1.1",
          "FixedVersion": "v1.0.0-rc9.0.20200122160610-2fc03cc11c77",
          "Layer": {
            "Digest": "sha256:5e6adef17f723fff566994a8e35003066b700e80962ab9674d979a41672ca521",
            "DiffID": "sha256:154557fb91cce66accd08103f7ba2084db5531051c0c56cf7ccd478839ac9c60"
          },
          "SeveritySource": "nvd",
          "PrimaryURL": "https://avd.aquasec.com/nvd/cve-2019-19921",
          "Title": "runc: volume mount race condition with shared mounts leads to information leak/integrity manipulation",
          "Description": "runc through 1.0.0-rc9 has Incorrect Access Control leading to Escalation of Privileges, related to libcontainer/rootfs_linux.go. To exploit this, an attacker must be able to spawn two containers with custom volume-mount configurations, and be able to run custom images. (This vulnerability does not affect Docker due to an implementation detail that happens to block the attack.)",
          "Severity": "HIGH",
          "CweIDs": [
            "CWE-706"
          ],
          "CVSS": {
            "nvd": {
              "V2Vector": "AV:L/AC:M/Au:N/C:P/I:P/A:P",
              "V3Vector": "CVSS:3.1/AV:L/AC:H/PR:L/UI:N/S:U/C:H/I:H/A:H",
              "V2Score": 4.4,
              "V3Score": 7
            },
            "redhat": {
              "V3Vector": "CVSS:3.1/AV:L/AC:H/PR:L/UI:N/S:U/C:H/I:H/A:H",
              "V3Score": 7
            }
          },
          "References": [
            "http://lists.opensuse.org/opensuse-security-announce/2020-02/msg00018.html",
            "https://access.redhat.com/errata/RHSA-2020:0688",
            "https://access.redhat.com/errata/RHSA-2020:0695",
            "https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2019-19921",
            "https://gist.github.com/LiveOverflow/c937820b688922eb127fb760ce06dab9",
            "https://github.com/opencontainers/runc/issues/2197",
            "https://github.com/opencontainers/runc/pull/2190",
            "https://github.com/opencontainers/runc/pull/2207",
            "https://github.com/opencontainers/runc/releases",
            "https://security-tracker.debian.org/tracker/CVE-2019-19921",
            "https://security.gentoo.org/glsa/202003-21",
            "https://ubuntu.com/security/notices/USN-4297-1",
            "https://usn.ubuntu.com/4297-1/"
          ],
          "PublishedDate": "2020-02-12T15:15:00Z",
          "LastModifiedDate": "2020-03-11T22:26:00Z"
        }
      ]
    },
    {
      "Target": "home/hub/web/yarn.lock",
      "Class": "lang-pkgs",
      "Type": "yarn",
      "Vulnerabilities": [
        {
          "VulnerabilityID": "CVE-2021-32723",
          "PkgName": "prismjs",
          "InstalledVersion": "1.23.0",
          "FixedVersion": "1.24.0",
          "Layer": {
            "Digest": "sha256:cd4e35bc3f7424a8d1f16a514d753e98559539ac7e914d48848d518d2ee519f9",
            "DiffID": "sha256:3b6992ea06441aef54d5b302284fcfe9221d1c1c4e3cae4b5858cced2f21cac9"
          },
          "SeveritySource": "nvd",
          "PrimaryURL": "https://avd.aquasec.com/nvd/cve-2021-32723",
          "Title": "npm-prismjs: a malicious (long) string will take a long time to highlight may result in ReDoS",
          "Description": "Prism is a syntax highlighting library. Some languages before 1.24.0 are vulnerable to Regular Expression Denial of Service (ReDoS). When Prism is used to highlight untrusted (user-given) text, an attacker can craft a string that will take a very very long time to highlight. This problem has been fixed in Prism v1.24. As a workaround, do not use ASCIIDoc or ERB to highlight untrusted text. Other languages are not affected and can be used to highlight untrusted text.",
          "Severity": "MEDIUM",
          "CweIDs": [
            "CWE-400"
          ],
          "CVSS": {
            "nvd": {
              "V2Vector": "AV:N/AC:M/Au:N/C:N/I:N/A:P",
              "V3Vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:N/I:N/A:H",
              "V2Score": 4.3,
              "V3Score": 6.5
            },
            "redhat": {
              "V3Vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:N/I:N/A:H",
              "V3Score": 6.5
            }
          },
          "References": [
            "https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2021-32723",
            "https://github.com/PrismJS/prism/pull/2688",
            "https://github.com/PrismJS/prism/pull/2774",
            "https://github.com/PrismJS/prism/security/advisories/GHSA-gj77-59wh-66hg",
            "https://github.com/advisories/GHSA-gj77-59wh-66hg",
            "https://nvd.nist.gov/vuln/detail/CVE-2021-32723"
          ],
          "PublishedDate": "2021-06-28T20:15:00Z",
          "LastModifiedDate": "2021-07-02T15:57:00Z"
        }
      ]
    }
  ]
}
`)
