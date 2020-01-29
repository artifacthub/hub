import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import API from '../../api';
import { Package } from '../../types';
import List from './List';
import SortBy from './SortBy';
import SubNavbar from '../navigation/SubNavbar';
import Filters from './Filters';
import MobileFilters from './MobileFilters';
import getSearchParams from '../../utils/getSearchParams';
import NoData from '../common/NoData';
import Loading from '../common/Loading';
import styles from './Search.module.css';

const Search = () => {
  const location = useLocation();
  const query = getSearchParams(location.search);
  const [searchText, setSearchText] = useState<string>(query.text || ''); /* eslint-disable-line @typescript-eslint/no-unused-vars */
  const [sortBy, setSortBy] = useState<'asc' | 'desc'>('asc');
  const [isLoading, setIsLoading] = useState(true);
  const [packages, setPackages] = useState<Package[]>([]);

  if (query.text !== searchText) {
    setSearchText(query.text || '');
  }

  const onChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    // TODO change
  };

  useEffect(() => {
    async function fetchSearchResults() {
      try {
        const searchResults = await API.searchPackages(searchText);
        setPackages(searchResults.packages);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSearchResults();
  }, [searchText]);

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
                  <NoData>
                    <>
                      We're sorry!
                      <p className="h6 mb-0 mt-3">We can't seem to find any packages that match your search for "<span className="font-weight-bold">{searchText}</span>"</p>
                    </>
                  </NoData>
                ) : (
                  <List sortBy={sortBy} packages={packages} searchText={searchText} />
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
