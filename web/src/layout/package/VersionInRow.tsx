import moment from 'moment';
import React from 'react';
import { useHistory } from 'react-router-dom';

import { Repository, SearchFiltersURL } from '../../types';
import buildPackageURL from '../../utils/buildPackageURL';
import styles from './VersionInRow.module.css';

interface Props {
  isActive: boolean;
  version: string;
  containsSecurityUpdates: boolean;
  prerelease: boolean;
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

  const formattedDate = moment(props.ts! * 1000).format('D MMM, YYYY');

  return (
    <tr>
      <td className={styles.versionCell}>
        <div className="d-flex flex-row align-items-center px-1">
          {props.isActive ? (
            <div className={`${styles.activeVersion} text-truncate`}>{props.version}</div>
          ) : (
            <button
              data-testid="version"
              onClick={() => openPackagePage()}
              className="btn btn-link pl-0 pt-0 pb-0 border-0 text-truncate d-block text-left"
            >
              {props.version}
            </button>
          )}
          {props.prerelease && <span className={`badge badge-pill mr-2 ${styles.badge}`}>Pre-release</span>}
          {props.containsSecurityUpdates && (
            <span className={`badge badge-pill ${styles.badge}`}>Contains security updates</span>
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
