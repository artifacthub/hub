import { SecurityReportSummary, Vulnerability, VulnerabilitySeverity } from '../types';
import formatSecurityReport from './formatSecurityReport';

interface Tests {
  input: Vulnerability[];
  output: { list: Vulnerability[]; summary: SecurityReportSummary };
}

const tests: Tests[] = [
  {
    input: [
      {
        PkgName: 'bash',
        Severity: VulnerabilitySeverity.High,
        VulnerabilityID: 'CVE-2019-18176',
        InstalledVersion: '4.4.19-10.el8',
      },
      {
        PkgName: 'bash',
        Severity: VulnerabilitySeverity.Critical,
        VulnerabilityID: 'CVE-2019-18276',
        InstalledVersion: '4.4.19-10.el8',
      },
    ],
    output: {
      list: [
        {
          PkgName: 'bash',
          Severity: VulnerabilitySeverity.Critical,
          VulnerabilityID: 'CVE-2019-18276',
          InstalledVersion: '4.4.19-10.el8',
        },
        {
          PkgName: 'bash',
          Severity: VulnerabilitySeverity.High,
          VulnerabilityID: 'CVE-2019-18176',
          InstalledVersion: '4.4.19-10.el8',
        },
      ],
      summary: { critical: 0, high: 0, low: 0, medium: 0, unknown: 0 },
    },
  },
  {
    input: [
      {
        PkgName: 'glib2',
        Severity: VulnerabilitySeverity.Critical,
        VulnerabilityID: 'CVE-2019-17276',
        InstalledVersion: '4.4.19-10.el8',
      },
      {
        PkgName: 'bash',
        Severity: VulnerabilitySeverity.High,
        VulnerabilityID: 'CVE-2019-18176',
        InstalledVersion: '4.4.19-10.el8',
      },
      {
        PkgName: 'bash',
        Severity: VulnerabilitySeverity.Critical,
        VulnerabilityID: 'CVE-2019-18276',
        InstalledVersion: '4.4.19-10.el8',
      },
    ],
    output: {
      list: [
        {
          PkgName: 'bash',
          Severity: VulnerabilitySeverity.Critical,
          VulnerabilityID: 'CVE-2019-18276',
          InstalledVersion: '4.4.19-10.el8',
        },
        {
          PkgName: 'glib2',
          Severity: VulnerabilitySeverity.Critical,
          VulnerabilityID: 'CVE-2019-17276',
          InstalledVersion: '4.4.19-10.el8',
        },
        {
          PkgName: 'bash',
          Severity: VulnerabilitySeverity.High,
          VulnerabilityID: 'CVE-2019-18176',
          InstalledVersion: '4.4.19-10.el8',
        },
      ],
      summary: { critical: 0, high: 0, low: 0, medium: 0, unknown: 0 },
    },
  },
  {
    input: [
      {
        CVSS: {
          nvd: {
            V2Score: 5.8,
            V3Score: 7.4,
            V2Vector: 'AV:N/AC:M/Au:N/C:N/I:P/A:P',
            V3Vector: 'CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:N/I:H/A:H',
          },
          redhat: {
            V3Score: 7.4,
            V3Vector: 'CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:N/I:H/A:H',
          },
        },
        Layer: {
          DiffID: 'sha256:662009dcc4193ef33f9b4b4f8f158c8a0ce2b0f019ef8ad12b108e1659e949dc',
          Digest: 'sha256:58b827811b460cc81672b1baf09b8188971ccd7a551fc6d95446ffc63bec449f',
        },
        Title: 'nodejs-lodash: prototype pollution in zipObjectDeep function',
        PkgName: 'lodash',
        Severity: VulnerabilitySeverity.Medium,
        References: [
          'https://github.com/advisories/GHSA-p6mc-m468-83gw',
          'https://github.com/lodash/lodash/issues/4874',
          'https://hackerone.com/reports/712065',
          'https://nvd.nist.gov/vuln/detail/CVE-2020-8203',
          'https://security.netapp.com/advisory/ntap-20200724-0006/',
          'https://www.npmjs.com/advisories/1523',
        ],
        Description: 'Prototype pollution attack when using _.zipObjectDeep in lodash <= 4.17.15.',
        FixedVersion: '4.17.19',
        SeveritySource: 'nvd',
        VulnerabilityID: 'CVE-2020-8203',
        InstalledVersion: '4.17.14',
      },
      {
        Layer: {
          DiffID: 'sha256:662009dcc4193ef33f9b4b4f8f158c8a0ce2b0f019ef8ad12b108e1659e949dc',
          Digest: 'sha256:58b827811b460cc81672b1baf09b8188971ccd7a551fc6d95446ffc63bec449f',
        },
        Title: 'Denial of Service in mem',
        PkgName: 'mem',
        Severity: VulnerabilitySeverity.Low,
        References: [
          'https://github.com/advisories/GHSA-4xcv-9jjx-gfj3',
          'https://github.com/sindresorhus/mem/commit/da4e4398cb27b602de3bd55f746efa9b4a31702b',
        ],
        Description:
          "Versions of `mem` prior to 4.0.0 are vulnerable to Denial of Service (DoS).  The package fails to remove old values from the cache even after a value passes its `maxAge` property. This may allow attackers to exhaust the system's memory if they are able to abuse the application logging.\n\n\n## Recommendation\n\nUpgrade to version 4.0.0 or later.",
        FixedVersion: '4.0.0',
        VulnerabilityID: 'GHSA-4xcv-9jjx-gfj3',
        InstalledVersion: '1.1.0',
      },
      {
        Layer: {
          DiffID: 'sha256:662009dcc4193ef33f9b4b4f8f158c8a0ce2b0f019ef8ad12b108e1659e949dc',
          Digest: 'sha256:58b827811b460cc81672b1baf09b8188971ccd7a551fc6d95446ffc63bec449f',
        },
        Title: 'Prototype Pollution in yargs-parser',
        PkgName: 'yargs-parser',
        Severity: VulnerabilitySeverity.Low,
        References: [
          'https://github.com/advisories/GHSA-p9pc-299p-vxgp',
          'https://snyk.io/vuln/SNYK-JS-YARGSPARSER-560381',
        ],
        Description:
          "Affected versions of `yargs-parser` are vulnerable to prototype pollution. Arguments are not properly sanitized, allowing an attacker to modify the prototype of `Object`, causing the addition or modification of an existing property that will exist on all objects.  \nParsing the argument `--foo.__proto__.bar baz'` adds a `bar` property with value `baz` to all objects. This is only exploitable if attackers have control over the arguments being passed to `yargs-parser`.\n\n\n\n## Recommendation\n\nUpgrade to versions 13.1.2, 15.0.1, 18.1.1 or later.",
        FixedVersion: '18.1.2, 15.0.1, 13.1.2',
        VulnerabilityID: 'GHSA-p9pc-299p-vxgp',
        InstalledVersion: '8.1.0',
      },
    ],
    output: {
      list: [
        {
          CVSS: {
            nvd: {
              V2Score: 5.8,
              V3Score: 7.4,
              V2Vector: 'AV:N/AC:M/Au:N/C:N/I:P/A:P',
              V3Vector: 'CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:N/I:H/A:H',
            },
            redhat: {
              V3Score: 7.4,
              V3Vector: 'CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:N/I:H/A:H',
            },
          },
          Layer: {
            DiffID: 'sha256:662009dcc4193ef33f9b4b4f8f158c8a0ce2b0f019ef8ad12b108e1659e949dc',
            Digest: 'sha256:58b827811b460cc81672b1baf09b8188971ccd7a551fc6d95446ffc63bec449f',
          },
          Title: 'nodejs-lodash: prototype pollution in zipObjectDeep function',
          PkgName: 'lodash',
          Severity: VulnerabilitySeverity.Medium,
          References: [
            'https://github.com/advisories/GHSA-p6mc-m468-83gw',
            'https://github.com/lodash/lodash/issues/4874',
            'https://hackerone.com/reports/712065',
            'https://nvd.nist.gov/vuln/detail/CVE-2020-8203',
            'https://security.netapp.com/advisory/ntap-20200724-0006/',
            'https://www.npmjs.com/advisories/1523',
          ],
          Description: 'Prototype pollution attack when using _.zipObjectDeep in lodash <= 4.17.15.',
          FixedVersion: '4.17.19',
          SeveritySource: 'nvd',
          VulnerabilityID: 'CVE-2020-8203',
          InstalledVersion: '4.17.14',
        },
        {
          Layer: {
            DiffID: 'sha256:662009dcc4193ef33f9b4b4f8f158c8a0ce2b0f019ef8ad12b108e1659e949dc',
            Digest: 'sha256:58b827811b460cc81672b1baf09b8188971ccd7a551fc6d95446ffc63bec449f',
          },
          Title: 'Denial of Service in mem',
          PkgName: 'mem',
          Severity: VulnerabilitySeverity.Low,
          References: [
            'https://github.com/advisories/GHSA-4xcv-9jjx-gfj3',
            'https://github.com/sindresorhus/mem/commit/da4e4398cb27b602de3bd55f746efa9b4a31702b',
          ],
          Description:
            "Versions of `mem` prior to 4.0.0 are vulnerable to Denial of Service (DoS).  The package fails to remove old values from the cache even after a value passes its `maxAge` property. This may allow attackers to exhaust the system's memory if they are able to abuse the application logging.\n\n\n## Recommendation\n\nUpgrade to version 4.0.0 or later.",
          FixedVersion: '4.0.0',
          VulnerabilityID: 'GHSA-4xcv-9jjx-gfj3',
          InstalledVersion: '1.1.0',
        },
        {
          Layer: {
            DiffID: 'sha256:662009dcc4193ef33f9b4b4f8f158c8a0ce2b0f019ef8ad12b108e1659e949dc',
            Digest: 'sha256:58b827811b460cc81672b1baf09b8188971ccd7a551fc6d95446ffc63bec449f',
          },
          Title: 'Prototype Pollution in yargs-parser',
          PkgName: 'yargs-parser',
          Severity: VulnerabilitySeverity.Low,
          References: [
            'https://github.com/advisories/GHSA-p9pc-299p-vxgp',
            'https://snyk.io/vuln/SNYK-JS-YARGSPARSER-560381',
          ],
          Description:
            "Affected versions of `yargs-parser` are vulnerable to prototype pollution. Arguments are not properly sanitized, allowing an attacker to modify the prototype of `Object`, causing the addition or modification of an existing property that will exist on all objects.  \nParsing the argument `--foo.__proto__.bar baz'` adds a `bar` property with value `baz` to all objects. This is only exploitable if attackers have control over the arguments being passed to `yargs-parser`.\n\n\n\n## Recommendation\n\nUpgrade to versions 13.1.2, 15.0.1, 18.1.1 or later.",
          FixedVersion: '18.1.2, 15.0.1, 13.1.2',
          VulnerabilityID: 'GHSA-p9pc-299p-vxgp',
          InstalledVersion: '8.1.0',
        },
      ],
      summary: { critical: 0, high: 0, low: 0, medium: 0, unknown: 0 },
    },
  },
];

describe('formatSecurityReport', () => {
  for (let i = 0; i < tests.length; i++) {
    it('returns proper content', () => {
      const actual = formatSecurityReport(tests[i].input);
      expect(actual).toEqual(tests[i].output);
    });
  }
});
