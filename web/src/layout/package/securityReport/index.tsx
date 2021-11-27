import { isEmpty, isNull, isUndefined } from 'lodash';
import { useCallback, useEffect, useState } from 'react';

import { ContainerImage, SearchFiltersURL, SecurityReportSummary, VulnerabilitySeverity } from '../../../types';
import { SEVERITY_ORDER, SEVERITY_RATING } from '../../../utils/data';
import prettifyNumber from '../../../utils/prettifyNumber';
import sumObjectValues from '../../../utils/sumObjectValues';
import ScannerDisabledRepositoryBadge from '../../common/ScannerDisabledRepositoryBadge';
import SecurityRating from '../../common/SecurityRating';
import SmallTitle from '../../common/SmallTitle';
import SecurityModal from './Modal';
import styles from './SecurityReport.module.css';

interface Props {
  disabledReport: boolean;
  allContainersImagesWhitelisted: boolean;
  containers: ContainerImage[];
  className?: string;
  summary?: SecurityReportSummary | null;
  packageId: string;
  version: string;
  createdAt?: number;
  visibleSecurityReport: boolean;
  visibleImage?: string;
  visibleTarget?: string;
  visibleSection?: string;
  eventId?: string;
  searchUrlReferer?: SearchFiltersURL;
  fromStarredPage?: boolean;
}

const SecurityReport = (props: Props) => {
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
  }, [props.containers]); /* eslint-disable-line react-hooks/exhaustive-deps */

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
            <ScannerDisabledRepositoryBadge
              scannerDisabled={props.disabledReport}
              allContainersImagesWhitelisted={props.allContainersImagesWhitelisted}
            />
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
                <SecurityRating summary={props.summary} className="position-relative ml-2" onlyBadge />
                {hasWhitelistedContainers && <span className="font-weight-bold ml-1">*</span>}
              </div>
            ) : (
              <div className="d-flex flex-row align-items-center mb-2">
                <div>
                  <small>
                    <span className="font-weight-bold mr-1">{prettifyNumber(total, 1)}</span>vulnerabilities found
                  </small>
                </div>
                <SecurityRating summary={props.summary} className="position-relative ml-1" onlyBadge />
                {hasWhitelistedContainers && <span className="font-weight-bold ml-1">*</span>}
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
                visibleImage={props.visibleImage}
                visibleTarget={props.visibleTarget}
                visibleSection={props.visibleSection}
                eventId={props.eventId}
                searchUrlReferer={props.searchUrlReferer}
                fromStarredPage={props.fromStarredPage}
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
