import moment from 'moment';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { Repository } from '../../types';
import buildPackageURL from '../../utils/buildPackageURL';
import Loading from '../common/Loading';
import styles from './Version.module.css';

interface Props {
  isActive: boolean;
  version: string;
  containsSecurityUpdates: boolean;
  prerelease: boolean;
  linkedChannels?: string[];
  ts: number;
  normalizedName: string;
  repository: Repository;
}

const Version = (props: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  const openPackagePage = () => {
    setIsLoading(true);

    navigate(
      {
        pathname: buildPackageURL(props.normalizedName, props.repository, props.version, true),
      },
      { state: location.state }
    );
  };

  useEffect(() => {
    // Spinning is not rendered when version has been loaded
    if (props.isActive && isLoading) {
      setIsLoading(false);
    }
  }, [props.isActive, isLoading]);

  const formattedDate = moment.unix(props.ts!).format('D MMM, YYYY');

  const getBadges = () => (
    <>
      {(props.containsSecurityUpdates || props.prerelease || props.linkedChannels) && (
        <div className={`d-flex flex-column mb-1 ${styles.badgesWrapper}`}>
          {props.linkedChannels && (
            <>
              {props.linkedChannels.map((channel: string) => {
                return (
                  <div key={`v_channel_${channel}`} className="d-flex flex-row align-items-center">
                    <div className={`${styles.badgeDecorator} position-relative mx-1`} />
                    <span
                      className={`badge my-1 text-truncate border border-1 ${styles.badge} ${styles.isHighlighted}`}
                    >
                      <small className="text-uppercase me-1">Channel:</small>
                      {channel}
                    </span>
                  </div>
                );
              })}
            </>
          )}

          {props.prerelease && (
            <div className="d-flex flex-row align-items-center">
              <div className={`${styles.badgeDecorator} position-relative mx-1`} />
              <span className={`badge my-1 border border-1 ${styles.badge}`}>Pre-release</span>
            </div>
          )}

          {props.containsSecurityUpdates && (
            <div className="d-flex flex-row align-items-center">
              <div className={`${styles.badgeDecorator} position-relative mx-1`} />
              <span className={`badge my-1 border border-1 ${styles.badge}`}>Contains security updates</span>
            </div>
          )}
        </div>
      )}
    </>
  );

  return (
    <div className="py-1 py-sm-0 w-100 text-truncate" role="listitem">
      {props.isActive ? (
        <>
          <div className="d-flex flex-row align-items-baseline activeVersion mw-100">
            <div className={`text-truncate ${styles.version}`}>{props.version}</div>
            <small className={`text-muted ${styles.activeVersionDate}`}>({formattedDate})</small>
          </div>
          {getBadges()}
        </>
      ) : (
        <>
          <div className="d-flex flex-row align-items-baseline">
            <button
              onClick={() => openPackagePage()}
              className={`btn btn-link text-primary ps-0 pt-0 pb-0 border-0 text-truncate d-block mw-100 text-start ${styles.version}`}
              aria-label={`Open version ${props.version}`}
            >
              {props.version}
            </button>
            <small className="text-muted">({formattedDate})</small>
            {isLoading && (
              <div className={`position-relative ms-2 ${styles.spinnerWrapper}`}>
                <Loading noWrapper smallSize />
              </div>
            )}
          </div>
          {getBadges()}
        </>
      )}
    </div>
  );
};

export default Version;
