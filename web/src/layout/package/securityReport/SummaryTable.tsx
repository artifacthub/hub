import classNames from 'classnames';
import { Fragment, useEffect, useState } from 'react';

import useBreakpointDetect from '../../../hooks/useBreakpointDetect';
import {
  FixableVulnerabilitiesInReport,
  SecurityReport,
  SecurityReportResult,
  Vulnerability,
  VulnerabilitySeverity,
} from '../../../types';
import { SEVERITY_ORDER } from '../../../utils/data';
import formatSecurityReport from '../../../utils/formatSecurityReport';
import sumObjectValues from '../../../utils/sumObjectValues';
import SecurityRating from '../../common/SecurityRating';
import styles from './SummaryTable.module.css';

interface Props {
  report: SecurityReport;
  fixableVulnerabilities: FixableVulnerabilitiesInReport;
  hasWhitelistedContainers: boolean;
  allVulnerabilitiesAreFixable: boolean;
}

const SummaryTable = (props: Props) => {
  const point = useBreakpointDetect();
  const [visibleTooltip, setVisibleTooltip] = useState<boolean>(true);

  useEffect(() => {
    const checkTooltipInTable = () => {
      if (point) {
        setVisibleTooltip(['xl', 'xxl', 'xxxl'].includes(point));
      }
    };
    checkTooltipInTable();
  }, [point]);

  return (
    <div className={`w-100 my-4 ${styles.tableWrapper}`}>
      <table className={`table table-bordered table-md mb-0 ${styles.table}`}>
        <thead>
          <tr className={styles.tableTitle}>
            <th className="w-auto" scope="col">
              Image
            </th>
            <th scope="col" className="text-center">
              Rating
            </th>
            {!props.allVulnerabilitiesAreFixable && (
              <th scope="col" className="text-center">
                Type
              </th>
            )}

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
            const fixableVulnerabilities = props.fixableVulnerabilities.report[image] || { summary: {}, total: 0 };
            const total = sumObjectValues(summary);

            return (
              <Fragment key={`tr_${image}`}>
                <tr>
                  <td rowSpan={!props.allVulnerabilitiesAreFixable ? 2 : 1} className="align-middle">
                    <div className={`d-table w-100 ${styles.imageNameWrapper}`}>
                      <div className="text-truncate">{image}</div>
                    </div>
                  </td>
                  <td className="text-center align-middle" rowSpan={!props.allVulnerabilitiesAreFixable ? 2 : 1}>
                    <div className="d-inline-block">
                      <SecurityRating
                        summary={summary}
                        onlyBadge
                        tooltipAlignment="left"
                        className={styles.ratingBadge}
                        tooltipClassName={styles.tooltip}
                        withoutTooltip={!visibleTooltip}
                      />
                    </div>
                  </td>
                  {!props.allVulnerabilitiesAreFixable ? (
                    <>
                      <td className={styles.narrowCell}>Fixable</td>
                      {SEVERITY_ORDER.map((severity: VulnerabilitySeverity) => (
                        <td key={`col_fix_${severity}_${image}`} className={`text-center ${styles.narrowCell}`}>
                          {fixableVulnerabilities.summary[severity] || 0}
                        </td>
                      ))}
                      <td className={`text-center fw-bold ${styles.narrowCell}`}>{fixableVulnerabilities.total}</td>
                    </>
                  ) : (
                    <>
                      {SEVERITY_ORDER.map((severity: VulnerabilitySeverity) => (
                        <td
                          key={`col_${severity}_${image}`}
                          className={classNames('text-center', {
                            [styles.narrowCell]: !props.allVulnerabilitiesAreFixable,
                          })}
                        >
                          {summary[severity] || 0}
                        </td>
                      ))}
                      <td
                        className={classNames('text-center fw-bold', {
                          [styles.narrowCell]: !props.allVulnerabilitiesAreFixable,
                        })}
                      >
                        {total}
                      </td>
                    </>
                  )}
                </tr>
                {!props.allVulnerabilitiesAreFixable && (
                  <tr>
                    <td className={styles.narrowCell}>All</td>
                    {SEVERITY_ORDER.map((severity: VulnerabilitySeverity) => (
                      <td key={`col_${severity}_${image}`} className={`text-center ${styles.narrowCell}`}>
                        {summary[severity] || 0}
                      </td>
                    ))}
                    <td className={`text-center fw-bold ${styles.narrowCell}`}>{total}</td>
                  </tr>
                )}
              </Fragment>
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
