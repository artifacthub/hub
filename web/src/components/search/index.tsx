import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import isUndefined from 'lodash/isUndefined';
import isNull from 'lodash/isNull';
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

interface Props {
  isVisible: boolean;
  root: HTMLElement | null;
}

interface Cache {
  text: string;
  ts: number;
};

const EXPIRATION = 5 * 60 * 1000; // 5min

const Search = (props: Props) => {
  const location = useLocation();
  const query = getSearchParams(location.search);
  const [searchText, setSearchText] = useState(query.text);
  const [sortBy, setSortBy] = useState<'asc' | 'desc'>('asc');
  const [isLoading, setIsLoading] = useState(false);
  const [packages, setPackages] = useState<Package[]>([]);
  const [cachedSearch, setCachedSearch] = useState<Cache | null>(null);
  const [scrollPosition, setScrollPosition] = useState(0);

  const saveScrollPosition = () => {
    if (!isNull(props.root)) {
      setScrollPosition(props.root.scrollTop);
    }
  }

  useEffect(() => {
    const shouldUpdateScrollPosition = () => {
      if (!isNull(props.root) && props.isVisible && window.scrollY !== scrollPosition) {
        props.root.scrollTo(0, scrollPosition);
      }
    };

    // shouldFetchData checks if cachedSearch is empty or searchText is new or current cachedSearch has expired.
    const shouldFetchData = () => {
      if (isNull(cachedSearch)) {
        return true;
      }
      if (cachedSearch.text !== query.text) {
        return true;
      }
      if (cachedSearch.ts + EXPIRATION < Date.now()) {
        return true;
      }

      shouldUpdateScrollPosition();
      return false;
    };

    if (props.isVisible && !isUndefined(query.text) && !isLoading && shouldFetchData()) {
      setIsLoading(true);
      setSearchText(query.text);
    }
  }, [props.isVisible, query.text, isLoading, cachedSearch, props.root, scrollPosition]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    // TODO change
  };

  useEffect(() => {
    async function fetchSearchResults() {
      if (!isUndefined(searchText)) {
        try {
          const searchResults = await API.searchPackages(searchText);
          setPackages(searchResults.packages);
          setCachedSearch({
            text: searchText,
            ts: Date.now(),
          });
        } catch {
          // TODO - show error badge
          setPackages([]);
        } finally {
          setCachedSearch({
            text: searchText,
            ts: Date.now(),
          });
          setIsLoading(false);
        }
      }
    };
    fetchSearchResults();
  }, [searchText]);

  if (!props.isVisible) return null;

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
                {packages.length === 0 || isUndefined(searchText) ? (
                  <NoData>
                    <>
                      We're sorry!
                      <p className="h6 mb-0 mt-3">We can't seem to find any packages that match your search for "<span className="font-weight-bold">{searchText}</span>"</p>
                    </>
                  </NoData>
                ) : (
                  <List sortBy={sortBy} packages={packages} searchText={searchText} saveScrollPosition={saveScrollPosition} />
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
