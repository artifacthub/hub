import { isNull, isUndefined, slice } from 'lodash';
import { Dispatch, Fragment, SetStateAction, useState } from 'react';
import { FaCaretDown, FaCaretRight } from 'react-icons/fa';

import { SecurityReportResult, Vulnerability } from '../../../types';
import formatSecurityReport from '../../../utils/formatSecurityReport';
import getTextBetweenParenthesis from '../../../utils/getTextBetweenParenthesis';
import SecurityRating from '../../common/SecurityRating';
import SecurityCell from './Cell';
import ImageBtn from './ImageBtn';
import styles from './Table.module.css';
import TargetImageBtn from './TargetImageBtn';

interface Props {
  visibleImage: string | null;
  setVisibleImage: Dispatch<SetStateAction<string | null>>;
  visibleTarget: string | null;
  setVisibleTarget: Dispatch<SetStateAction<string | null>>;
  expandedTarget: string | null;
  setExpandedTarget: Dispatch<SetStateAction<string | null>>;
  image: string;
  reports: SecurityReportResult[];
  hasOnlyOneTarget: boolean;
  lastReport: boolean;
  contentHeight?: number;
}

const MAX_VULNERABILITY_NUMBER = 100;

const SecurityTable = (props: Props) => {
  const [visibleVulnerability, setVisibleVulnerability] = useState<string | undefined>();

  const getEmptyMessage = (): JSX.Element => <span className="font-italic text-muted">No vulnerabilities found</span>;
  const getTargetName = (target: string): string => {
    return getTextBetweenParenthesis(target) || target;
  };
  const isActiveImage = isNull(props.visibleTarget) ? props.visibleImage === props.image : false;

  return (
    <div className="my-1">
      <ImageBtn
        image={props.image}
        isActive={isActiveImage}
        onClick={() => {
          if (!isActiveImage) {
            props.setVisibleImage(props.image);
            props.setVisibleTarget(null);
            props.setExpandedTarget(null);
          }
        }}
      />

      <div data-testid="securityReportInfo">
        {isNull(props.reports) ? (
          <div className="ml-4 mb-4">{getEmptyMessage()}</div>
        ) : (
          <>
            {props.reports.map((item: SecurityReportResult, index: number) => {
              const targetImageName = `${props.image}_${item.Target}`;
              const { list, summary } = formatSecurityReport(item.Vulnerabilities);
              const visibleVulnerabilities = slice(list, 0, MAX_VULNERABILITY_NUMBER);
              const isActive = !isNull(props.visibleTarget)
                ? targetImageName === `${props.visibleImage}_${props.visibleTarget}`
                : false;
              const isExpanded = props.expandedTarget === targetImageName;
              const isLastTarget = props.lastReport && index === props.reports.length - 1;

              return (
                <Fragment key={`table_${targetImageName}`}>
                  <div
                    className="ml-4"
                    style={{
                      minHeight: isLastTarget && !isUndefined(props.contentHeight) ? props.contentHeight + 40 : 'auto',
                    }}
                  >
                    <TargetImageBtn
                      isActive={isActive}
                      isExpanded={isExpanded}
                      expandedTarget={props.expandedTarget}
                      onClick={() => {
                        props.setVisibleImage(props.image);
                        props.setVisibleTarget(item.Target);
                        props.setExpandedTarget(null);
                      }}
                      hasOnlyOneTarget={props.hasOnlyOneTarget}
                    >
                      <div className="d-flex flex-row align-items-center mb-2">
                        {isExpanded ? <FaCaretDown /> : <FaCaretRight />}
                        <div
                          data-testid="targetTitle"
                          className={`${styles.tableTitle} font-weight-bold mr-3 ml-1 text-truncate`}
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
                        {visibleVulnerabilities.length > 0 && (
                          <button
                            className={`btn badge badge-secondary ml-3 ${styles.badge}`}
                            onClick={() => props.setExpandedTarget(isExpanded ? null : targetImageName)}
                            aria-label={`${isExpanded ? 'Close' : 'Open'} target image vulnerabilities`}
                          >
                            {isExpanded ? 'Hide' : 'Show'} vulnerabilities
                          </button>
                        )}
                      </div>
                    </TargetImageBtn>

                    {isExpanded && (
                      <div className="w-100 overflow-auto mb-2">
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
                              <th scope="col" className="border-top-0 text-nowrap">
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
                </Fragment>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
};

export default SecurityTable;
