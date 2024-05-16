import filter from 'lodash/filter';
import isEmpty from 'lodash/isEmpty';
import isEqual from 'lodash/isEqual';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';

import {
  FixableVulnerabilitiesInReport,
  SecurityReport,
  SecurityReportResult,
  SecurityReportSummary,
  Vulnerability,
  VulnerabilitySeverity,
} from '../types';
import formatSecurityReport from './formatSecurityReport';
import sumObjectValues from './sumObjectValues';

const prepareFixableSummary = (
  fixableVulnerabilities: SecurityReport | null | undefined
): FixableVulnerabilitiesInReport => {
  const fixReport: FixableVulnerabilitiesInReport = { report: {}, summary: {}, total: 0 };
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

const prepareUniqueVulnerabilitiesSummary = (
  currentReport: SecurityReport | null
): { summary: SecurityReportSummary; total: number } | null => {
  if (isNull(currentReport)) return null;

  const fullReportSumary: SecurityReportSummary = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const summary: any = {};
  const uniqueSummaryReport: SecurityReportSummary = {};
  const allVulnerabilities: string[] = [];

  Object.keys(currentReport).forEach((img: string) => {
    currentReport[img].Results.forEach((target: SecurityReportResult) => {
      if (target.Vulnerabilities) {
        target.Vulnerabilities.forEach((vulnerability: Vulnerability) => {
          const severity = vulnerability.Severity.toLowerCase() as VulnerabilitySeverity;
          allVulnerabilities.push(vulnerability.VulnerabilityID);
          if (isUndefined(summary[severity])) {
            summary[severity] = [vulnerability.VulnerabilityID];
            fullReportSumary[severity] = 1;
          } else {
            summary[severity].push(vulnerability.VulnerabilityID);
            fullReportSumary[severity]! += 1;
          }
        });
      }
    });
  });

  Object.keys(summary).forEach((severity: string) => {
    uniqueSummaryReport[severity as VulnerabilitySeverity] = new Set(summary[severity]).size;
  });

  if (isEqual(fullReportSumary, uniqueSummaryReport)) {
    return null;
  } else {
    return { summary: uniqueSummaryReport, total: new Set(allVulnerabilities).size };
  }
};

const filterFixableVulnerabilities = (currentReport: SecurityReport | null): SecurityReport | null => {
  if (isNull(currentReport)) return null;

  const tmpReport: SecurityReport = {};
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

export { filterFixableVulnerabilities, prepareFixableSummary, prepareUniqueVulnerabilitiesSummary };
