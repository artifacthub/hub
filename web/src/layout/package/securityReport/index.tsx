import { isEmpty, isNull, isUndefined } from 'lodash';
import React from 'react';

import { SearchFiltersURL, SecurityReportSummary, VulnerabilitySeverity } from '../../../types';
import { SEVERITY_ORDER, SEVERITY_RATING } from '../../../utils/data';
import prettifyNumber from '../../../utils/prettifyNumber';
import sumObjectValues from '../../../utils/sumObjectValues';
import SecurityRating from '../../common/SecutityRating';
import SmallTitle from '../../common/SmallTitle';
import SecurityModal from './Modal';
import styles from './SecurityReport.module.css';

interface Props {
  className?: string;
  summary?: SecurityReportSummary | null;
  packageId: string;
  version: string;
  createdAt?: number;
  visibleSecurityReport: boolean;
  searchUrlReferer?: SearchFiltersURL;
  fromStarredPage?: boolean;
}

const SecurityReport = (props: Props) => {
  if (isNull(props.summary) || isUndefined(props.summary) || isEmpty(props.summary)) return null;

  const total: number = sumObjectValues(props.summary);

  return (
    <div className={props.className}>
      <SmallTitle text="Security Report" />

      <div className="mb-3">
        {total === 0 ? (
          <div className="d-flex flex-row align-items-center mb-2">
            <div>
              <small>No vulnerabilities found</small>
            </div>
            <SecurityRating summary={props.summary} className="position-relative ml-2" onlyBadge />
          </div>
        ) : (
          <div className="d-flex flex-row align-items-center mb-2">
            <div>
              <small>
                <span className="font-weight-bold mr-1">{prettifyNumber(total, 1)}</span>vulnerabilities found
              </small>
            </div>
            <SecurityRating summary={props.summary} className="position-relative ml-1" onlyBadge />
          </div>
        )}

        {total > 0 && (
          <>
            {SEVERITY_ORDER.map((severity: VulnerabilitySeverity) => {
              if (!props.summary!.hasOwnProperty(severity) || props.summary![severity] === 0) return null;
              return (
                <div
                  key={`summary_${severity}`}
                  data-testid="summaryItem"
                  className={`d-flex justify-content-between align-items-center pb-2 pb-md-0 pt-1 ${styles.summary}`}
                >
                  <div className="d-flex flex-row align-items-center">
                    <span
                      data-testid="summaryBadge"
                      className={`badge position-relative mr-2 ${styles.badge}`}
                      style={{ backgroundColor: SEVERITY_RATING[severity]!.color }}
                    >
                      {' '}
                    </span>
                    <span className={`text-uppercase ${styles.title}`}>{severity}</span>
                  </div>
                  <span className={`badge badge-pill ${styles.badgeItems}`}>{props.summary![severity]}</span>
                </div>
              );
            })}
          </>
        )}

        <div className="d-none d-md-block">
          <SecurityModal
            summary={props.summary!}
            totalVulnerabilities={total}
            packageId={props.packageId}
            version={props.version}
            createdAt={props.createdAt}
            visibleSecurityReport={props.visibleSecurityReport}
            searchUrlReferer={props.searchUrlReferer}
            fromStarredPage={props.fromStarredPage}
          />
        </div>
      </div>
    </div>
  );
};

export default SecurityReport;
