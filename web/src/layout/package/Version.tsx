import moment from 'moment';
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';

import { Repository, SearchFiltersURL } from '../../types';
import buildPackageURL from '../../utils/buildPackageURL';
import styles from './Version.module.css';

interface Props {
  isActive: boolean;
  version: string;
  containsSecurityUpdates: boolean;
  prerelease: boolean;
  linkedChannel?: string;
  ts: number;
  normalizedName: string;
  repository: Repository;
  searchUrlReferer?: SearchFiltersURL;
  fromStarredPage?: boolean;
}

const Version = (props: Props) => {
  const history = useHistory();
  const [isLoading, setIsLoading] = useState(false);

  const openPackagePage = () => {
    setIsLoading(true);

    history.push({
      pathname: buildPackageURL(props.normalizedName, props.repository, props.version, true),
      state: { searchUrlReferer: props.searchUrlReferer, fromStarredPage: props.fromStarredPage },
    });
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
      {(props.containsSecurityUpdates || props.prerelease || props.linkedChannel) && (
        <div className={`d-flex flex-column mb-1 ${styles.badgesWrapper}`}>
          {props.linkedChannel && (
            <div className="d-flex flex-row align-items-center">
              <div className={`${styles.badgeDecorator} position-relative mx-1`} />
              <span className={`badge badge-pill my-1 text-truncate ${styles.badge} ${styles.isHighlighted}`}>
                <small className="text-uppercase mr-1">Channel:</small>
                {props.linkedChannel}
              </span>
            </div>
          )}

          {props.prerelease && (
            <div className="d-flex flex-row align-items-center">
              <div className={`${styles.badgeDecorator} position-relative mx-1`} />
              <span className={`badge badge-pill my-1 ${styles.badge}`}>Pre-release</span>
            </div>
          )}

          {props.containsSecurityUpdates && (
            <div className="d-flex flex-row align-items-center">
              <div className={`${styles.badgeDecorator} position-relative mx-1`} />
              <span className={`badge badge-pill my-1 ${styles.badge}`}>Contains security updates</span>
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
            <div className="text-truncate">{props.version}</div>
            <small className={`text-muted ${styles.activeVersionDate}`}>({formattedDate})</small>
          </div>
          {getBadges()}
        </>
      ) : (
        <>
          <div className="d-flex flex-row align-items-baseline">
            <button
              onClick={() => openPackagePage()}
              className="btn btn-link text-primary pl-0 pt-0 pb-0 border-0 text-truncate d-block mw-100 text-left"
              aria-label={`Open version ${props.version}`}
            >
              {props.version}
            </button>
            <small className="text-muted">({formattedDate})</small>
            {isLoading && <span className="spinner-border spinner-border-sm ml-2" role="status" />}
          </div>

          {getBadges()}
        </>
      )}
    </div>
  );
};

export default Version;
