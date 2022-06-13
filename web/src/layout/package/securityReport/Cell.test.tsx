import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { VulnerabilitySeverity } from '../../../types';
import SecurityCell from './Cell';

jest.mock('react-markdown', () => () => <div />);

const mockSetVisibleVulnerability = jest.fn();
const scrollIntoViewMock = jest.fn();

window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

const defaultProps = {
  name: 'CVE-2020-8492_1',
  vulnerability: {
    Description:
      'Python 2.7 through 2.7.17, 3.5 through 3.5.9, 3.6 through 3.6.10, 3.7 through 3.7.6, and 3.8 through 3.8.1 allows an HTTP server to conduc',
    InstalledVersion: '3.6.8-23.el8',
    FixedVersion: '3.6.8-24.el8',
    PkgName: 'platform-python',
    References: [
      'http://linux.oracle.com/errata/ELSA-2020-3888.html',
      'http://lists.opensuse.org/opensuse-security-announce/2020-03/msg00003.html',
      'http://linux.oracle.com/cve/CVE-2020-8492.html',
      'https://bugs.python.org/issue39503',
      'https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2020-8492',
      'https://github.com/python/cpython/commit/0b297d4ff1c0e4480ad33acae793fbaf4bf015b4',
      'https://github.com/python/cpython/pull/18284',
      'https://lists.debian.org/debian-lts-announce/2020/07/msg00011.html',
    ],
    Severity: VulnerabilitySeverity.Medium,
    SeveritySource: 'redhat',
    Title: 'python: wrong backtracking in urllib.request.AbstractBasicAuthHandler allows for a ReDoS',
    VulnerabilityID: 'CVE-2020-8492',
  },
  isExpanded: false,
  setVisibleVulnerability: mockSetVisibleVulnerability,
};

const references = [
  {
    cve: 'CVE-2019-5482',
    list: [
      'http://linux.oracle.com/cve/CVE-2019-5482.html',
      'http://linux.oracle.com/errata/ELSA-2020-5562.html',
      'http://lists.opensuse.org/opensuse-security-announce/2019-09/msg00048.html',
      'http://lists.opensuse.org/opensuse-security-announce/2019-09/msg00055.html',
      'https://curl.haxx.se/docs/CVE-2019-5482.html',
      'https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2019-5482',
      'https://lists.fedoraproject.org/archives/list/package-announce@lists.fedoraproject.org/message/6CI4QQ2RSZX4VCFM76SIWGKY6BY7UWIC/',
      'https://lists.fedoraproject.org/archives/list/package-announce@lists.fedoraproject.org/message/RGDVKSLY5JUNJRLYRUA6CXGQ2LM63XC3/',
      'https://lists.fedoraproject.org/archives/list/package-announce@lists.fedoraproject.org/message/UA7KDM2WPM5CJDDGOEGFV6SSGD2J7RNT/',
      'https://seclists.org/bugtraq/2020/Feb/36',
      'https://security.gentoo.org/glsa/202003-29',
      'https://security.netapp.com/advisory/ntap-20191004-0003/',
      'https://security.netapp.com/advisory/ntap-20200416-0003/',
      'https://usn.ubuntu.com/usn/usn-4129-1',
      'https://usn.ubuntu.com/usn/usn-4129-2',
      'https://www.debian.org/security/2020/dsa-4633',
      'https://www.oracle.com/security-alerts/cpuapr2020.html',
      'https://www.oracle.com/security-alerts/cpujan2020.html',
    ],
    reference: 'http://linux.oracle.com/cve/CVE-2019-5482.html',
  },
  {
    cve: 'CVE-2018-20483',
    list: [
      'http://git.savannah.gnu.org/cgit/wget.git/tree/NEWS',
      'http://linux.oracle.com/cve/CVE-2018-20483.html',
      'http://linux.oracle.com/errata/ELSA-2019-3701.html',
      'http://www.securityfocus.com/bid/106358',
      'https://access.redhat.com/errata/RHSA-2019:3701',
      'https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2018-20483',
      'https://security.gentoo.org/glsa/201903-08',
      'https://security.netapp.com/advisory/ntap-20190321-0002/',
      'https://twitter.com/marcan42/status/1077676739877232640',
      'https://usn.ubuntu.com/3943-1/',
      'https://usn.ubuntu.com/usn/usn-3943-1',
    ],
    reference: 'http://linux.oracle.com/cve/CVE-2018-20483.html',
  },
  {
    cve: 'CVE-2020-8177',
    list: [
      'https://curl.haxx.se/docs/CVE-2020-8177.html',
      'https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2020-8177',
      'https://usn.ubuntu.com/usn/usn-4402-1',
    ],
    reference: 'https://curl.haxx.se/docs/CVE-2020-8177.html',
  },
  {
    cve: 'GHSA-p9pc-299p-vxgp',
    list: ['https://github.com/advisories/GHSA-p9pc-299p-vxgp', 'https://snyk.io/vuln/SNYK-JS-YARGSPARSER-560381'],
    reference: 'https://github.com/advisories/GHSA-p9pc-299p-vxgp',
  },
  {
    cve: 'CVE-2020-8203',
    list: [
      'https://github.com/advisories/GHSA-p6mc-m468-83gw',
      'https://github.com/lodash/lodash/issues/4874',
      'https://hackerone.com/reports/712065',
      'https://nvd.nist.gov/vuln/detail/CVE-2020-8203',
      'https://security.netapp.com/advisory/ntap-20200724-0006/',
      'https://www.npmjs.com/advisories/1523',
    ],
    reference: 'https://nvd.nist.gov/vuln/detail/CVE-2020-8203',
  },
  {
    cve: 'CVE-2020-8203',
    list: ['https://sourceware.org/bugzilla/show_bug.cgi?id=22850'],
    reference: 'https://sourceware.org/bugzilla/show_bug.cgi?id=22850',
  },
];

