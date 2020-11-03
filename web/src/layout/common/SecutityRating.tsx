import { isNull, isUndefined } from 'lodash';
import React, { useEffect, useState } from 'react';

import { SecurityReportSummary, SeverityRating as SRating, VulnerabilitySeverity } from '../../types';
import { SEVERITY_RATING } from '../../utils/data';
import ElementWithTooltip from './ElementWithTooltip';
import Label from './Label';
import styles from './SecurityRating.module.css';

interface Props {
  summary: SecurityReportSummary | null;
  className?: string;
  onlyBadge: boolean;
}

const SecurityRating = (props: Props) => {
  const [severity, setSeverity] = useState<SRating | undefined>();

  useEffect(() => {
    let rating = SEVERITY_RATING.default!;
    for (const key in VulnerabilitySeverity) {
      const sev = key.toLowerCase();
      if (!isNull(props.summary) && props.summary.hasOwnProperty(sev) && (props.summary as any)[sev] > 0) {
        rating = SEVERITY_RATING[sev as VulnerabilitySeverity]!;
        break;
      }
    }
    setSeverity(rating);
  }, [props.summary]);

  if (isNull(props.summary) || isUndefined(severity)) return null;

  return (
    <ElementWithTooltip
      className={props.className}
      element={
        props.onlyBadge ? (
          <small>
            <div
              className={`badge badge-pill text-light font-weight-bold ml-2 ${styles.badge} ${props.className}`}
              style={{
                backgroundColor: severity.color,
              }}
            >
              {severity.level}
            </div>
          </small>
        ) : (
          <Label
            className={props.className}
            text="Images Security Rating"
            bgRightIcon={severity.color}
            rightIcon={<>{severity.level}</>}
          />
        )
      }
      alignmentTooltip="right"
      tooltipClassName={`d-none d-md-block ${styles.tooltip}`}
      tooltipArrowClassName={styles.tooltipArrow}
      tooltipMessage={
        <div className="d-flex flex-column">
          <div className="d-flex flex-row align-items-center my-1">
            <span
              className={`badge badge-pill text-light font-weight-bold mr-2 ${styles.badge}`}
              style={{
                backgroundColor: SEVERITY_RATING.default!.color,
              }}
            >
              {SEVERITY_RATING.default!.level}
            </span>
            <div>No vulnerabilities found</div>
          </div>
          <div className="d-flex flex-row align-items-center my-1">
            <span
              className={`badge badge-pill text-light font-weight-bold mr-2 ${styles.badge}`}
              style={{
                backgroundColor: SEVERITY_RATING[VulnerabilitySeverity.Low]!.color,
              }}
            >
              {SEVERITY_RATING[VulnerabilitySeverity.Low]!.level}
            </span>
            <div>
              Vulnerabilities of severity <span className="font-weight-bold">LOW</span> found
            </div>
          </div>
          <div className="d-flex flex-row align-items-center my-1">
            <span
              className={`badge badge-pill text-light font-weight-bold mr-2 ${styles.badge}`}
              style={{
                backgroundColor: SEVERITY_RATING[VulnerabilitySeverity.Medium]!.color,
              }}
            >
              {SEVERITY_RATING[VulnerabilitySeverity.Medium]!.level}
            </span>
            <div>
              Vulnerabilities of severity <span className="font-weight-bold">MEDIUM</span> found
            </div>
          </div>
          <div className="d-flex flex-row align-items-center my-1">
            <span
              className={`badge badge-pill text-light font-weight-bold mr-2 ${styles.badge}`}
              style={{
                backgroundColor: SEVERITY_RATING[VulnerabilitySeverity.High]!.color,
              }}
            >
              {SEVERITY_RATING[VulnerabilitySeverity.High]!.level}
            </span>
            <div>
              Vulnerabilities of severity <span className="font-weight-bold">HIGH</span> found
            </div>
          </div>
          <div className="d-flex flex-row align-items-center my-1">
            <span
              className={`badge badge-pill text-light font-weight-bold mr-2 ${styles.badge}`}
              style={{
                backgroundColor: SEVERITY_RATING[VulnerabilitySeverity.Critical]!.color,
              }}
            >
              {SEVERITY_RATING[VulnerabilitySeverity.Critical]!.level}
            </span>
            <div>
              Vulnerabilities of severity <span className="font-weight-bold">CRITICAL</span> found
            </div>
          </div>
        </div>
      }
      visibleTooltip
      active
    />
  );
};

export default SecurityRating;
