import { SecurityReport, VulnerabilitySeverity } from '../types';
import checkIfOldVulnerabilities from './checkIfOldVulnerabilities';

interface Test {
  title: string;
  input: {
    report: SecurityReport;
    oldThreshold: number;
  };
  result: boolean;
}

const tests: Test[] = [
  { title: 'empty report', input: { report: {}, oldThreshold: 2 }, result: false },
  {
    title: 'only recent vulnerabilities',
    input: {
      report: {
        'quay.io/jetstack/cert-manager-webhook:v1.10.0': {
          Results: [
            {
              Type: 'debian',
              Target: 'quay.io/jetstack/cert-manager-webhook:v1.10.0 (debian 11.5)',
              Vulnerabilities: [],
            },
            {
              Type: 'gobinary',
              Target: 'app/cmd/webhook/webhook',
              Vulnerabilities: [
                {
                  CVSS: { nvd: { V3Score: 7.5, V3Vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H' } },
                  Layer: {
                    DiffID: 'sha256:002652e5c179500bcb06986020c069b3f699cc4f6f5f9b5108a42e9539d4ee08',
                    Digest: 'sha256:842780859203bdf9901566e980b169740100ae043113776440cd8009adfcc69a',
                  },
                  Title:
                    'golang: golang.org/x/text/language: ParseAcceptLanguage takes a long time to parse complex tags',
                  CweIDs: ['CWE-772'],
                  PkgName: 'golang.org/x/text',
                  Severity: VulnerabilitySeverity.High,
                  DataSource: {
                    ID: 'go-vulndb',
                    URL: 'https://github.com/golang/vulndb',
                    Name: 'The Go Vulnerability Database',
                  },
                  PrimaryURL: 'https://avd.aquasec.com/nvd/cve-2022-32149',
                  References: [
                    'https://access.redhat.com/security/cve/CVE-2022-32149',
                    'https://go.dev/cl/442235',
                    'https://go.dev/issue/56152',
                    'https://groups.google.com/g/golang-announce/c/-hjNw559_tE/m/KlGTfid5CAAJ',
                    'https://groups.google.com/g/golang-dev/c/qfPIly0X7aU',
                    'https://pkg.go.dev/vuln/GO-2022-1059',
                  ],
                  Description:
                    'An attacker may cause a denial of service by crafting an Accept-Language header which ParseAcceptLanguage will take significant time to parse.',
                  FixedVersion: '0.3.8',
                  PublishedDate: '2022-10-14T15:15:00Z',
                  SeveritySource: 'nvd',
                  VulnerabilityID: 'CVE-2022-32149',
                  InstalledVersion: 'v0.3.7',
                  LastModifiedDate: '2022-10-18T17:41:00Z',
                },
              ],
            },
          ],
        },
        'quay.io/jetstack/cert-manager-cainjector:v1.10.0': {
          Results: [
            {
              Type: 'debian',
              Target: 'quay.io/jetstack/cert-manager-cainjector:v1.10.0 (debian 11.5)',
              Vulnerabilities: [],
            },
            {
              Type: 'gobinary',
              Target: 'app/cmd/cainjector/cainjector',
              Vulnerabilities: [
                {
                  CVSS: { nvd: { V3Score: 7.5, V3Vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H' } },
                  Layer: {
                    DiffID: 'sha256:d7b53b485f3b00ad6ecc5f653b041822132e22e1e0f09132c70c5b1aed5d722f',
                    Digest: 'sha256:967b87101ad2ce0ed54b2d88a6eea4023007934f0de47baa0d8760585d43f6ef',
                  },
                  Title:
                    'golang: golang.org/x/text/language: ParseAcceptLanguage takes a long time to parse complex tags',
                  CweIDs: ['CWE-772'],
                  PkgName: 'golang.org/x/text',
                  Severity: VulnerabilitySeverity.High,
                  DataSource: {
                    ID: 'go-vulndb',
                    URL: 'https://github.com/golang/vulndb',
                    Name: 'The Go Vulnerability Database',
                  },
                  PrimaryURL: 'https://avd.aquasec.com/nvd/cve-2022-32149',
                  References: [
                    'https://access.redhat.com/security/cve/CVE-2022-32149',
                    'https://go.dev/cl/442235',
                    'https://go.dev/issue/56152',
                    'https://groups.google.com/g/golang-announce/c/-hjNw559_tE/m/KlGTfid5CAAJ',
                    'https://groups.google.com/g/golang-dev/c/qfPIly0X7aU',
                    'https://pkg.go.dev/vuln/GO-2022-1059',
                  ],
                  Description:
                    'An attacker may cause a denial of service by crafting an Accept-Language header which ParseAcceptLanguage will take significant time to parse.',
                  FixedVersion: '0.3.8',
                  PublishedDate: '2022-10-14T15:15:00Z',
                  SeveritySource: 'nvd',
                  VulnerabilityID: 'CVE-2022-32149',
                  InstalledVersion: 'v0.3.7',
                  LastModifiedDate: '2022-10-18T17:41:00Z',
                },
              ],
            },
          ],
        },
        'quay.io/jetstack/cert-manager-controller:v1.10.0': {
          Results: [
            {
              Type: 'debian',
              Target: 'quay.io/jetstack/cert-manager-controller:v1.10.0 (debian 11.5)',
              Vulnerabilities: [],
            },
            {
              Type: 'gobinary',
              Target: 'app/cmd/controller/controller',
              Vulnerabilities: [
                {
                  CVSS: { nvd: { V3Score: 7.5, V3Vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H' } },
                  Layer: {
                    DiffID: 'sha256:06a3a97a7b63241e5595f04c73e83ac21499a236e33360e5b0ace3534505db11',
                    Digest: 'sha256:73a5853f02715f2dc1eb75e31714bc6a8038b749d179990c576fcda7c060af2d',
                  },
                  Title:
                    'golang: golang.org/x/text/language: ParseAcceptLanguage takes a long time to parse complex tags',
                  CweIDs: ['CWE-772'],
                  PkgName: 'golang.org/x/text',
                  Severity: VulnerabilitySeverity.High,
                  DataSource: {
                    ID: 'go-vulndb',
                    URL: 'https://github.com/golang/vulndb',
                    Name: 'The Go Vulnerability Database',
                  },
                  PrimaryURL: 'https://avd.aquasec.com/nvd/cve-2022-32149',
                  References: [
                    'https://access.redhat.com/security/cve/CVE-2022-32149',
                    'https://go.dev/cl/442235',
                    'https://go.dev/issue/56152',
                    'https://groups.google.com/g/golang-announce/c/-hjNw559_tE/m/KlGTfid5CAAJ',
                    'https://groups.google.com/g/golang-dev/c/qfPIly0X7aU',
                    'https://pkg.go.dev/vuln/GO-2022-1059',
                  ],
                  Description:
                    'An attacker may cause a denial of service by crafting an Accept-Language header which ParseAcceptLanguage will take significant time to parse.',
                  FixedVersion: '0.3.8',
                  PublishedDate: '2022-10-14T15:15:00Z',
                  SeveritySource: 'nvd',
                  VulnerabilityID: 'CVE-2022-32149',
                  InstalledVersion: 'v0.3.7',
                  LastModifiedDate: '2022-10-18T17:41:00Z',
                },
              ],
            },
          ],
        },
      },
      oldThreshold: 2,
    },
    result: false,
  },
  {
    title: 'one old high vulnerability',
    input: {
      report: {
        'quay.io/jetstack/cert-manager-webhook:v1.10.0': {
          Results: [
            {
              Type: 'debian',
              Target: 'quay.io/jetstack/cert-manager-webhook:v1.10.0 (debian 11.5)',
              Vulnerabilities: [],
            },
            {
              Type: 'gobinary',
              Target: 'app/cmd/webhook/webhook',
              Vulnerabilities: [
                {
                  CVSS: { nvd: { V3Score: 7.5, V3Vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H' } },
                  Layer: {
                    DiffID: 'sha256:002652e5c179500bcb06986020c069b3f699cc4f6f5f9b5108a42e9539d4ee08',
                    Digest: 'sha256:842780859203bdf9901566e980b169740100ae043113776440cd8009adfcc69a',
                  },
                  Title:
                    'golang: golang.org/x/text/language: ParseAcceptLanguage takes a long time to parse complex tags',
                  CweIDs: ['CWE-772'],
                  PkgName: 'golang.org/x/text',
                  Severity: VulnerabilitySeverity.High,
                  DataSource: {
                    ID: 'go-vulndb',
                    URL: 'https://github.com/golang/vulndb',
                    Name: 'The Go Vulnerability Database',
                  },
                  PrimaryURL: 'https://avd.aquasec.com/nvd/cve-2022-32149',
                  References: [
                    'https://access.redhat.com/security/cve/CVE-2022-32149',
                    'https://go.dev/cl/442235',
                    'https://go.dev/issue/56152',
                    'https://groups.google.com/g/golang-announce/c/-hjNw559_tE/m/KlGTfid5CAAJ',
                    'https://groups.google.com/g/golang-dev/c/qfPIly0X7aU',
                    'https://pkg.go.dev/vuln/GO-2022-1059',
                  ],
                  Description:
                    'An attacker may cause a denial of service by crafting an Accept-Language header which ParseAcceptLanguage will take significant time to parse.',
                  FixedVersion: '0.3.8',
                  PublishedDate: '2022-10-14T15:15:00Z',
                  SeveritySource: 'nvd',
                  VulnerabilityID: 'CVE-2022-32149',
                  InstalledVersion: 'v0.3.7',
                  LastModifiedDate: '2022-10-18T17:41:00Z',
                },
              ],
            },
          ],
        },
        'quay.io/jetstack/cert-manager-cainjector:v1.10.0': {
          Results: [
            {
              Type: 'debian',
              Target: 'quay.io/jetstack/cert-manager-cainjector:v1.10.0 (debian 11.5)',
              Vulnerabilities: [],
            },
            {
              Type: 'gobinary',
              Target: 'app/cmd/cainjector/cainjector',
              Vulnerabilities: [
                {
                  CVSS: { nvd: { V3Score: 7.5, V3Vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H' } },
                  Layer: {
                    DiffID: 'sha256:d7b53b485f3b00ad6ecc5f653b041822132e22e1e0f09132c70c5b1aed5d722f',
                    Digest: 'sha256:967b87101ad2ce0ed54b2d88a6eea4023007934f0de47baa0d8760585d43f6ef',
                  },
                  Title:
                    'golang: golang.org/x/text/language: ParseAcceptLanguage takes a long time to parse complex tags',
                  CweIDs: ['CWE-772'],
                  PkgName: 'golang.org/x/text',
                  Severity: VulnerabilitySeverity.High,
                  DataSource: {
                    ID: 'go-vulndb',
                    URL: 'https://github.com/golang/vulndb',
                    Name: 'The Go Vulnerability Database',
                  },
                  PrimaryURL: 'https://avd.aquasec.com/nvd/cve-2022-32149',
                  References: [
                    'https://access.redhat.com/security/cve/CVE-2022-32149',
                    'https://go.dev/cl/442235',
                    'https://go.dev/issue/56152',
                    'https://groups.google.com/g/golang-announce/c/-hjNw559_tE/m/KlGTfid5CAAJ',
                    'https://groups.google.com/g/golang-dev/c/qfPIly0X7aU',
                    'https://pkg.go.dev/vuln/GO-2022-1059',
                  ],
                  Description:
                    'An attacker may cause a denial of service by crafting an Accept-Language header which ParseAcceptLanguage will take significant time to parse.',
                  FixedVersion: '0.3.8',
                  PublishedDate: '2020-10-14T15:15:00Z',
                  SeveritySource: 'nvd',
                  VulnerabilityID: 'CVE-2022-32149',
                  InstalledVersion: 'v0.3.7',
                  LastModifiedDate: '2022-10-18T17:41:00Z',
                },
              ],
            },
          ],
        },
        'quay.io/jetstack/cert-manager-controller:v1.10.0': {
          Results: [
            {
              Type: 'debian',
              Target: 'quay.io/jetstack/cert-manager-controller:v1.10.0 (debian 11.5)',
              Vulnerabilities: [],
            },
            {
              Type: 'gobinary',
              Target: 'app/cmd/controller/controller',
              Vulnerabilities: [
                {
                  CVSS: { nvd: { V3Score: 7.5, V3Vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H' } },
                  Layer: {
                    DiffID: 'sha256:06a3a97a7b63241e5595f04c73e83ac21499a236e33360e5b0ace3534505db11',
                    Digest: 'sha256:73a5853f02715f2dc1eb75e31714bc6a8038b749d179990c576fcda7c060af2d',
                  },
                  Title:
                    'golang: golang.org/x/text/language: ParseAcceptLanguage takes a long time to parse complex tags',
                  CweIDs: ['CWE-772'],
                  PkgName: 'golang.org/x/text',
                  Severity: VulnerabilitySeverity.High,
                  DataSource: {
                    ID: 'go-vulndb',
                    URL: 'https://github.com/golang/vulndb',
                    Name: 'The Go Vulnerability Database',
                  },
                  PrimaryURL: 'https://avd.aquasec.com/nvd/cve-2022-32149',
                  References: [
                    'https://access.redhat.com/security/cve/CVE-2022-32149',
                    'https://go.dev/cl/442235',
                    'https://go.dev/issue/56152',
                    'https://groups.google.com/g/golang-announce/c/-hjNw559_tE/m/KlGTfid5CAAJ',
                    'https://groups.google.com/g/golang-dev/c/qfPIly0X7aU',
                    'https://pkg.go.dev/vuln/GO-2022-1059',
                  ],
                  Description:
                    'An attacker may cause a denial of service by crafting an Accept-Language header which ParseAcceptLanguage will take significant time to parse.',
                  FixedVersion: '0.3.8',
                  PublishedDate: '2022-10-14T15:15:00Z',
                  SeveritySource: 'nvd',
                  VulnerabilityID: 'CVE-2022-32149',
                  InstalledVersion: 'v0.3.7',
                  LastModifiedDate: '2022-10-18T17:41:00Z',
                },
              ],
            },
          ],
        },
      },
      oldThreshold: 2,
    },
    result: true,
  },
  {
    title: 'one old critical vulnerability',
    input: {
      report: {
        'quay.io/jetstack/cert-manager-webhook:v1.10.0': {
          Results: [
            {
              Type: 'debian',
              Target: 'quay.io/jetstack/cert-manager-webhook:v1.10.0 (debian 11.5)',
              Vulnerabilities: [],
            },
            {
              Type: 'gobinary',
              Target: 'app/cmd/webhook/webhook',
              Vulnerabilities: [
                {
                  CVSS: { nvd: { V3Score: 7.5, V3Vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H' } },
                  Layer: {
                    DiffID: 'sha256:002652e5c179500bcb06986020c069b3f699cc4f6f5f9b5108a42e9539d4ee08',
                    Digest: 'sha256:842780859203bdf9901566e980b169740100ae043113776440cd8009adfcc69a',
                  },
                  Title:
                    'golang: golang.org/x/text/language: ParseAcceptLanguage takes a long time to parse complex tags',
                  CweIDs: ['CWE-772'],
                  PkgName: 'golang.org/x/text',
                  Severity: VulnerabilitySeverity.High,
                  DataSource: {
                    ID: 'go-vulndb',
                    URL: 'https://github.com/golang/vulndb',
                    Name: 'The Go Vulnerability Database',
                  },
                  PrimaryURL: 'https://avd.aquasec.com/nvd/cve-2022-32149',
                  References: [
                    'https://access.redhat.com/security/cve/CVE-2022-32149',
                    'https://go.dev/cl/442235',
                    'https://go.dev/issue/56152',
                    'https://groups.google.com/g/golang-announce/c/-hjNw559_tE/m/KlGTfid5CAAJ',
                    'https://groups.google.com/g/golang-dev/c/qfPIly0X7aU',
                    'https://pkg.go.dev/vuln/GO-2022-1059',
                  ],
                  Description:
                    'An attacker may cause a denial of service by crafting an Accept-Language header which ParseAcceptLanguage will take significant time to parse.',
                  FixedVersion: '0.3.8',
                  PublishedDate: '2022-10-14T15:15:00Z',
                  SeveritySource: 'nvd',
                  VulnerabilityID: 'CVE-2022-32149',
                  InstalledVersion: 'v0.3.7',
                  LastModifiedDate: '2022-10-18T17:41:00Z',
                },
              ],
            },
          ],
        },
        'quay.io/jetstack/cert-manager-cainjector:v1.10.0': {
          Results: [
            {
              Type: 'debian',
              Target: 'quay.io/jetstack/cert-manager-cainjector:v1.10.0 (debian 11.5)',
              Vulnerabilities: [],
            },
            {
              Type: 'gobinary',
              Target: 'app/cmd/cainjector/cainjector',
              Vulnerabilities: [
                {
                  CVSS: { nvd: { V3Score: 7.5, V3Vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H' } },
                  Layer: {
                    DiffID: 'sha256:d7b53b485f3b00ad6ecc5f653b041822132e22e1e0f09132c70c5b1aed5d722f',
                    Digest: 'sha256:967b87101ad2ce0ed54b2d88a6eea4023007934f0de47baa0d8760585d43f6ef',
                  },
                  Title:
                    'golang: golang.org/x/text/language: ParseAcceptLanguage takes a long time to parse complex tags',
                  CweIDs: ['CWE-772'],
                  PkgName: 'golang.org/x/text',
                  Severity: VulnerabilitySeverity.Critical,
                  DataSource: {
                    ID: 'go-vulndb',
                    URL: 'https://github.com/golang/vulndb',
                    Name: 'The Go Vulnerability Database',
                  },
                  PrimaryURL: 'https://avd.aquasec.com/nvd/cve-2022-32149',
                  References: [
                    'https://access.redhat.com/security/cve/CVE-2022-32149',
                    'https://go.dev/cl/442235',
                    'https://go.dev/issue/56152',
                    'https://groups.google.com/g/golang-announce/c/-hjNw559_tE/m/KlGTfid5CAAJ',
                    'https://groups.google.com/g/golang-dev/c/qfPIly0X7aU',
                    'https://pkg.go.dev/vuln/GO-2022-1059',
                  ],
                  Description:
                    'An attacker may cause a denial of service by crafting an Accept-Language header which ParseAcceptLanguage will take significant time to parse.',
                  FixedVersion: '0.3.8',
                  PublishedDate: '2020-10-14T15:15:00Z',
                  SeveritySource: 'nvd',
                  VulnerabilityID: 'CVE-2022-32149',
                  InstalledVersion: 'v0.3.7',
                  LastModifiedDate: '2022-10-18T17:41:00Z',
                },
              ],
            },
          ],
        },
        'quay.io/jetstack/cert-manager-controller:v1.10.0': {
          Results: [
            {
              Type: 'debian',
              Target: 'quay.io/jetstack/cert-manager-controller:v1.10.0 (debian 11.5)',
              Vulnerabilities: [],
            },
            {
              Type: 'gobinary',
              Target: 'app/cmd/controller/controller',
              Vulnerabilities: [
                {
                  CVSS: { nvd: { V3Score: 7.5, V3Vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H' } },
                  Layer: {
                    DiffID: 'sha256:06a3a97a7b63241e5595f04c73e83ac21499a236e33360e5b0ace3534505db11',
                    Digest: 'sha256:73a5853f02715f2dc1eb75e31714bc6a8038b749d179990c576fcda7c060af2d',
                  },
                  Title:
                    'golang: golang.org/x/text/language: ParseAcceptLanguage takes a long time to parse complex tags',
                  CweIDs: ['CWE-772'],
                  PkgName: 'golang.org/x/text',
                  Severity: VulnerabilitySeverity.High,
                  DataSource: {
                    ID: 'go-vulndb',
                    URL: 'https://github.com/golang/vulndb',
                    Name: 'The Go Vulnerability Database',
                  },
                  PrimaryURL: 'https://avd.aquasec.com/nvd/cve-2022-32149',
                  References: [
                    'https://access.redhat.com/security/cve/CVE-2022-32149',
                    'https://go.dev/cl/442235',
                    'https://go.dev/issue/56152',
                    'https://groups.google.com/g/golang-announce/c/-hjNw559_tE/m/KlGTfid5CAAJ',
                    'https://groups.google.com/g/golang-dev/c/qfPIly0X7aU',
                    'https://pkg.go.dev/vuln/GO-2022-1059',
                  ],
                  Description:
                    'An attacker may cause a denial of service by crafting an Accept-Language header which ParseAcceptLanguage will take significant time to parse.',
                  FixedVersion: '0.3.8',
                  PublishedDate: '2022-10-14T15:15:00Z',
                  SeveritySource: 'nvd',
                  VulnerabilityID: 'CVE-2022-32149',
                  InstalledVersion: 'v0.3.7',
                  LastModifiedDate: '2022-10-18T17:41:00Z',
                },
              ],
            },
          ],
        },
      },
      oldThreshold: 2,
    },
    result: true,
  },
  {
    title: 'old vulnerabilities are not Critical or High',
    input: {
      report: {
        'quay.io/jetstack/cert-manager-webhook:v1.10.0': {
          Results: [
            {
              Type: 'debian',
              Target: 'quay.io/jetstack/cert-manager-webhook:v1.10.0 (debian 11.5)',
              Vulnerabilities: [],
            },
            {
              Type: 'gobinary',
              Target: 'app/cmd/webhook/webhook',
              Vulnerabilities: [
                {
                  CVSS: { nvd: { V3Score: 7.5, V3Vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H' } },
                  Layer: {
                    DiffID: 'sha256:002652e5c179500bcb06986020c069b3f699cc4f6f5f9b5108a42e9539d4ee08',
                    Digest: 'sha256:842780859203bdf9901566e980b169740100ae043113776440cd8009adfcc69a',
                  },
                  Title:
                    'golang: golang.org/x/text/language: ParseAcceptLanguage takes a long time to parse complex tags',
                  CweIDs: ['CWE-772'],
                  PkgName: 'golang.org/x/text',
                  Severity: VulnerabilitySeverity.Low,
                  DataSource: {
                    ID: 'go-vulndb',
                    URL: 'https://github.com/golang/vulndb',
                    Name: 'The Go Vulnerability Database',
                  },
                  PrimaryURL: 'https://avd.aquasec.com/nvd/cve-2022-32149',
                  References: [
                    'https://access.redhat.com/security/cve/CVE-2022-32149',
                    'https://go.dev/cl/442235',
                    'https://go.dev/issue/56152',
                    'https://groups.google.com/g/golang-announce/c/-hjNw559_tE/m/KlGTfid5CAAJ',
                    'https://groups.google.com/g/golang-dev/c/qfPIly0X7aU',
                    'https://pkg.go.dev/vuln/GO-2022-1059',
                  ],
                  Description:
                    'An attacker may cause a denial of service by crafting an Accept-Language header which ParseAcceptLanguage will take significant time to parse.',
                  FixedVersion: '0.3.8',
                  PublishedDate: '2020-10-14T15:15:00Z',
                  SeveritySource: 'nvd',
                  VulnerabilityID: 'CVE-2022-32149',
                  InstalledVersion: 'v0.3.7',
                  LastModifiedDate: '2022-10-18T17:41:00Z',
                },
              ],
            },
          ],
        },
        'quay.io/jetstack/cert-manager-cainjector:v1.10.0': {
          Results: [
            {
              Type: 'debian',
              Target: 'quay.io/jetstack/cert-manager-cainjector:v1.10.0 (debian 11.5)',
              Vulnerabilities: [],
            },
            {
              Type: 'gobinary',
              Target: 'app/cmd/cainjector/cainjector',
              Vulnerabilities: [
                {
                  CVSS: { nvd: { V3Score: 7.5, V3Vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H' } },
                  Layer: {
                    DiffID: 'sha256:d7b53b485f3b00ad6ecc5f653b041822132e22e1e0f09132c70c5b1aed5d722f',
                    Digest: 'sha256:967b87101ad2ce0ed54b2d88a6eea4023007934f0de47baa0d8760585d43f6ef',
                  },
                  Title:
                    'golang: golang.org/x/text/language: ParseAcceptLanguage takes a long time to parse complex tags',
                  CweIDs: ['CWE-772'],
                  PkgName: 'golang.org/x/text',
                  Severity: VulnerabilitySeverity.Medium,
                  DataSource: {
                    ID: 'go-vulndb',
                    URL: 'https://github.com/golang/vulndb',
                    Name: 'The Go Vulnerability Database',
                  },
                  PrimaryURL: 'https://avd.aquasec.com/nvd/cve-2022-32149',
                  References: [
                    'https://access.redhat.com/security/cve/CVE-2022-32149',
                    'https://go.dev/cl/442235',
                    'https://go.dev/issue/56152',
                    'https://groups.google.com/g/golang-announce/c/-hjNw559_tE/m/KlGTfid5CAAJ',
                    'https://groups.google.com/g/golang-dev/c/qfPIly0X7aU',
                    'https://pkg.go.dev/vuln/GO-2022-1059',
                  ],
                  Description:
                    'An attacker may cause a denial of service by crafting an Accept-Language header which ParseAcceptLanguage will take significant time to parse.',
                  FixedVersion: '0.3.8',
                  PublishedDate: '2020-10-14T15:15:00Z',
                  SeveritySource: 'nvd',
                  VulnerabilityID: 'CVE-2022-32149',
                  InstalledVersion: 'v0.3.7',
                  LastModifiedDate: '2022-10-18T17:41:00Z',
                },
              ],
            },
          ],
        },
        'quay.io/jetstack/cert-manager-controller:v1.10.0': {
          Results: [
            {
              Type: 'debian',
              Target: 'quay.io/jetstack/cert-manager-controller:v1.10.0 (debian 11.5)',
              Vulnerabilities: [],
            },
            {
              Type: 'gobinary',
              Target: 'app/cmd/controller/controller',
              Vulnerabilities: [
                {
                  CVSS: { nvd: { V3Score: 7.5, V3Vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H' } },
                  Layer: {
                    DiffID: 'sha256:06a3a97a7b63241e5595f04c73e83ac21499a236e33360e5b0ace3534505db11',
                    Digest: 'sha256:73a5853f02715f2dc1eb75e31714bc6a8038b749d179990c576fcda7c060af2d',
                  },
                  Title:
                    'golang: golang.org/x/text/language: ParseAcceptLanguage takes a long time to parse complex tags',
                  CweIDs: ['CWE-772'],
                  PkgName: 'golang.org/x/text',
                  Severity: VulnerabilitySeverity.High,
                  DataSource: {
                    ID: 'go-vulndb',
                    URL: 'https://github.com/golang/vulndb',
                    Name: 'The Go Vulnerability Database',
                  },
                  PrimaryURL: 'https://avd.aquasec.com/nvd/cve-2022-32149',
                  References: [
                    'https://access.redhat.com/security/cve/CVE-2022-32149',
                    'https://go.dev/cl/442235',
                    'https://go.dev/issue/56152',
                    'https://groups.google.com/g/golang-announce/c/-hjNw559_tE/m/KlGTfid5CAAJ',
                    'https://groups.google.com/g/golang-dev/c/qfPIly0X7aU',
                    'https://pkg.go.dev/vuln/GO-2022-1059',
                  ],
                  Description:
                    'An attacker may cause a denial of service by crafting an Accept-Language header which ParseAcceptLanguage will take significant time to parse.',
                  FixedVersion: '0.3.8',
                  PublishedDate: '2022-10-14T15:15:00Z',
                  SeveritySource: 'nvd',
                  VulnerabilityID: 'CVE-2022-32149',
                  InstalledVersion: 'v0.3.7',
                  LastModifiedDate: '2022-10-18T17:41:00Z',
                },
              ],
            },
          ],
        },
      },
      oldThreshold: 2,
    },
    result: false,
  },
  {
    title: 'when some old vulnerabilities',
    input: {
      report: {
        'quay.io/jetstack/cert-manager-webhook:v1.10.0': {
          Results: [
            {
              Type: 'debian',
              Target: 'quay.io/jetstack/cert-manager-webhook:v1.10.0 (debian 11.5)',
              Vulnerabilities: [],
            },
            {
              Type: 'gobinary',
              Target: 'app/cmd/webhook/webhook',
              Vulnerabilities: [
                {
                  CVSS: { nvd: { V3Score: 7.5, V3Vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H' } },
                  Layer: {
                    DiffID: 'sha256:002652e5c179500bcb06986020c069b3f699cc4f6f5f9b5108a42e9539d4ee08',
                    Digest: 'sha256:842780859203bdf9901566e980b169740100ae043113776440cd8009adfcc69a',
                  },
                  Title:
                    'golang: golang.org/x/text/language: ParseAcceptLanguage takes a long time to parse complex tags',
                  CweIDs: ['CWE-772'],
                  PkgName: 'golang.org/x/text',
                  Severity: VulnerabilitySeverity.High,
                  DataSource: {
                    ID: 'go-vulndb',
                    URL: 'https://github.com/golang/vulndb',
                    Name: 'The Go Vulnerability Database',
                  },
                  PrimaryURL: 'https://avd.aquasec.com/nvd/cve-2022-32149',
                  References: [
                    'https://access.redhat.com/security/cve/CVE-2022-32149',
                    'https://go.dev/cl/442235',
                    'https://go.dev/issue/56152',
                    'https://groups.google.com/g/golang-announce/c/-hjNw559_tE/m/KlGTfid5CAAJ',
                    'https://groups.google.com/g/golang-dev/c/qfPIly0X7aU',
                    'https://pkg.go.dev/vuln/GO-2022-1059',
                  ],
                  Description:
                    'An attacker may cause a denial of service by crafting an Accept-Language header which ParseAcceptLanguage will take significant time to parse.',
                  FixedVersion: '0.3.8',
                  PublishedDate: '2022-10-14T15:15:00Z',
                  SeveritySource: 'nvd',
                  VulnerabilityID: 'CVE-2022-32149',
                  InstalledVersion: 'v0.3.7',
                  LastModifiedDate: '2022-10-18T17:41:00Z',
                },
              ],
            },
          ],
        },
        'quay.io/jetstack/cert-manager-cainjector:v1.10.0': {
          Results: [
            {
              Type: 'debian',
              Target: 'quay.io/jetstack/cert-manager-cainjector:v1.10.0 (debian 11.5)',
              Vulnerabilities: [],
            },
            {
              Type: 'gobinary',
              Target: 'app/cmd/cainjector/cainjector',
              Vulnerabilities: [
                {
                  CVSS: { nvd: { V3Score: 7.5, V3Vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H' } },
                  Layer: {
                    DiffID: 'sha256:d7b53b485f3b00ad6ecc5f653b041822132e22e1e0f09132c70c5b1aed5d722f',
                    Digest: 'sha256:967b87101ad2ce0ed54b2d88a6eea4023007934f0de47baa0d8760585d43f6ef',
                  },
                  Title:
                    'golang: golang.org/x/text/language: ParseAcceptLanguage takes a long time to parse complex tags',
                  CweIDs: ['CWE-772'],
                  PkgName: 'golang.org/x/text',
                  Severity: VulnerabilitySeverity.High,
                  DataSource: {
                    ID: 'go-vulndb',
                    URL: 'https://github.com/golang/vulndb',
                    Name: 'The Go Vulnerability Database',
                  },
                  PrimaryURL: 'https://avd.aquasec.com/nvd/cve-2022-32149',
                  References: [
                    'https://access.redhat.com/security/cve/CVE-2022-32149',
                    'https://go.dev/cl/442235',
                    'https://go.dev/issue/56152',
                    'https://groups.google.com/g/golang-announce/c/-hjNw559_tE/m/KlGTfid5CAAJ',
                    'https://groups.google.com/g/golang-dev/c/qfPIly0X7aU',
                    'https://pkg.go.dev/vuln/GO-2022-1059',
                  ],
                  Description:
                    'An attacker may cause a denial of service by crafting an Accept-Language header which ParseAcceptLanguage will take significant time to parse.',
                  FixedVersion: '0.3.8',
                  PublishedDate: '2022-10-14T15:15:00Z',
                  SeveritySource: 'nvd',
                  VulnerabilityID: 'CVE-2022-32149',
                  InstalledVersion: 'v0.3.7',
                  LastModifiedDate: '2022-10-18T17:41:00Z',
                },
              ],
            },
          ],
        },
        'quay.io/jetstack/cert-manager-controller:v1.10.0': {
          Results: [
            {
              Type: 'debian',
              Target: 'quay.io/jetstack/cert-manager-controller:v1.10.0 (debian 11.5)',
              Vulnerabilities: [],
            },
            {
              Type: 'gobinary',
              Target: 'app/cmd/controller/controller',
              Vulnerabilities: [
                {
                  CVSS: { nvd: { V3Score: 7.5, V3Vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H' } },
                  Layer: {
                    DiffID: 'sha256:06a3a97a7b63241e5595f04c73e83ac21499a236e33360e5b0ace3534505db11',
                    Digest: 'sha256:73a5853f02715f2dc1eb75e31714bc6a8038b749d179990c576fcda7c060af2d',
                  },
                  Title:
                    'golang: golang.org/x/text/language: ParseAcceptLanguage takes a long time to parse complex tags',
                  CweIDs: ['CWE-772'],
                  PkgName: 'golang.org/x/text',
                  Severity: VulnerabilitySeverity.High,
                  DataSource: {
                    ID: 'go-vulndb',
                    URL: 'https://github.com/golang/vulndb',
                    Name: 'The Go Vulnerability Database',
                  },
                  PrimaryURL: 'https://avd.aquasec.com/nvd/cve-2022-32149',
                  References: [
                    'https://access.redhat.com/security/cve/CVE-2022-32149',
                    'https://go.dev/cl/442235',
                    'https://go.dev/issue/56152',
                    'https://groups.google.com/g/golang-announce/c/-hjNw559_tE/m/KlGTfid5CAAJ',
                    'https://groups.google.com/g/golang-dev/c/qfPIly0X7aU',
                    'https://pkg.go.dev/vuln/GO-2022-1059',
                  ],
                  Description:
                    'An attacker may cause a denial of service by crafting an Accept-Language header which ParseAcceptLanguage will take significant time to parse.',
                  FixedVersion: '0.3.8',
                  PublishedDate: '2022-08-14T15:15:00Z',
                  SeveritySource: 'nvd',
                  VulnerabilityID: 'CVE-2022-32149',
                  InstalledVersion: 'v0.3.7',
                  LastModifiedDate: '2022-10-18T17:41:00Z',
                },
              ],
            },
          ],
        },
      },
      oldThreshold: 0.1,
    },
    result: true,
  },
];

describe('checkIfOldVulnerabilities', () => {
  let dateNowSpy: any;

  beforeEach(() => {
    dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => 1666943574000);
  });

  afterAll(() => {
    dateNowSpy.mockRestore();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  for (let i = 0; i < tests.length; i++) {
    it(`returns if vulnerabilities are older than ${tests[i].input.oldThreshold} years when ${tests[i].title}`, () => {
      const result = checkIfOldVulnerabilities(tests[i].input.report, tests[i].input.oldThreshold);
      expect(result).toEqual(tests[i].result);
    });
  }
});
