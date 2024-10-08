import isEmpty from 'lodash/isEmpty';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { useCallback, useEffect, useState } from 'react';

import { ContainerImage, RepositoryKind, SecurityReportSummary, VulnerabilitySeverity } from '../../../types';
import calculateDiffInYears from '../../../utils/calculateDiffInYears';
import { SEVERITY_ORDER, SEVERITY_RATING } from '../../../utils/data';
import prettifyNumber from '../../../utils/prettifyNumber';
import sumObjectValues from '../../../utils/sumObjectValues';
import SecurityRating from '../../common/SecurityRating';
import SmallTitle from '../../common/SmallTitle';
import SecurityModal from './Modal';
import styles from './SecurityReport.module.css';

interface Props {
  repoKind: RepositoryKind;
  disabledReport: boolean;
  allContainersImagesWhitelisted: boolean;
  containers: ContainerImage[];
  className?: string;
  summary?: SecurityReportSummary | null;
  packageId: string;
  ts: number;
  version: string;
  createdAt?: number;
  visibleSecurityReport: boolean;
  visibleImage?: string | null;
  visibleTarget?: string | null;
  visibleSection?: string | null;
  eventId?: string | null;
}

const SecurityReport = (props: Props) => {
  const [isOlderThanOneYear, setIsOlderThanOneYear] = useState<boolean>(true);

  const hasSomeWhitelistedContainers = useCallback((): boolean => {
    return props.containers.some((container: ContainerImage) => container.whitelisted);
  }, [props.containers]);

  const [total, setTotal] = useState(props.summary ? sumObjectValues(props.summary) : 0);
  const [hasWhitelistedContainers, setHasWhitelistedContainers] = useState<boolean>(hasSomeWhitelistedContainers());

  useEffect(() => {
    setTotal(props.summary ? sumObjectValues(props.summary) : 0);
  }, [props.summary]);

  useEffect(() => {
    setHasWhitelistedContainers(hasSomeWhitelistedContainers());
  }, [props.containers]);

  useEffect(() => {
    const diffInYears = calculateDiffInYears(props.ts);
    setIsOlderThanOneYear(diffInYears > 1);
  }, [props.ts]);

  // Do not display security reports when version is older than 1 year
  if (isOlderThanOneYear) return null;

  if (!props.disabledReport) {
    if (isNull(props.summary) || isUndefined(props.summary) || isEmpty(props.summary)) {
      if (props.containers.length === 0) {
        return null;
      } else if (!props.allContainersImagesWhitelisted) {
        return null;
      }
    }
  }

  return (
    <div className={props.className}>
      <SmallTitle text="Security Report" />

      <div className="mb-3">
        {props.disabledReport || props.allContainersImagesWhitelisted ? (
          <div className={styles.disabledBadgeWrapper}>
            <div className={`text-muted mt-2 ${styles.legend}`}>
              Security scanning of this package has been disabled by the publisher.
            </div>
          </div>
        ) : (
          <>
            {total === 0 ? (
              <div className="d-flex flex-row align-items-center mb-2">
                <div>
                  <small>No vulnerabilities found</small>
                </div>
                <SecurityRating summary={props.summary} className="position-relative ms-2" onlyBadge />
                {hasWhitelistedContainers && <span className="fw-bold ms-1">*</span>}
              </div>
            ) : (
              <div className="d-flex flex-row align-items-center mb-2">
                <div>
                  <small>
                    <span className="fw-bold me-1">{prettifyNumber(total, 1)}</span>vulnerabilities found
                  </small>
                </div>
                <SecurityRating summary={props.summary} className="position-relative ms-1" onlyBadge />
                {hasWhitelistedContainers && <span className="fw-bold ms-1">*</span>}
              </div>
            )}

            {hasWhitelistedContainers && (
              <div className={`text-muted mb-2 ${styles.legend}`}>
                * Some containers images used by this package have been whitelisted by the publisher, which may affect
                the security rating.
              </div>
            )}

            {total > 0 && (
              <>
                {SEVERITY_ORDER.map((severity: VulnerabilitySeverity) => {
                  if (isUndefined(props.summary![severity]) || props.summary![severity] === 0) return null;
                  return (
                    <div
                      key={`summary_${severity}`}
                      data-testid="summaryItem"
                      className={`d-flex justify-content-between align-items-center pb-2 pb-md-0 pt-1 ${styles.summary}`}
                    >
                      <div className="d-flex flex-row align-items-center">
                        <span
                          data-testid="summaryBadge"
                          className={`badge position-relative me-2 ${styles.badge}`}
                          style={{ backgroundColor: SEVERITY_RATING[severity]!.color }}
                        >
                          {' '}
                        </span>
                        <span className={`text-uppercase ${styles.title}`}>{severity}</span>
                      </div>
                      <span className={`badge text-dark rounded-pill ${styles.badgeItems}`}>
                        {props.summary![severity]}
                      </span>
                    </div>
                  );
                })}
              </>
            )}

            <div className="d-none d-md-block">
              <SecurityModal
                repoKind={props.repoKind}
                summary={props.summary!}
                totalVulnerabilities={total}
                packageId={props.packageId}
                version={props.version}
                createdAt={props.createdAt}
                visibleSecurityReport={props.visibleSecurityReport}
                visibleImage={props.visibleImage}
                visibleTarget={props.visibleTarget}
                visibleSection={props.visibleSection}
                eventId={props.eventId}
                hasWhitelistedContainers={hasWhitelistedContainers}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SecurityReport;
