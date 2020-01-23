import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import List from './List';
import SortBy from './SortBy';
import SubNavbar from '../navigation/SubNavbar';
import Filters from './Filters';
import MobileFilters from './MobileFilters';
import getSearchParams from '../../utils/getSearchParams';
import usePackageSearch from '../../hooks/usePackageSearch';
import NoData from '../common/NoData';
import Loading from '../common/Loading';
import styles from './Search.module.css';

const Search = () => {
  const location = useLocation();
  const query = getSearchParams(location.search);
  const searchText = query.text || '';  // TODO return to home is text is empty
  const [sortBy, setSortBy] = useState<'asc' | 'desc'>('asc');
  const { packages, isLoading } = usePackageSearch(searchText);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    // TODO change
  };

  return (
    <>
      {isLoading ? (
        <Loading />
      ) : (
        <>
          <SubNavbar>
            <div>
              <MobileFilters {...query} onChange={onChange} />
              {packages.length} results for "<span className="font-weight-bold">{query.text}</span>"
            </div>

            <div>
              <SortBy setSortBy={setSortBy} value={sortBy} />
            </div>
          </SubNavbar>

          <div className="d-flex position-relative mt-3 mb-3 flex-grow-1">
            <main role="main" className="container d-flex flex-row justify-content-between">
              <nav className={`d-none d-md-block ${styles.sidebar}`}>
                <div className="sticky-top mr-5">
                  <Filters {...query} onChange={onChange} />
                </div>
              </nav>

              <div className="flex-grow-1">
                {packages.length === 0 ? (
                  <NoData content="No packages matching your search criteria were found" />
                ) : (
                  <List sortBy={sortBy} packages={packages} />
                )}
              </div>
            </main>
          </div>
        </>
      )}
    </>
  );
}

export default Search;
