import React, { useState, useEffect, useReducer, Dispatch, SetStateAction } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import isUndefined from 'lodash/isUndefined';
import isNull from 'lodash/isNull';
import filter from 'lodash/filter';
import every from 'lodash/every';
import isEqual from 'lodash/isEqual';
import API from '../../api';
import { Package, Facets, Filters as FiltersProp } from '../../types';
import List from './List';
import SortBy from './SortBy';
import SubNavbar from '../navigation/SubNavbar';
import Filters from './Filters';
import MobileFilters from './MobileFilters';
import getSearchParams from '../../utils/getSearchParams';
import NoData from '../common/NoData';
import Loading from '../common/Loading';
import styles from './Search.module.css';
import prepareFiltersQuery from '../../utils/prepareFiltersQuery';

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

const Search = (props: Props) => {
  const location = useLocation();
  const history = useHistory();
  const query = getSearchParams(location.search);
  const [sortBy, setSortBy] = useState<'asc' | 'desc'>('asc');
  const [packages, setPackages] = useState<Package[] | null>(null);
  const [facets, setFacets] = useState<Facets[] | null>(null);
  const [activeFilters, dispatch] = useReducer(reducer, query.filters);
  const [search, setSearch] = useState({
    text: query.text,
    filters: activeFilters,
  });
  const [emptyFacets, setEmptyFacets] = useState(true);
  const { isSearching, setIsSearching, scrollPosition, setScrollPosition } = props;

  const saveScrollPosition = () => {
    props.setScrollPosition(window.scrollY);
  }

  useEffect(() => {
    if (!isNull(facets)) {
      setEmptyFacets(every(facets, (f: Facets) => { return f.options.length === 0 }));
    }
  }, [facets]);

  useEffect(() => {
    if (!isUndefined(query.text) && !isSearching && (!isEqual(search.filters, activeFilters) || search.text !== query.text || isNull(packages))) {
      setSearch({text: query.text, filters: activeFilters});
      setIsSearching(true);
    }
  }, [query.text, isSearching, props.setScrollPosition, setIsSearching, activeFilters, search, packages]);

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
      history.replace({
        pathname: '/search',
        search: `?text=${encodeURIComponent(search.text!)}${prepareFiltersQuery(search.filters)}`,
      });
    };

    const shouldUpdateScrollPosition = () => {
      const fromDetail = location.state ? location.state.fromDetail : undefined;
      if (fromDetail) {
        window.scrollTo(0, scrollPosition);
      } else {
        setScrollPosition(0);
      }
    };

    async function fetchSearchResults() {
      try {
        const searchResults = await API.searchPackages(search.text!, search.filters);
        setPackages(searchResults.data.packages);
        setFacets(searchResults.data.facets);
      } catch {
        // TODO - show error badge
        setPackages([]);
      } finally {
        setIsSearching(false);
        updateLocation();
        shouldUpdateScrollPosition();
      }
    };

    if (isSearching) {
      fetchSearchResults();
    }
  }, [isSearching, setIsSearching, search, location, history, scrollPosition, setScrollPosition]);

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
                  activeFilters={search.filters}
                  onChange={onChange}
                  packagesNumber={isNull(packages) ? 0 : packages.length}
                  isLoading={isSearching}
                />
              )}
              {!isSearching && (
                <>{packages.length} results <span className="d-none d-sm-inline pl-2">for "<span className="font-weight-bold">{search.text}</span>"</span></>
              )}
            </>
          )}
        </div>

        <div>
          <SortBy setSortBy={setSortBy} value={sortBy} disabled={isSearching} />
        </div>
      </SubNavbar>

      <div className="d-flex position-relative pt-3 pb-3 flex-grow-1">
        {(isSearching || isNull(packages)) && <Loading />}

        <main role="main" className="container d-flex flex-row justify-content-between">
          {!emptyFacets && (
            <nav className={`d-none d-md-block ${styles.sidebar}`}>
              {/* TODO - sticky-top not working with long list of filters, we need to check different solutions */}
              <div className="mr-5">
                <Filters
                  {...query}
                  facets={facets}
                  activeFilters={search.filters}
                  onChange={onChange}
                  visibleTitle
                />
              </div>
            </nav>
          )}

          <div className="flex-grow-1 mw-100">
            {!isNull(packages) && (
              <>
                {packages.length === 0 || isUndefined(search.text) ? (
                  <NoData>
                    <>
                      We're sorry!
                      <p className="h6 mb-0 mt-3">We can't seem to find any packages that match your search for "<span className="font-weight-bold">{search.text}</span>"</p>
                    </>
                  </NoData>
                ) : (
                  <List sortBy={sortBy} packages={packages} searchText={search.text} filtersQuery={prepareFiltersQuery(search.filters)} saveScrollPosition={saveScrollPosition} />
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
