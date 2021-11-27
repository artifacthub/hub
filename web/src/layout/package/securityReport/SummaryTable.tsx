import { useEffect, useState } from 'react';

import useBreakpointDetect from '../../../hooks/useBreakpointDetect';
import { SecurityReport, SecurityReportResult, Vulnerability, VulnerabilitySeverity } from '../../../types';
import { SEVERITY_ORDER } from '../../../utils/data';
import formatSecurityReport from '../../../utils/formatSecurityReport';
import sumObjectValues from '../../../utils/sumObjectValues';
import SecurityRating from '../../common/SecurityRating';
import styles from './SummaryTable.module.css';

interface Props {
  report: SecurityReport;
  hasWhitelistedContainers: boolean;
}

const SummaryTable = (props: Props) => {
  const point = useBreakpointDetect();
  const [visibleTooltip, setVisibleTooltip] = useState<boolean>(true);

  useEffect(() => {
    const checkTooltipInTable = () => {
      if (point) {
        setVisibleTooltip(['xl', 'xxl'].includes(point));
      }
    };
    checkTooltipInTable();
  }, [point]);

  return (
    <div className={`w-100 my-4 ${styles.tableWrapper}`}>
      <table className={`table table-bordered table-md mb-0 ${styles.table}`}>
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
          {Object.keys(props.report).map((image: string) => {
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
                  <div className="d-inline-block">
                    <SecurityRating
                      summary={summary}
                      onlyBadge
                      tooltipAligment="left"
                      tooltipClassName={styles.tooltip}
                      withoutTooltip={!visibleTooltip}
                    />
                  </div>
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
