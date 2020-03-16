import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { SearchFiltersURL, Package } from '../../types';
import buildPackageURL from '../../utils/buildPackageURL';

interface Props {
  isActive: boolean;
  version: string;
  packageItem: Package;
  searchUrlReferer: SearchFiltersURL | null;
}

const Version = (props: Props) => {
  const history = useHistory();
  const [isLoading, setIsLoading] = useState(false);

  const openPackagePage = () => {
    setIsLoading(true);

    history.push({
      pathname: buildPackageURL(props.packageItem, true),
      state: props.searchUrlReferer,
    });
  }

  useEffect(() => {
    // Spinning is not rendered when version has been loaded
    if (props.isActive && isLoading) {
      setIsLoading(false);
    }
  }, [props.isActive, isLoading]);

  return (
    <div className="py-1 py-sm-0">
      {props.isActive ? (
        <div className="d-flex align-items-center text-truncate">
          {props.version}
        </div>
      ) : (
        <button
          data-testid="version"
          onClick={() => openPackagePage()}
          className="btn btn-link pl-0 pt-0 pb-0 text-truncate d-block"
        >
          {props.version}

          {isLoading && <span className="spinner-border spinner-border-sm ml-2" />}
        </button>
      )}
    </div>
  );
};

export default Version;
