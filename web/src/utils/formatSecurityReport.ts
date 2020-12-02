import { groupBy, orderBy } from 'lodash';

import { SecurityReportSummary, Vulnerability, VulnerabilitySeverity } from '../types';
import { SEVERITY_ORDER } from './data';

export default (vulnerabilities: Vulnerability[] | null): { list: Vulnerability[]; summary: SecurityReportSummary } => {
  const list = vulnerabilities
    ? orderBy(
        vulnerabilities,
        [
          (vulnerability: Vulnerability) =>
            SEVERITY_ORDER.indexOf(vulnerability.Severity.toLowerCase() as VulnerabilitySeverity),
          (vulnerability: Vulnerability) => {
            const sources = vulnerability.CVSS ? Object.keys(vulnerability.CVSS) : [];
            const activeSource =
              vulnerability.SeveritySource && sources.includes(vulnerability.SeveritySource)
                ? vulnerability.SeveritySource
                : sources[0];
            if (sources.length > 0 && vulnerability.CVSS[activeSource]) {
              return vulnerability.CVSS[activeSource].V3Score || vulnerability.CVSS[activeSource].V2Score;
            }
          },
          'PkgName',
        ],
        ['asc', 'desc', 'asc']
      )
    : [];

  const sortedBySeverity = groupBy(vulnerabilities, 'Severity');

  const summary: SecurityReportSummary = {};
  for (let severity in VulnerabilitySeverity) {
    const value: VulnerabilitySeverity = severity.toLowerCase() as VulnerabilitySeverity;
    if (sortedBySeverity[severity.toUpperCase()]) {
      summary[value] = sortedBySeverity[severity.toUpperCase()].length;
    } else {
      summary[value] = 0;
    }
  }

  return { list: list, summary: summary };
};
