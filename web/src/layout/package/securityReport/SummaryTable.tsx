import React from 'react';

import { SecurityReport, SecurityReportResult, Vulnerability, VulnerabilitySeverity } from '../../../types';
import { SEVERITY_ORDER } from '../../../utils/data';
import formatSecurityReport from '../../../utils/formatSecurityReport';
import sumObjectValues from '../../../utils/sumObjectValues';
import SecurityRating from '../../common/SecutityRating';
import styles from './SummaryTable.module.css';

interface Props {
  report: SecurityReport;
  hasWhitelistedContainers: boolean;
}

const SummaryTable = (props: Props) => {
  return (
    <div className="my-4 d-none d-lg-block">
      <table className={`table table-bordered table-md ${styles.table}`}>
        <thead>
          <tr className={styles.tableTitle}>
            <th className={styles.image} scope="col">
              Image
            </th>
            <th scope="col" className="text-center">
              Rating
            </th>
            {SEVERITY_ORDER.map((severity: VulnerabilitySeverity) => (
              <th key={`col_${severity}`} className="col text-center text-capitalize">
                {severity}
              </th>
            ))}
            <th scope="col" className="text-center">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(props.report).map((image: string, index: number) => {
            let vulnerabilitiesList: Vulnerability[] = [];
            props.report[image].Results.forEach((targetReport: SecurityReportResult) => {
              if (targetReport.Vulnerabilities) {
                vulnerabilitiesList = [...vulnerabilitiesList, ...targetReport.Vulnerabilities];
              }
            });
            const { summary } = formatSecurityReport(vulnerabilitiesList);
            const total = sumObjectValues(summary);

            return (
              <tr key={`tr_${image}`}>
                <td>
                  <div className={styles.imageNameWrapper}>
                    <div className="text-truncate">{image}</div>
                  </div>
                </td>
                <td className="text-center">
                  <SecurityRating summary={summary} onlyBadge />
                </td>
                {SEVERITY_ORDER.map((severity: VulnerabilitySeverity) => (
                  <td key={`col_${severity}_${image}`} className="text-center">
                    {summary[severity] || 0}
                  </td>
                ))}
                <td className="text-center font-weight-bold">{total}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {props.hasWhitelistedContainers && (
        <div className={`text-muted ${styles.legend}`}>
          * Some containers images used by this package have been whitelisted by the publisher, which may affect the
          security rating.
        </div>
      )}
    </div>
  );
};

export default SummaryTable;
