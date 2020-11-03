import { isNull, slice } from 'lodash';
import React, { useState } from 'react';
import { FaCaretDown, FaCaretRight } from 'react-icons/fa';

import { SecurityTargetReport, Vulnerability } from '../../../types';
import formatSecurityReport from '../../../utils/formatSecurityReport';
import getTextBetweenParenthesis from '../../../utils/getTextBetweenParenthesis';
import SecurityRating from '../../common/SecutityRating';
import SecurityCell from './Cell';
import styles from './Table.module.css';

interface Props {
  image: string;
  reports: SecurityTargetReport[];
}

const MAX_VULNERABILITY_NUMBER = 100;

const SecurityTable = (props: Props) => {
  const [expanded, setExpanded] = useState<boolean>(true);

  const getEmptyMessage = (): JSX.Element => <span className="font-italic text-muted">No vulnerabilities found</span>;
  const getTargetName = (target: string): string => {
    return getTextBetweenParenthesis(target) || target;
  };

  return (
    <div className="my-1">
      <button
        data-testid="btnExpand"
        className="btn btn-link text-reset pl-0 h5 btn-block position-relative"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="d-flex flex-row align-items-center font-weight-bold">
          {expanded ? <FaCaretDown /> : <FaCaretRight />}
          <div className="pl-2 text-truncate">
            <span className={`text-uppercase text-muted mr-2 ${styles.tableTitle}`}>Image:</span>
            {props.image}
          </div>
        </div>
      </button>

      {expanded && (
        <div data-testid="securityReportInfo">
          {isNull(props.reports) ? (
            <div className="ml-4 mb-4">{getEmptyMessage()}</div>
          ) : (
            <>
              {props.reports.map((item: SecurityTargetReport) => {
                const { list, summary } = formatSecurityReport(item.Vulnerabilities);
                const visibleVulnerabilities = slice(list, 0, MAX_VULNERABILITY_NUMBER);

                return (
                  <div className="ml-4 mb-4" key={`table_${item.Target}`}>
                    <div className="d-flex flex-row align-items-center mb-2">
                      <div
                        data-testid="targetTitle"
                        className={`${styles.tableTitle} font-weight-bold mr-3 text-truncate`}
                      >
                        <span className="text-uppercase text-muted mr-2">Target:</span>
                        <span className="font-weight-bold">{getTargetName(item.Target)}</span>
                      </div>
                      <div
                        className={`${styles.tableTitle} d-flex flex-row align-items-center font-weight-bold text-nowrap`}
                      >
                        <span className="text-uppercase text-muted">Rating:</span>
                        <SecurityRating summary={summary} className={styles.securityRatingBadge} onlyBadge />
                      </div>
                    </div>

                    {visibleVulnerabilities.length === 0 ? (
                      <>{getEmptyMessage()}</>
                    ) : (
                      <div className="w-100 overflow-auto">
                        <table className={`table table-sm table-hover ${styles.table}`}>
                          <thead>
                            <tr className="text-uppercase text-muted">
                              <th scope="col" className={`border-top-0 ${styles.fitCell}`} />
                              <th scope="col" className="border-top-0">
                                ID
                              </th>
                              <th scope="col" className="border-top-0">
                                Severity
                              </th>
                              <th scope="col" className="border-top-0">
                                Package
                              </th>
                              <th scope="col" className="border-top-0">
                                Version
                              </th>
                              <th scope="col" className="border-top-0">
                                Fixed in
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {visibleVulnerabilities.map((item: Vulnerability) => (
                              <SecurityCell vulnerability={item} key={`cell_${item.PkgName}_${item.VulnerabilityID}`} />
                            ))}
                            {list.length > visibleVulnerabilities.length && (
                              <tr>
                                <td colSpan={6} className="align-middle text-right pt-3">
                                  <span className="text-muted font-italic">
                                    Displaying only the first {MAX_VULNERABILITY_NUMBER} entries
                                  </span>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SecurityTable;
