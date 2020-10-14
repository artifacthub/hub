import { isEmpty, isNull } from 'lodash';
import React from 'react';
import { FaCheck, FaExclamationTriangle } from 'react-icons/fa';

import { SecurityReportSummary, VulnerabilitySeverity } from '../../../types';
import { SEVERITY_COLORS, SEVERITY_ORDER } from '../../../utils/data';
import sumObjectValues from '../../../utils/sumObjectValues';
import SmallTitle from '../../common/SmallTitle';
import SecurityModal from './Modal';
import styles from './SecurityReport.module.css';

interface Props {
  className?: string;
  summary: SecurityReportSummary | null;
  packageId: string;
  version: string;
}

const SecurityReport = (props: Props) => {
  if (isNull(props.summary) || isEmpty(props.summary)) return null;

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
            <FaCheck className="text-success ml-2" />
          </div>
        ) : (
          <div className="d-flex flex-row align-items-center mb-2">
            <div>
              <small>
                <span className="font-weight-bold mr-1">{total}</span> vulnerabilities found
              </small>
            </div>
            <FaExclamationTriangle className="text-warning ml-2" />
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
                      style={{ backgroundColor: SEVERITY_COLORS[severity] }}
                    >
                      {' '}
                    </span>
                    <span className={`text-uppercase ${styles.title}`}>{severity}</span>
                  </div>
                  <span className={`badge badge-pill ${styles.badgeItems}`}>{props.summary![severity]}</span>
                </div>
              );
            })}

            <div className="d-none d-md-block mt-md-3">
              <SecurityModal summary={props.summary!} packageId={props.packageId} version={props.version} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SecurityReport;
