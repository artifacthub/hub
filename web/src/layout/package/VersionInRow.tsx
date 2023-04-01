import moment from 'moment';
import { useLocation, useNavigate } from 'react-router-dom';

import { Repository } from '../../types';
import buildPackageURL from '../../utils/buildPackageURL';
import styles from './VersionInRow.module.css';

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

const VersionInRow = (props: Props) => {
  const navigate = useNavigate();
  const location = useLocation();

  const openPackagePage = () => {
    navigate(
      {
        pathname: buildPackageURL(props.normalizedName, props.repository, props.version, true),
      },
      { state: location.state }
    );
  };

  const formattedDate = moment.unix(props.ts!).format('D MMM, YYYY');

  return (
    <tr>
      <td className={`w-75 ${styles.versionCell}`}>
        <div className="d-flex flex-row align-items-center px-1 overflow-auto">
          {props.isActive ? (
            <div className={`${styles.activeVersion} text-truncate`}>{props.version}</div>
          ) : (
            <button
              onClick={() => openPackagePage()}
              className={`btn btn-link text-primary ps-0 pt-0 pb-0 border-0 text-truncate d-block text-start ${styles.versionBtn}`}
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
      <td className="text-nowrap">
        <span className="text-muted px-1">{formattedDate}</span>
      </td>
    </tr>
  );
};

export default VersionInRow;
