import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';

interface Props {
  isActive: boolean;
  version: string;
  packageId: string;
  searchText?: string;
  pageNumber?: string;
  filtersQuery?: string;
}

const Version = (props: Props) => {
  const history = useHistory();
  const [isLoading, setIsLoading] = useState(false);

  const openPackagePage = () => {
    setIsLoading(true);
    history.push({
      pathname: `/package/${props.packageId}/${props.version}`,
      state: { searchText: props.searchText, filtersQuery: props.filtersQuery, pageNumber: props.pageNumber },
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
