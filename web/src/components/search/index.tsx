import React, { useState, useEffect, useReducer, Dispatch, SetStateAction } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import isUndefined from 'lodash/isUndefined';
import isNull from 'lodash/isNull';
import filter from 'lodash/filter';
import isEmpty from 'lodash/isEmpty';
import every from 'lodash/every';
import isEqual from 'lodash/isEqual';
import API from '../../api';
import { Package, Facets, Filters as FiltersProp, SearchResults } from '../../types';
import List from './List';
import SubNavbar from '../navigation/SubNavbar';
import Filters from './Filters';
import MobileFilters from './MobileFilters';
import getSearchParams from '../../utils/getSearchParams';
import NoData from '../common/NoData';
import Loading from '../common/Loading';
import prepareFiltersQuery from '../../utils/prepareFiltersQuery';
import Pagination from '../common/Pagination';
import PaginationLimit from './PaginationLimit';
import useLocalStorage from '../../hooks/useLocalStorage';
import useScrollRestorationFix from '../../hooks/useScrollRestorationFix';
import styles from './Search.module.css';

interface Props {
  isSearching: boolean;
  setIsSearching: Dispatch<SetStateAction<boolean>>;
  scrollPosition: number;
  setScrollPosition: Dispatch<SetStateAction<number>>;
}

interface Action {
  type: string;
  payload?: {
    filterId: string;
    id: string;
  };
}

const updateFiltersList = (list: string[] | undefined, id: string, action: 'add' | 'remove'): string[] => {
  let finalList = isUndefined(list) ? [] : list.slice();
  switch (action) {
    case 'add':
      finalList.push(id);
      break;
    case 'remove':
      const filteredList = filter(finalList, (t: string) => {
        return t !== id;
      });
      finalList = filteredList;
      break;
  }

  return finalList;
}

const reducer = (state: FiltersProp, action: Action) => {
  switch (action.type) {
    case 'add':
      return {
        ...state,
        [action.payload!.filterId]: updateFiltersList(state[action.payload!.filterId], action.payload!.id, 'add'),
      };

    case 'remove':
      return {
        ...state,
        [action.payload!.filterId]: updateFiltersList(state[action.payload!.filterId], action.payload!.id, 'remove'),
      };
    case 'reset': {
      return {};
    }

    default:
      throw new Error('Unexpected action');
  }
}

const DEFAULT_LIMIT = 15;

