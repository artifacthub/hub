import every from 'lodash/every';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { FaFilter } from 'react-icons/fa';
import { useHistory } from 'react-router-dom';

import { API } from '../../api';
import useLocalStorage from '../../hooks/useLocalStorage';
import useScrollRestorationFix from '../../hooks/useScrollRestorationFix';
import { Facets, Package, SearchResults } from '../../types';
import prepareQueryString from '../../utils/prepareQueryString';
import Loading from '../common/Loading';
import NoData from '../common/NoData';
import Pagination from '../common/Pagination';
import Sidebar from '../common/Sidebar';
import SubNavbar from '../navigation/SubNavbar';
import Filters from './Filters';
import PackageCard from './PackageCard';
import PaginationLimit from './PaginationLimit';
import styles from './SearchView.module.css';

interface Props {
  isSearching: boolean;
  setIsSearching: Dispatch<SetStateAction<boolean>>;
  scrollPosition: number;
  setScrollPosition: Dispatch<SetStateAction<number>>;
  text?: string;
  pageNumber: number;
  filters: {
    [key: string]: string[];
  };
  deprecated: boolean;
  fromDetail: boolean;
}

const DEFAULT_LIMIT = 15;

const SearchView = (props: Props) => {
  const history = useHistory();
  const [limit, setLimit] = useLocalStorage('limit', DEFAULT_LIMIT.toString());
  const [searchResults, setSearchResults] = useState<SearchResults>({
    data: {
      facets: null,
      packages: null,
    },
    metadata: {
      offset: 0,
      total: 0,
      limit: limit,
    },
  });
  const { isSearching, setIsSearching, scrollPosition, setScrollPosition } = props;

  const isEmptyFacets = (): boolean => {
    if (isNull(searchResults.data.facets)) {
      return true;
    } else {
      return every(searchResults.data.facets, (f: Facets) => {
        return f.options.length === 0;
      });
    }
  };

  useScrollRestorationFix();

  const saveScrollPosition = () => {
    setScrollPosition(window.scrollY);
  };

  const updateWindowScrollPosition = (newPosition: number) => {
    window.scrollTo(0, newPosition);
  };

  const onFiltersChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value, checked } = e.target;
    let newFilters = isUndefined(props.filters[name]) ? [] : props.filters[name].slice();
    if (checked) {
      newFilters.push(value);
    } else {
      newFilters = newFilters.filter((el) => el !== value);
    }

    history.push({
      pathname: '/packages/search',
      search: prepareQueryString({
        pageNumber: 1,
        text: props.text,
        filters: {
          ...props.filters,
          [name]: newFilters,
        },
        deprecated: props.deprecated,
      }),
    });
  };

  const onDeprecatedChange = (): void => {
    history.push({
      pathname: '/packages/search',
      search: prepareQueryString({
        pageNumber: props.pageNumber,
        text: props.text,
        filters: props.filters,
        deprecated: !props.deprecated,
      }),
    });
  };

  const onPageChange = (pageNumber: number): void => {
    history.push({
      pathname: '/packages/search',
      search: prepareQueryString({
        pageNumber: pageNumber,
        text: props.text,
        filters: props.filters,
        deprecated: props.deprecated,
      }),
    });
  };

  const onPaginationLimitChange = (newLimit: number): void => {
    history.replace({
      pathname: '/packages/search',
      search: prepareQueryString({
        pageNumber: 1,
        text: props.text,
        filters: props.filters,
        deprecated: props.deprecated,
      }),
    });
    setScrollPosition(0);
    updateWindowScrollPosition(0);
    setLimit(newLimit);
  };

  useEffect(() => {
    async function fetchSearchResults() {
      setIsSearching(true);
      const query = {
        text: props.text,
        filters: props.filters,
        offset: (props.pageNumber - 1) * parseInt(limit),
        limit: parseInt(limit),
        deprecated: props.deprecated,
      };

      try {
        const searchResults = await API.searchPackages(query);
        setSearchResults({ ...searchResults });

        // Preload next page if required
        if (total > limit + offset) {
          API.searchPackages({
            ...query,
            offset: props.pageNumber * limit,
          });
        }
      } catch {
        // TODO - show error badge
        setSearchResults({
          data: {
            facets: [],
            packages: [],
          },
          metadata: {
            total: 0,
            offset: 0,
            limit: 0,
          },
        });
      } finally {
        setIsSearching(false);
        // Update scroll position
        if (history.action === 'PUSH') {
          // When search page is open from detail page
          if (props.fromDetail) {
            updateWindowScrollPosition(scrollPosition);
            // When search has changed
          } else {
            updateWindowScrollPosition(0);
          }
          // On pop action and when scroll position has been previously saved
        } else if (scrollPosition !== 0) {
          updateWindowScrollPosition(scrollPosition);
        }
      }
    }
    fetchSearchResults();

    // prettier-ignore
    /* eslint-disable react-hooks/exhaustive-deps */
  }, [
    props.text,
    props.pageNumber,
    JSON.stringify(props.filters), // https://twitter.com/dan_abramov/status/1104414272753487872
    props.deprecated,
    limit,
  ]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const { packages, facets } = searchResults.data;
  const { total, offset } = searchResults.metadata;

  return (
    <>
      <SubNavbar>
        <div className="d-flex align-items-center text-truncate">
          {!isNull(packages) && (
            <>
              {/* Mobile filters */}
              {!isEmptyFacets() && (
                <Sidebar
                  className="d-inline-block d-md-none mr-2"
                  wrapperClassName="px-4"
                  buttonType={`btn-sm rounded-circle ${styles.btnMobileFilters}`}
                  buttonIcon={<FaFilter />}
                  closeButton={
                    <>
                      {isSearching ? (
                        <>
                          <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
                          <span className="ml-2">Loading...</span>
                        </>
                      ) : (
                        <>See {total} results</>
                      )}
                    </>
                  }
                  header={<div className="h6 text-uppercase mb-0">Filters</div>}
                >
                  <Filters
                    facets={facets}
                    activeFilters={props.filters}
                    onChange={onFiltersChange}
                    deprecated={props.deprecated}
                    onDeprecatedChange={onDeprecatedChange}
                    visibleTitle={false}
                  />
                </Sidebar>
              )}

              {!isSearching && (
                <div data-testid="resultsText" className="text-truncate">
                  {total > 0 && (
                    <span className="pr-1">
                      {offset + 1} - {total < limit * props.pageNumber ? total : limit * props.pageNumber} of{' '}
                    </span>
                  )}
                  {total}
                  <span className="d-none d-sm-inline pl-1"> results </span>
                  {!isUndefined(props.text) && (
                    <span className="pl-1">
                      for "<span className="font-weight-bold">{props.text}</span>"
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="ml-3">
          <PaginationLimit
            limit={limit}
            updateLimit={onPaginationLimitChange}
            disabled={isNull(searchResults.data.packages) || searchResults.data.packages.length === 0}
          />
        </div>
      </SubNavbar>

      <div className="d-flex position-relative pt-3 pb-3 flex-grow-1">
        {(isSearching || isNull(packages)) && <Loading />}

        <main role="main" className="container d-flex flex-row justify-content-between">
          {!isEmptyFacets() && (
            <nav className={`d-none d-md-block ${styles.sidebar}`}>
              <div className="mr-5">
                <Filters
                  facets={facets}
                  activeFilters={props.filters}
                  onChange={onFiltersChange}
                  deprecated={props.deprecated}
                  onDeprecatedChange={onDeprecatedChange}
                  visibleTitle
                />
              </div>
            </nav>
          )}

          <div className="flex-grow-1 mw-100">
            {!isNull(packages) && (
              <>
                {packages.length === 0 ? (
                  <NoData>
                    <>
                      We're sorry!
                      <p className="h6 mb-0 mt-3">
                        <span> We can't seem to find any packages that match your search </span>
                        {!isUndefined(props.text) && (
                          <span className="pl-1">
                            for "<span className="font-weight-bold">{props.text}</span>"
                          </span>
                        )}
                      </p>
                    </>
                  </NoData>
                ) : (
                  <>
                    <div className="row no-gutters mb-2">
                      {packages.map((item: Package) => (
                        <PackageCard
                          key={item.packageId}
                          package={item}
                          searchUrlReferer={{
                            text: props.text,
                            pageNumber: props.pageNumber,
                            filters: props.filters,
                            deprecated: props.deprecated,
                          }}
                          saveScrollPosition={saveScrollPosition}
                        />
                      ))}
                    </div>

                    <Pagination
                      limit={limit}
                      offset={offset}
                      total={total}
                      active={props.pageNumber}
                      onChange={onPageChange}
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
};

export default SearchView;
