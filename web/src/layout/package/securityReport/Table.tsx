import classNames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import slice from 'lodash/slice';
import { Dispatch, Fragment, SetStateAction, useState } from 'react';
import { FaCaretDown, FaCaretRight } from 'react-icons/fa';

import { SecurityReportResult, SecurityReportSummary, Vulnerability, VulnerabilitySeverity } from '../../../types';
import { SEVERITY_ORDER } from '../../../utils/data';
import formatSecurityReport from '../../../utils/formatSecurityReport';
import getTextBetweenParenthesis from '../../../utils/getTextBetweenParenthesis';
import sumObjectValues from '../../../utils/sumObjectValues';
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
  fixableReports: SecurityReportResult[];
  hasOnlyOneTarget: boolean;
  lastReport: boolean;
  contentHeight?: number;
  showOnlyFixableVulnerabilities: boolean;
}

interface TargetProps {
  targetImage: string;
  list: Vulnerability[];
  summary: SecurityReportSummary;
  fixableReport?: SecurityReportResult;
}

const MAX_VULNERABILITY_NUMBER = 100;

const SummaryTarget = (props: TargetProps): JSX.Element => {
  const total = sumObjectValues(props.summary);
  const fixableVulnerabilities = formatSecurityReport(
    !isUndefined(props.fixableReport) && !isNull(props.fixableReport.Vulnerabilities)
      ? props.fixableReport.Vulnerabilities
      : []
  );
  const fixableTotal = sumObjectValues(fixableVulnerabilities.summary);
  const allVulnerabilitiesAreFixable = fixableTotal === total;

  return (
    <table className={`table table-bordered table-sm mb-4 mt-2 ${styles.table} ${styles.summaryTable}`}>
      <thead>
        <tr className={styles.tableTitle}>
          {!allVulnerabilitiesAreFixable && <th scope="col">Type</th>}

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
        {!allVulnerabilitiesAreFixable ? (
          <tr>
            <td className={styles.narrowCell}>Fixable</td>
            {SEVERITY_ORDER.map((severity: VulnerabilitySeverity) => (
              <td key={`col_fix_${severity}_${props.targetImage}`} className={`text-center ${styles.narrowCell}`}>
                {fixableVulnerabilities.summary[severity] || 0}
              </td>
            ))}
            <td className={`text-center fw-bold ${styles.narrowCell}`}>{fixableTotal}</td>
          </tr>
        ) : (
          <tr>
            {SEVERITY_ORDER.map((severity: VulnerabilitySeverity) => (
              <td
                key={`col_${severity}_${props.targetImage}`}
                className={classNames('text-center', {
                  [styles.narrowCell]: !allVulnerabilitiesAreFixable,
                })}
              >
                {props.summary[severity] || 0}
              </td>
            ))}
            <td
              className={classNames('text-center fw-bold', {
                [styles.narrowCell]: !allVulnerabilitiesAreFixable,
              })}
            >
              {total}
            </td>
          </tr>
        )}
        {!allVulnerabilitiesAreFixable && (
          <tr>
            <td className={styles.narrowCell}>All</td>
            {SEVERITY_ORDER.map((severity: VulnerabilitySeverity) => (
              <td key={`col_${severity}_${props.targetImage}`} className={`text-center ${styles.narrowCell}`}>
                {props.summary[severity] || 0}
              </td>
            ))}
            <td className={`text-center fw-bold ${styles.narrowCell}`}>{total}</td>
          </tr>
        )}
      </tbody>
    </table>
  );
};

const SecurityTable = (props: Props) => {
  const [visibleVulnerability, setVisibleVulnerability] = useState<string | undefined>();

  const getEmptyMessage = (): JSX.Element => <span className="fst-italic text-muted">No vulnerabilities found</span>;
  const getTargetName = (target: string): string => {
    return getTextBetweenParenthesis(target) || target;
  };
  const isActiveImage = isNull(props.visibleTarget) ? props.visibleImage === props.image : false;
  const activeReports = props.showOnlyFixableVulnerabilities ? props.fixableReports : props.reports;

  const getWarningCellAboutNotDisplayedVulnerabilities = (total: number, visible: number): JSX.Element | null => {
    const diff = total - visible;
    if (diff === 0) {
      return null;
    } else {
      return (
        <tr>
          <td colSpan={6} className={`align-middle text-center table-warning ${styles.warningCell}`}>
            <span className="fw-bold">{diff}</span> not fixable {diff === 1 ? 'vulnerability' : 'vulnerabilities'} not
            displayed
          </td>
        </tr>
      );
    }
  };

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
        {isNull(activeReports) ? (
          <div className="ms-4 mb-4">{getEmptyMessage()}</div>
        ) : (
          <>
            {activeReports.map((item: SecurityReportResult, index: number) => {
              const targetImageName = `${props.image}_${item.Target}`;
              const allVulnerabilities = formatSecurityReport(props.reports[index].Vulnerabilities);
              const { list } = formatSecurityReport(item.Vulnerabilities);
              const visibleVulnerabilities = slice(list, 0, MAX_VULNERABILITY_NUMBER);
              const isActive = !isNull(props.visibleTarget)
                ? targetImageName === `${props.visibleImage}_${props.visibleTarget}`
                : false;
              const isExpanded = props.expandedTarget === targetImageName;
              const isLastTarget = props.lastReport && index === props.reports.length - 1;
              const fixableReport = props.fixableReports.find(
                (fixableItem: SecurityReportResult) => item.Target === fixableItem.Target
              );

              return (
                <Fragment key={`table_${targetImageName}`}>
                  <div
                    className="ms-4"
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
                          className={`${styles.tableTitle} fw-bold me-3 ms-1 text-truncate`}
                        >
                          <span className="text-uppercase text-muted me-2">Target:</span>
                          <span className="fw-bold">{getTargetName(item.Target)}</span>
                        </div>
                        <div className={`${styles.tableTitle} d-flex flex-row align-items-center fw-bold text-nowrap`}>
                          <span className="text-uppercase text-muted">Rating:</span>
                          <SecurityRating
                            summary={allVulnerabilities.summary}
                            className={`ms-2 ${styles.securityRatingBadge}`}
                            onlyBadge
                          />
                        </div>
                        {(visibleVulnerabilities.length > 0 ||
                          (props.showOnlyFixableVulnerabilities && allVulnerabilities.list.length > 0)) && (
                          <button
                            className={`btn badge bg-secondary ms-3 ${styles.badge}`}
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
                        <SummaryTarget
                          {...allVulnerabilities}
                          fixableReport={fixableReport}
                          targetImage={targetImageName}
                        />
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
                          <tbody className="bg-white">
                            {props.showOnlyFixableVulnerabilities && (
                              <>
                                {getWarningCellAboutNotDisplayedVulnerabilities(
                                  allVulnerabilities.list.length,
                                  list.length
                                )}
                              </>
                            )}
                            {visibleVulnerabilities.map((item: Vulnerability, index: number) => {
                              const vulnerabilityName = `${item.VulnerabilityID}_${index}`;
                              return (
                                <SecurityCell
                                  name={vulnerabilityName}
                                  vulnerability={item}
                                  key={`cell_${item.PkgName}_${item.VulnerabilityID}_${index}`}
                                  isExpanded={visibleVulnerability === vulnerabilityName}
                                  setVisibleVulnerability={setVisibleVulnerability}
                                />
                              );
                            })}
                            {list.length > visibleVulnerabilities.length && (
                              <tr>
                                <td colSpan={6} className="align-middle text-end pt-3">
                                  <span className="text-muted fst-italic">
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
