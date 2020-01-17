import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import List from './List';
import SortBy from './SortBy';
import getSearchParams from '../../utils/getSearchParams';
import usePackageSearch from '../../hooks/usePackageSearch';
import styles from './Search.module.css';

const Search = () => {
  const location = useLocation();
  const query = getSearchParams(location.search);
  const [sortBy, setSortBy] = useState<'asc' | 'desc'>('asc');
  const { packages, isLoading } = usePackageSearch(query.text || ''); // TODO return to home is text is empty

  return (
    <>
      {isLoading ? (
        <div className="text-center m-5">
          <div className="spinner-border" role="status">
            <span className="sr-only">Loading...</span>
          </div>
        </div>
      ) : (
        <>
          <nav className={`navbar navbar-expand-lg ${styles.navbar}`}>
            <div className="container-fluid d-flex justify-content-between">
              <div>
                {packages.length}
                <span className="d-none d-sm-inline"> results for "<span className="font-weight-bold">{query.text}</span>"</span>
              </div>

              <div>
                <SortBy setSortBy={setSortBy} value={sortBy} />
              </div>
            </div>
          </nav>

          <div className="d-flex h-100 position-relative">
            <main role="main" className={`d-flex flex-column justify-content-between ${styles.main}`}>
              <List sortBy={sortBy} packages={packages} />
            </main>
          </div>
        </>
      )}
    </>
  );
}

export default Search;
