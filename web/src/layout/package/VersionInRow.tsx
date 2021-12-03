import moment from 'moment';
import { useHistory } from 'react-router-dom';

import { Repository, SearchFiltersURL } from '../../types';
import buildPackageURL from '../../utils/buildPackageURL';
import styles from './VersionInRow.module.css';

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

const VersionInRow = (props: Props) => {
  const history = useHistory();

  const openPackagePage = () => {
    history.push({
      pathname: buildPackageURL(props.normalizedName, props.repository, props.version, true),
      state: { searchUrlReferer: props.searchUrlReferer, fromStarredPage: props.fromStarredPage },
    });
  };

  const formattedDate = moment.unix(props.ts!).format('D MMM, YYYY');

  return (
    <tr>
      <td className={`w-75 ${styles.versionCell}`}>
        <div className="d-flex flex-row align-items-center px-1">
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
          {props.linkedChannel && (
            <span className={`badge rounded-pill me-2 border ${styles.badge} ${styles.isHighlighted}`}>
              <small className="text-uppercase me-1">Channel:</small>
              {props.linkedChannel}
            </span>
          )}
          {props.prerelease && <span className={`badge rounded-pill me-2 border ${styles.badge}`}>Pre-release</span>}
          {props.containsSecurityUpdates && (
            <span className={`badge rounded-pill border ${styles.badge}`}>Contains security updates</span>
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
