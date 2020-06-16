import moment from 'moment';
import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';

import { Package, SearchFiltersURL } from '../../types';
import buildPackageURL from '../../utils/buildPackageURL';
import styles from './Version.module.css';

interface Props {
  isActive: boolean;
  version: string;
  createdAt: number;
  packageItem: Package;
  searchUrlReferer?: SearchFiltersURL;
  fromStarredPage?: boolean;
}

const Version = (props: Props) => {
  const history = useHistory();
  const [isLoading, setIsLoading] = useState(false);

  const openPackagePage = () => {
    setIsLoading(true);

    history.push({
      pathname: buildPackageURL(props.packageItem, true),
      state: { searchUrlReferer: props.searchUrlReferer, fromStarredPage: props.fromStarredPage },
    });
  };

  useEffect(() => {
    // Spinning is not rendered when version has been loaded
    if (props.isActive && isLoading) {
      setIsLoading(false);
    }
  }, [props.isActive, isLoading]);

  const formattedDate = moment(props.createdAt! * 1000).format('D MMM, YYYY');

  return (
    <div className="py-1 py-sm-0 w-100 text-truncate">
      {props.isActive ? (
        <div className="text-truncate mw-100">
          {props.version}
          <small className={`text-muted ${styles.activeVersionDate}`}>({formattedDate})</small>
        </div>
      ) : (
        <div className="d-flex flex-row align-items-baseline">
          <button
            data-testid="version"
            onClick={() => openPackagePage()}
            className="btn btn-link pl-0 pt-0 pb-0 border-0 text-truncate d-block mw-100"
          >
            {props.version}
          </button>
          <small className="text-muted">({formattedDate})</small>
          {isLoading && <span className="spinner-border spinner-border-sm ml-2" role="status" />}
        </div>
      )}
    </div>
  );
};

export default Version;
