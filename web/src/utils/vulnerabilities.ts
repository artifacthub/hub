import { filter, isEmpty, isNull, isUndefined } from 'lodash';

import { FixableVulnerabilitiesInReport, SecurityReport, SecurityReportResult, Vulnerability } from '../types';
import formatSecurityReport from './formatSecurityReport';
import sumObjectValues from './sumObjectValues';

const prepareFixableSummary = (
  fixableVulnerabilities: SecurityReport | null | undefined
): FixableVulnerabilitiesInReport => {
  let fixReport: FixableVulnerabilitiesInReport = { report: {}, summary: {}, total: 0 };
  if (fixableVulnerabilities) {
    let allVulnerabilities: Vulnerability[] = [];
    Object.keys(fixableVulnerabilities).forEach((image: string) => {
      let vulnerabilitiesList: Vulnerability[] = [];
      fixableVulnerabilities[image].Results.forEach((targetReport: SecurityReportResult) => {
        if (targetReport.Vulnerabilities) {
          vulnerabilitiesList = [...vulnerabilitiesList, ...targetReport.Vulnerabilities];
          allVulnerabilities = [...allVulnerabilities, ...targetReport.Vulnerabilities];
        }
      });
      const { summary } = formatSecurityReport(vulnerabilitiesList);
      const total = sumObjectValues(summary);
      fixReport.report[image] = {
        summary: summary,
        total: total,
      };
    });
    fixReport.summary = formatSecurityReport(allVulnerabilities).summary;
    fixReport.total = sumObjectValues(formatSecurityReport(allVulnerabilities).summary);
  }
  return fixReport;
};

const filterFixableVulnerabilities = (currentReport: SecurityReport | null): SecurityReport | null => {
  if (isNull(currentReport)) return null;

  let tmpReport: SecurityReport = {};
  Object.keys(currentReport).forEach((img: string) => {
    currentReport[img].Results.forEach((target: SecurityReportResult) => {
      let vulnerabilities: null | Vulnerability[] = [];
      const filteredVulnerabilities = filter(
        target.Vulnerabilities,
        (v: Vulnerability) => !isUndefined(v.FixedVersion)
      );
      vulnerabilities = isEmpty(target.Vulnerabilities) ? [] : filteredVulnerabilities;
      if (!isNull(vulnerabilities)) {
        if (isUndefined(tmpReport[img])) {
          tmpReport[img] = { Results: [{ ...target, Vulnerabilities: vulnerabilities }] };
        } else {
          tmpReport[img].Results.push({ ...target, Vulnerabilities: vulnerabilities });
        }
      }
    });
  });
  return tmpReport;
};

export { filterFixableVulnerabilities, prepareFixableSummary };
