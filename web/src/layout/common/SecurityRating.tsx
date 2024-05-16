import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { SecurityReportSummary, SeverityRating as SRating, VulnerabilitySeverity } from '../../types';
import { SEVERITY_RATING } from '../../utils/data';
import ElementWithTooltip from './ElementWithTooltip';
import Label from './Label';
import styles from './SecurityRating.module.css';

interface Props {
  summary?: SecurityReportSummary | null;
  className?: string;
  tooltipClassName?: string;
  onlyBadge: boolean;
  withLink?: string;
  withoutTooltip?: boolean;
  onlyIcon?: boolean;
  tooltipAlignment?: 'right' | 'left';
}

const SecurityRating = (props: Props) => {
  const navigate = useNavigate();
  const [severity, setSeverity] = useState<SRating | undefined>();

  useEffect(() => {
    if (props.summary) {
      let rating = SEVERITY_RATING.default!;
      for (const key in VulnerabilitySeverity) {
        const sev = key.toLowerCase();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (props.summary && !isUndefined((props.summary as any)[sev]) && (props.summary as any)[sev] > 0) {
          rating = SEVERITY_RATING[sev as VulnerabilitySeverity]!;
          break;
        }
      }
      setSeverity(rating);
    }
  }, [props.summary]);

  if (isNull(props.summary) || isUndefined(props.summary) || isUndefined(severity)) return null;

  const badge = (className?: string) => (
    <ElementWithTooltip
      className={className}
      element={
        props.onlyBadge ? (
          <small>
            <div
              className={`badge text-light fw-bold ${styles.badge} ${className}`}
              style={{
                backgroundColor: severity.color,
              }}
            >
              {severity.level}
            </div>
          </small>
        ) : (
          <Label
            className={`fw-bold ${className}`}
            text="Images Security Rating"
            textForSmallDevices="Security Rating"
            bgLeftIcon={severity.color}
            labelStyle="custom"
            icon={<span className={`position-relative ${styles.ratingLetter}`}>{severity.level}</span>}
            onlyIcon={props.onlyIcon}
          />
        )
      }
      tooltipWidth={300}
      tooltipClassName={`${styles.tooltip} ${props.tooltipClassName} ${props.onlyBadge ? styles.onlyBadgeTooltip : ''}`}
      tooltipMessage={
        <div className="d-flex flex-column">
          <div className="d-flex flex-row align-items-center my-1">
            <span
              className={`badge text-light fw-semibold me-2 ${styles.badge}`}
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
              className={`badge text-light fw-semibold me-2 ${styles.badge}`}
              style={{
                backgroundColor: SEVERITY_RATING[VulnerabilitySeverity.Low]!.color,
              }}
            >
              {SEVERITY_RATING[VulnerabilitySeverity.Low]!.level}
            </span>
            <div>
              Vulnerabilities of severity <span className="fw-bold">LOW</span> found
            </div>
          </div>
          <div className="d-flex flex-row align-items-center my-1">
            <span
              className={`badge text-light fw-semibold me-2 ${styles.badge}`}
              style={{
                backgroundColor: SEVERITY_RATING[VulnerabilitySeverity.Medium]!.color,
              }}
            >
              {SEVERITY_RATING[VulnerabilitySeverity.Medium]!.level}
            </span>
            <div>
              Vulnerabilities of severity <span className="fw-bold">MEDIUM</span> found
            </div>
          </div>
          <div className="d-flex flex-row align-items-center my-1">
            <span
              className={`badge text-light fw-semibold me-2 ${styles.badge}`}
              style={{
                backgroundColor: SEVERITY_RATING[VulnerabilitySeverity.High]!.color,
              }}
            >
              {SEVERITY_RATING[VulnerabilitySeverity.High]!.level}
            </span>
            <div>
              Vulnerabilities of severity <span className="fw-bold">HIGH</span> found
            </div>
          </div>
          <div className="d-flex flex-row align-items-center my-1">
            <span
              className={`badge text-light fw-semibold me-2 ${styles.badge}`}
              style={{
                backgroundColor: SEVERITY_RATING[VulnerabilitySeverity.Critical]!.color,
              }}
            >
              {SEVERITY_RATING[VulnerabilitySeverity.Critical]!.level}
            </span>
            <div>
              Vulnerabilities of severity <span className="fw-bold">CRITICAL</span> found
            </div>
          </div>
          <div className="d-flex flex-row align-items-center my-1">
            <span
              className={`badge text-light fw-semibold me-2 ${styles.badge}`}
              style={{
                backgroundColor: SEVERITY_RATING[VulnerabilitySeverity.UnKnown]!.color,
              }}
            >
              {SEVERITY_RATING[VulnerabilitySeverity.UnKnown]!.level}
            </span>
            <div>
              Vulnerabilities of severity <span className="fw-bold">UNKNOWN</span> found
            </div>
          </div>
        </div>
      }
      visibleTooltip={isUndefined(props.withoutTooltip) || !props.withoutTooltip}
      active
    />
  );

  return (
    <>
      {props.withLink ? (
        <div className={props.className}>
          <button
            className={`btn btn-link text-reset p-0 position-relative ${styles.link}`}
            onClick={(e) => {
              e.preventDefault();
              navigate({
                pathname: props.withLink,
                search: '?modal=security-report',
              });
            }}
            aria-label="Open security report"
            aria-hidden="true"
            tabIndex={-1}
          >
            {badge()}
          </button>
        </div>
      ) : (
        <>{badge(props.className)}</>
      )}
    </>
  );
};

export default SecurityRating;
