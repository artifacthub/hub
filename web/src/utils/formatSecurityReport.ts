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
          'PkgName',
        ],
        ['asc', 'asc']
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