const badges = [
  { severity: VulnerabilitySeverity.UnKnown, color: '#b2b2b2' },
  { severity: VulnerabilitySeverity.Low, color: '#F4BD0C' },
  { severity: VulnerabilitySeverity.Medium, color: '#F7860F' },
  { severity: VulnerabilitySeverity.High, color: '#DF2A19' },
  { severity: VulnerabilitySeverity.Critical, color: '#960003' },
];

const openMock = jest.fn();
window.open = openMock;

describe('SecuritySummary', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(
      <table>
        <tbody>
          <SecurityCell {...defaultProps} />
        </tbody>
      </table>
    );
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(
        <table>
          <tbody>
            <SecurityCell {...defaultProps} />
          </tbody>
        </table>
      );
      expect(screen.getByText(defaultProps.vulnerability.VulnerabilityID)).toBeInTheDocument();
      expect(screen.getByText(defaultProps.vulnerability.PkgName)).toBeInTheDocument();

      const link = screen.getByRole('button');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'http://linux.oracle.com/cve/CVE-2020-8492.html');

      const badge = screen.getByTestId('severityBadge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveStyle('background-color: #F7860F');

      expect(screen.getByText(defaultProps.vulnerability.InstalledVersion)).toBeInTheDocument();
      expect(screen.getByText(defaultProps.vulnerability.FixedVersion)).toBeInTheDocument();
    });

    it('renders cell without fixed version', () => {
      const props = {
        name: 'CVE-2020-8492_1',
        vulnerability: {
          ...defaultProps.vulnerability,
          InstalledVersion: undefined,
        },
        isExpanded: false,
        setVisibleVulnerability: mockSetVisibleVulnerability,
      };

      render(
        <table>
          <tbody>
            <SecurityCell {...props} />
          </tbody>
        </table>
      );

      const cell = screen.getByTestId('fixedVersionCell');
      expect(cell).toBeInTheDocument();
      expect(cell).toHaveTextContent('-');
    });

    it('opens vulnerability detail', async () => {
      const { rerender } = render(
        <table>
          <tbody>
            <SecurityCell {...defaultProps} />
          </tbody>
        </table>
      );

      expect(screen.queryByTestId('vulnerabilityDetail')).toBeNull();
      const cell = screen.getByTestId('vulnerabilityCell');
      await userEvent.click(cell);

      await waitFor(() => {
        expect(mockSetVisibleVulnerability).toHaveBeenCalledTimes(1);
        expect(mockSetVisibleVulnerability).toHaveBeenCalledWith('CVE-2020-8492_1');
      });

      rerender(
        <table>
          <tbody>
            <SecurityCell {...defaultProps} isExpanded />
          </tbody>
        </table>
      );

      await waitFor(() => {
        expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
      });
    });

    it('Closes vulnerability detail', async () => {
      render(
        <table>
          <tbody>
            <SecurityCell {...defaultProps} isExpanded />
          </tbody>
        </table>
      );

      expect(screen.getByTestId('vulnerabilityDetail')).toBeInTheDocument();
      const cell = screen.getByTestId('vulnerabilityCell');
      await userEvent.click(cell);

      await waitFor(() => {
        expect(mockSetVisibleVulnerability).toHaveBeenCalledTimes(1);
        expect(mockSetVisibleVulnerability).toHaveBeenCalledWith(undefined);
      });
    });
  });

  describe('Severity', () => {
    for (let i = 0; i < badges.length; i++) {
      it('returns proper badge', () => {
        const props = {
          name: 'CVE-2020-8492_1',
          vulnerability: {
            ...defaultProps.vulnerability,
            Severity: badges[i].severity,
          },
          isExpanded: false,
          setVisibleVulnerability: mockSetVisibleVulnerability,
        };

        render(
          <table>
            <tbody>
              <SecurityCell {...props} />
            </tbody>
          </table>
        );

        const badge = screen.getByTestId('severityBadge');
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveStyle(`background-color: ${badges[i].color}`);
      });
    }
  });

  describe('References', () => {
    for (let i = 0; i < references.length; i++) {
      it('returns correct one', () => {
        const props = {
          name: 'CVE-2020-8492_1',
          vulnerability: {
            ...defaultProps.vulnerability,
            VulnerabilityID: references[i].cve,
            References: references[i].list,
          },
          isExpanded: false,
          setVisibleVulnerability: mockSetVisibleVulnerability,
        };

        render(
          <table>
            <tbody>
              <SecurityCell {...props} />
            </tbody>
          </table>
        );

        const link = screen.getByRole('button');
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', references[i].reference);
      });
    }
  });
});
