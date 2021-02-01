import { isNull, slice } from 'lodash';
import React, { useState } from 'react';
import { FaCaretDown, FaCaretRight } from 'react-icons/fa';
import { GoPackage } from 'react-icons/go';

import { SecurityTargetReport, Vulnerability } from '../../../types';
import formatSecurityReport from '../../../utils/formatSecurityReport';
import getTextBetweenParenthesis from '../../../utils/getTextBetweenParenthesis';
import SecurityRating from '../../common/SecutityRating';
import SecurityCell from './Cell';
import styles from './Table.module.css';
import TargetImageBtn from './TargetImageBtn';

interface Props {
  expandedTarget: string | null;
  setExpandedTarget: React.Dispatch<React.SetStateAction<string | null>>;
  image: string;
  reports: SecurityTargetReport[];
  hasOnlyOneTarget: boolean;
}

const MAX_VULNERABILITY_NUMBER = 100;

const SecurityTable = (props: Props) => {
  const [visibleVulnerability, setVisibleVulnerability] = useState<string | undefined>();

  const getEmptyMessage = (): JSX.Element => <span className="font-italic text-muted">No vulnerabilities found</span>;
  const getTargetName = (target: string): string => {
    return getTextBetweenParenthesis(target) || target;
  };

  return (
    <div className="my-1">
      <div className="d-flex flex-row align-items-center font-weight-bold mb-2">
        <GoPackage />
        <div className="pl-2 text-truncate">
          <span className={`text-uppercase text-muted mr-2 ${styles.tableTitle}`}>Image:</span>
          {props.image}
        </div>
      </div>

      <div data-testid="securityReportInfo">
        {isNull(props.reports) ? (
          <div className="ml-4 mb-4">{getEmptyMessage()}</div>
        ) : (
          <>
            {props.reports.map((item: SecurityTargetReport) => {
              const targetImageName = `${props.image}_${item.Target}`;
              const { list, summary } = formatSecurityReport(item.Vulnerabilities);
              const visibleVulnerabilities = slice(list, 0, MAX_VULNERABILITY_NUMBER);
              const isExpanded = targetImageName === props.expandedTarget;

              return (
                <React.Fragment key={`table_${targetImageName}`}>
                  <div className="ml-4 mb-3">
                    {visibleVulnerabilities.length > 0 ? (
                      <TargetImageBtn
                        isExpanded={isExpanded}
                        onClick={() => props.setExpandedTarget(isExpanded ? null : targetImageName)}
                        disabled={visibleVulnerabilities.length === 0}
                        hasOnlyOneTarget={props.hasOnlyOneTarget}
                      >
                        <div className="d-flex flex-row align-items-center mb-2">
                          {isExpanded ? <FaCaretDown /> : <FaCaretRight />}
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
                            <SecurityRating
                              summary={summary}
                              className={`ml-2 ${styles.securityRatingBadge}`}
                              onlyBadge
                            />
                          </div>

                          <div className={`badge badge-secondary ml-3 ${styles.badge}`}>
                            {isExpanded ? 'Hide' : 'Show'} vulnerabilities
                          </div>
                        </div>
                      </TargetImageBtn>
                    ) : (
                      <div
                        className={`d-flex flex-row align-items-center position-relative mb-2 ${styles.targetTitle}`}
                      >
                        <FaCaretRight />
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
                          <SecurityRating
                            summary={summary}
                            className={`ml-2 ${styles.securityRatingBadge}`}
                            onlyBadge
                          />
                        </div>
                      </div>
                    )}

                    {isExpanded && (
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
                            {visibleVulnerabilities.map((item: Vulnerability, index: number) => {
                              const vulnerabilityName = `${item.VulnerabilityID}_${index}`;
                              return (
                                <SecurityCell
                                  name={vulnerabilityName}
                                  vulnerability={item}
                                  key={`cell_${item.PkgName}_${item.VulnerabilityID}`}
                                  isExpanded={visibleVulnerability === vulnerabilityName}
                                  setVisibleVulnerability={setVisibleVulnerability}
                                />
                              );
                            })}
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
                </React.Fragment>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
};

export default SecurityTable;
