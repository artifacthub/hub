import { format, fromUnixTime } from 'date-fns';
import { useLocation, useNavigate } from 'react-router-dom';

import { Repository } from '../../types';
import buildPackageURL from '../../utils/buildPackageURL';
import styles from './VersionInRow.module.css';

interface Props {
  isActive: boolean;
  version: string;
  appVersion?: string;
  containsSecurityUpdates: boolean;
  prerelease: boolean;
  linkedChannels?: string[];
  ts: number;
  normalizedName: string;
  repository: Repository;
  onClick?: () => void;
}

const VersionInRow = (props: Props) => {
  const navigate = useNavigate();
  const location = useLocation();

  const openPackagePage = () => {
    if (props.onClick) {
      props.onClick();
    }

    navigate(
      {
        pathname: buildPackageURL(props.normalizedName, props.repository, props.version, true),
      },
      { state: location.state }
    );
  };

  const formattedDate = format(fromUnixTime(props.ts!), 'd MMM, yyyy');

  return (
    <tr data-testid="tr-version-row">
      <td className={styles.versionCell}>
        <div className={`d-flex flex-row align-items-center px-3 overflow-auto ${styles.truncateWrapper}`}>
          {props.isActive ? (
            <div className={`${styles.activeVersion} text-truncate`}>{props.version}</div>
          ) : (
            <button
              onClick={() => openPackagePage()}
              className="btn btn-link text-primary ps-0 pt-0 pb-0 border-0 text-truncate d-block text-start"
              aria-label={`Open version ${props.version}`}
            >
              {props.version}
            </button>
          )}
          {props.linkedChannels && (
            <>
              {props.linkedChannels.map((channel: string) => {
                return (
                  <span
                    key={`vir_channel_${channel}`}
                    className={`badge me-2 border border-1 ${styles.badge} ${styles.isHighlighted}`}
                  >
                    <small className="text-uppercase me-1">Channel:</small>
                    {channel}
                  </span>
                );
              })}
            </>
          )}
          {props.prerelease && <span className={`badge me-2 border border-1 ${styles.badge}`}>Pre-release</span>}
          {props.containsSecurityUpdates && (
            <span className={`badge border border-1 ${styles.badge}`}>Contains security updates</span>
          )}
        </div>
      </td>
      <td>
        <span className="px-3">{props.appVersion || ''}</span>
      </td>
      <td className="text-nowrap">
        <span className="text-muted px-3">{formattedDate}</span>
      </td>
    </tr>
  );
};

export default VersionInRow;