const Search = (props: Props) => {
  const location = useLocation();
  const history = useHistory();
  const query = getSearchParams(location.search);
  const [limit, setLimit] = useLocalStorage('limit', DEFAULT_LIMIT.toString());
  const [offset, setOffset] = useState((query.pageNumber - 1) * limit);
  const [total, setTotal] = useState(0);
  const [packages, setPackages] = useState<Package[] | null>(null);
  const [facets, setFacets] = useState<Facets[] | null>(null);
  const [pageNumber, setPageNumber] = useState(query.pageNumber);
  const [activeFilters, dispatch] = useReducer(reducer, query.filters);
  const [searchQuery, setSearchQuery] = useState({
    text: query.text,
    filters: activeFilters,
    limit: limit,
    offset: offset,
    total: total,
    pageNumber: pageNumber,
  });
  const [emptyFacets, setEmptyFacets] = useState(true);
  const { isSearching, setIsSearching, scrollPosition, setScrollPosition } = props;

  useScrollRestorationFix();

  const saveScrollPosition = () => {
    setScrollPosition(window.scrollY);
  };

  useEffect(() => {
    if (!isNull(facets)) {
      setEmptyFacets(every(facets, (f: Facets) => { return f.options.length === 0 }));
    }
  }, [facets]);

  useEffect(() => {
    if (pageNumber !== query.pageNumber) {
      setPageNumber(query.pageNumber);
    }
  }, [query.pageNumber, pageNumber]);

  useEffect(() => {
    const shouldUpdateQuery = () => {
      if (isNull(packages)) {
        return true;
      }
      if (searchQuery.pageNumber !== pageNumber) {
        window.scrollTo(0, 0);
        return true;
      }
      if (!isEqual(searchQuery.filters, activeFilters)) {
        if (searchQuery.pageNumber === 1) {
          return true;
        } else {
          setPageNumber(1);
          return false;
        }
      }
      if (
        searchQuery.text !== query.text ||
        (searchQuery.text === query.text && isEmpty(query.filters) && !isEmpty(searchQuery.filters))
      ) {
        if (!isEmpty(activeFilters)) {
          dispatch({ type: 'reset' });
          return false;
        }
        if (searchQuery.pageNumber !== 1) {
          setPageNumber(1);
          return false;
        }
        return true;
      }
      if (searchQuery.limit !== limit) {
        if (searchQuery.pageNumber === 1) {
          return true;
        } else {
          setPageNumber(1);
          return false;
        }
      }

      return false;
    }

    if (!isUndefined(query.text) && !isSearching && shouldUpdateQuery()) {
      setIsSearching(true);
      setSearchQuery({
        ...searchQuery,
        text: query.text,
        filters: activeFilters,
        offset: (pageNumber - 1) * limit,
        limit: limit,
        pageNumber: pageNumber,
      });
    }
  }, [query.text, query.filters, isSearching, setIsSearching, activeFilters, searchQuery, packages, limit, pageNumber]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value, checked } = e.target;
    const payload = {
      filterId: name,
      id: value,
    };

    if (checked) {
      dispatch({ type: 'add', payload });
    } else {
      dispatch({ type: 'remove', payload });
    }
  };

  useEffect(() => {
    const updateLocation = () => {
      const params = new URLSearchParams();
      params.set('text', searchQuery.text!);
      params.set('page', (searchQuery.pageNumber!).toString());

      history.replace({
        pathname: '/search',
        search: `?${params.toString()}${prepareFiltersQuery(searchQuery.filters)}`,
      });
    };

    const shouldUpdateScrollPosition = () => {
      const fromDetail = !isUndefined(location.state) ? location.state.fromDetail : false;
      if (fromDetail) {
        window.scrollTo(0, scrollPosition);
      } else {
        setScrollPosition(0);
      }
    };

    const preloadNextPage = (searchResults: SearchResults) => {
      if (searchResults.metadata.total > (searchResults.metadata.limit + searchResults.metadata.offset)) {
        API.searchPackages({
          ...searchQuery,
          offset: pageNumber * limit,
        });
      }
    }

    async function fetchSearchResults() {
      try {
        const searchResults = await API.searchPackages({...searchQuery});
        setPackages(searchResults.data.packages);
        setFacets(searchResults.data.facets);
        setTotal(searchResults.metadata.total);
        setLimit(searchResults.metadata.limit);
        setOffset(searchResults.metadata.offset);
        preloadNextPage(searchResults);
      } catch {
        // TODO - show error badge
        setPackages([]);
      } finally {
        setIsSearching(false);
        shouldUpdateScrollPosition();
      }
    };

    if (isSearching) {
      updateLocation();
      fetchSearchResults();
    }
  }, [isSearching]); /* eslint-disable-line react-hooks/exhaustive-deps */

  return (
    <>
      <SubNavbar>
        <div className="d-flex align-items-center">
          {!isNull(packages) && (
            <>
              {!emptyFacets && (
                <MobileFilters
                  {...query}
                  facets={facets}
                  activeFilters={searchQuery.filters}
                  onChange={onChange}
                  packagesNumber={total}
                  isLoading={isSearching}
                />
              )}
              {!isSearching && (
                <>
                  {total > 0 && (
                    <span className="pr-1">{offset || '1'} - {total < limit * pageNumber ? total : limit * pageNumber} of</span>
                  )}
                  {total} results <span className="d-none d-sm-inline pl-1">for "<span className="font-weight-bold">{searchQuery.text}</span>"</span>
                </>
              )}
            </>
          )}
        </div>

        <div>
          <PaginationLimit limit={limit} setLimit={setLimit} />
        </div>
      </SubNavbar>

      <div className="d-flex position-relative pt-3 pb-3 flex-grow-1">
        {(isSearching || isNull(packages)) && <Loading />}

        <main role="main" className="container d-flex flex-row justify-content-between">
          {!emptyFacets && (
            <nav className={`d-none d-md-block ${styles.sidebar}`}>
              <div className="mr-5">
                <Filters
                  {...query}
                  facets={facets}
                  activeFilters={searchQuery.filters}
                  onChange={onChange}
                  visibleTitle
                />
              </div>
            </nav>
          )}

          <div className="flex-grow-1 mw-100">
            {!isNull(packages) && (
              <>
                {packages.length === 0 || isUndefined(searchQuery.text) ? (
                  <NoData>
                    <>
                      We're sorry!
                      <p className="h6 mb-0 mt-3">
                        We can't seem to find any packages that match your search for "<span className="font-weight-bold">{searchQuery.text}</span>"
                      </p>
                    </>
                  </NoData>
                ) : (
                  <>
                    <List
                      packages={packages}
                      pageNumber={searchQuery.pageNumber.toString()}
                      searchText={searchQuery.text}
                      filtersQuery={prepareFiltersQuery(searchQuery.filters)}
                      saveScrollPosition={saveScrollPosition}
                    />

                    <Pagination
                      limit={limit}
                      offset={offset}
                      total={total}
                      active={searchQuery.pageNumber}
                    />
                  </>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

export default Search;
