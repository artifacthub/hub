import classnames from 'classnames';
import every from 'lodash/every';
import isEmpty from 'lodash/isEmpty';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { FaFilter } from 'react-icons/fa';
import { IoMdCloseCircleOutline } from 'react-icons/io';
import { useHistory } from 'react-router-dom';

import { API } from '../../api';
import { AppCtx, updateLimit } from '../../context/AppCtx';
import useScrollRestorationFix from '../../hooks/useScrollRestorationFix';
import { Facets, Package, RepositoryKind, SearchFiltersURL, SearchResults } from '../../types';
import prepareQueryString from '../../utils/prepareQueryString';
import Loading from '../common/Loading';
import NoData from '../common/NoData';
import PackageCard from '../common/PackageCard';
import Pagination from '../common/Pagination';
import SampleQueries from '../common/SampleQueries';
import Sidebar from '../common/Sidebar';
import SubNavbar from '../navigation/SubNavbar';
import Filters from './Filters';
import PaginationLimit from './PaginationLimit';
import styles from './SearchView.module.css';

interface FiltersProp {
  [key: string]: string[];
}

interface Props {
  isSearching: boolean;
  setIsSearching: (status: boolean) => void;
  scrollPosition?: number;
  setScrollPosition: (position?: number) => void;
  tsQueryWeb?: string;
  tsQuery?: string[];
  pageNumber: number;
  filters: FiltersProp;
  deprecated?: boolean | null;
  operators?: boolean | null;
  verifiedPublisher?: boolean | null;
  official?: boolean | null;
  fromDetail: boolean;
}

const SearchView = (props: Props) => {
  const {
    pageNumber,
    tsQuery,
    tsQueryWeb,
    filters,
    deprecated,
    operators,
    verifiedPublisher,
    official,
    isSearching,
    setIsSearching,
    scrollPosition,
    setScrollPosition,
  } = props;
  const { ctx, dispatch } = useContext(AppCtx);
  const history = useHistory();
  const [searchResults, setSearchResults] = useState<SearchResults>({
    data: {
      facets: null,
      packages: null,
    },
    metadata: {
      offset: 0,
      total: 0,
      limit: ctx.prefs.search.limit,
    },
  });
  const [apiError, setApiError] = useState<string | null>(null);

  const isEmptyFacets = (): boolean => {
    if (searchResults.data.facets) {
      return every(searchResults.data.facets, (f: Facets) => {
        return f.options.length === 0;
      });
    } else {
      return true;
    }
  };

  useScrollRestorationFix();

  const saveScrollPosition = useCallback(() => {
    setScrollPosition(window.scrollY);
  }, [setScrollPosition]);

  const updateWindowScrollPosition = useCallback((newPosition: number) => {
    window.scrollTo(0, newPosition);
  }, []);

  const prepareSelectedFilters = useCallback(
    (name: string, newFilters: string[], prevFilters: FiltersProp): FiltersProp => {
      let cleanFilters: FiltersProp = {};
      switch (name) {
        case 'kind':
          // Remove selected chart repositories when some kind different to Chart is selected and Chart is not selected
          if (newFilters.length > 0 && !newFilters.includes(RepositoryKind.Helm.toString())) {
            cleanFilters['repo'] = [];
          }
          break;
      }

      return {
        ...prevFilters,
        [name]: newFilters,
        ...cleanFilters,
      };
    },
    []
  );

  const getCurrentFilters = useCallback((): SearchFiltersURL => {
    return {
      pageNumber: pageNumber,
      tsQueryWeb: tsQueryWeb,
      tsQuery: tsQuery,
      filters: filters,
      deprecated: deprecated,
      operators: operators,
      verifiedPublisher: verifiedPublisher,
      official: official,
    };
  }, [pageNumber, tsQuery, tsQueryWeb, filters, deprecated, operators, verifiedPublisher, official]);

  const updateCurrentPage = useCallback(
    (searchChanges: any) => {
      history.push({
        pathname: '/packages/search',
        search: prepareQueryString({
          ...getCurrentFilters(),
          pageNumber: 1,
          ...searchChanges,
        }),
      });
    },
    [] /* eslint-disable-line react-hooks/exhaustive-deps */
  );

  const onFiltersChange = useCallback(
    (name: string, value: string, checked: boolean): void => {
      let newFilters = isUndefined(filters[name]) ? [] : filters[name].slice();
      if (checked) {
        newFilters.push(value);
      } else {
        newFilters = newFilters.filter((el) => el !== value);
      }

      updateCurrentPage({
        filters: prepareSelectedFilters(name, newFilters, filters),
      });
    },
    [filters, updateCurrentPage, prepareSelectedFilters]
  );

  const onResetSomeFilters = useCallback(
    (filterKeys: string[]): void => {
      let newFilters: FiltersProp = {};
      filterKeys.forEach((fKey: string) => {
        newFilters[fKey] = [];
      });

      updateCurrentPage({
        filters: { ...filters, ...newFilters },
      });
    },
    [filters, updateCurrentPage]
  );

  const onTsQueryChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { value, checked } = e.target;
    let query = isUndefined(tsQuery) ? [] : tsQuery.slice();
    if (checked) {
      query.push(value);
    } else {
      query = query.filter((el) => el !== value);
    }

    updateCurrentPage({
      tsQuery: query,
    });
  };

  const onDeprecatedChange = useCallback((): void => {
    updateCurrentPage({
      deprecated: !isUndefined(deprecated) && !isNull(deprecated) ? !deprecated : true,
    });
  }, [deprecated, updateCurrentPage]);

  const onOperatorsChange = useCallback((): void => {
    updateCurrentPage({
      operators: !isUndefined(operators) && !isNull(operators) ? !operators : true,
    });
  }, [operators, updateCurrentPage]);

  const onVerifiedPublisherChange = useCallback((): void => {
    updateCurrentPage({
      verifiedPublisher: !isUndefined(verifiedPublisher) && !isNull(verifiedPublisher) ? !verifiedPublisher : true,
    });
  }, [verifiedPublisher, updateCurrentPage]);

  const onOfficialChange = useCallback((): void => {
    updateCurrentPage({
      official: !isUndefined(official) && !isNull(official) ? !official : true,
    });
  }, [official, updateCurrentPage]);

  const onResetFilters = useCallback((): void => {
    history.push({
      pathname: '/packages/search',
      search: prepareQueryString({
        pageNumber: 1,
        tsQueryWeb: tsQueryWeb,
        tsQuery: [],
        filters: {},
      }),
    });
  }, [tsQueryWeb]); /* eslint-disable-line react-hooks/exhaustive-deps */

  const onPageNumberChange = useCallback(
    (newPageNumber: number): void => {
      updateCurrentPage({
        pageNumber: newPageNumber,
      });
    },
    [updateCurrentPage]
  );

  const onPaginationLimitChange = useCallback((newLimit: number): void => {
    history.replace({
      pathname: '/packages/search',
      search: prepareQueryString({
        ...getCurrentFilters(),
        pageNumber: 1,
      }),
    });
    setScrollPosition(0);
    updateWindowScrollPosition(0);
    dispatch(updateLimit(newLimit));
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  useEffect(() => {
    async function fetchSearchResults() {
      setIsSearching(true);
      const query = {
        tsQueryWeb: tsQueryWeb,
        tsQuery: tsQuery,
        filters: filters,
        offset: (pageNumber - 1) * ctx.prefs.search.limit,
        limit: ctx.prefs.search.limit,
        deprecated: deprecated,
        operators: operators,
        verifiedPublisher: verifiedPublisher,
        official: official,
      };

      try {
        let newSearchResults = await API.searchPackages(query);
        if (newSearchResults.metadata.total === 0 && searchResults.data.facets && !isEmpty(searchResults.data.facets)) {
          newSearchResults = {
            ...newSearchResults,
            data: {
              ...newSearchResults.data,
              facets: searchResults.data.facets,
            },
          };
        }
        setSearchResults({
          ...newSearchResults,
          metadata: {
            offset: newSearchResults.metadata.offset || 0,
            total: newSearchResults.metadata.total,
            limit: ctx.prefs.search.limit,
          },
        });
        setApiError(null);
      } catch {
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
        setApiError('An error occurred searching packages, please try again later.');
      } finally {
        setIsSearching(false);
        // Update scroll position
        if (history.action === 'PUSH') {
          // When search page is open from detail page
          if (props.fromDetail && !isUndefined(scrollPosition)) {
            updateWindowScrollPosition(scrollPosition);
            // When search has changed
          } else {
            updateWindowScrollPosition(0);
          }
          // On pop action and when scroll position has been previously saved
        } else if (!isUndefined(scrollPosition)) {
          updateWindowScrollPosition(scrollPosition);
        }
      }
    }
    fetchSearchResults();

    // prettier-ignore
    /* eslint-disable react-hooks/exhaustive-deps */
  }, [
    tsQueryWeb,
    JSON.stringify(tsQuery),
    pageNumber,
    JSON.stringify(filters), // https://twitter.com/dan_abramov/status/1104414272753487872
    deprecated,
    operators,
    verifiedPublisher,
    official,
    ctx.prefs.search.limit,
  ]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const activeFilters =
    deprecated || operators || verifiedPublisher || official || !isUndefined(tsQuery) || !isEmpty(filters);

  return (
    <>
      <SubNavbar>
        <div className="d-flex align-items-center text-truncate">
          {!isNull(searchResults.data.packages) && (
            <>
              {/* Mobile filters */}
              {!isEmptyFacets() && (
                <Sidebar
                  className="d-inline-block d-md-none mr-2"
                  wrapperClassName="px-4"
                  buttonType={classnames('btn-sm rounded-circle position-relative', styles.btnMobileFilters, {
                    [styles.filtersBadge]: activeFilters,
                  })}
                  buttonIcon={<FaFilter />}
                  closeButton={
                    <>
                      {isSearching ? (
                        <>
                          <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
                          <span className="ml-2">Loading...</span>
                        </>
                      ) : (
                        <>See {searchResults.metadata.total} results</>
                      )}
                    </>
                  }
                  leftButton={
                    <>
                      <div className="d-flex align-items-center">
                        <IoMdCloseCircleOutline className={`text-secondary ${styles.resetBtnDecorator}`} />
                        <button
                          data-testid="resetBtn"
                          className="btn btn-link btn-sm p-0 pl-1 text-secondary"
                          onClick={onResetFilters}
                        >
                          Reset
                        </button>
                      </div>
                    </>
                  }
                  header={<div className="h6 text-uppercase mb-0 flex-grow-1">Filters</div>}
                >
                  <Filters
                    facets={searchResults.data.facets}
                    activeFilters={filters}
                    activeTsQuery={tsQuery}
                    onChange={onFiltersChange}
                    onResetSomeFilters={onResetSomeFilters}
                    onTsQueryChange={onTsQueryChange}
                    deprecated={deprecated}
                    operators={operators}
                    verifiedPublisher={verifiedPublisher}
                    official={official}
                    onDeprecatedChange={onDeprecatedChange}
                    onOperatorsChange={onOperatorsChange}
                    onVerifiedPublisherChange={onVerifiedPublisherChange}
                    onOfficialChange={onOfficialChange}
                    onResetFilters={onResetFilters}
                    visibleTitle={false}
                  />
                </Sidebar>
              )}

              {!isSearching && (
                <div data-testid="resultsText" className="text-truncate">
                  {searchResults.metadata.total > 0 && (
                    <span className="pr-1">
                      {searchResults.metadata.offset + 1} -{' '}
                      {searchResults.metadata.total < ctx.prefs.search.limit * pageNumber
                        ? searchResults.metadata.total
                        : ctx.prefs.search.limit * pageNumber}{' '}
                      <span className="ml-1">of</span>{' '}
                    </span>
                  )}
                  {searchResults.metadata.total}
                  <span className="pl-1"> results </span>
                  {tsQueryWeb && tsQueryWeb !== '' && (
                    <span className="d-none d-sm-inline pl-1">
                      for "<span className="font-weight-bold">{tsQueryWeb}</span>"
                    </span>
                  )}
                  {activeFilters && <small className="font-italic ml-1"> (some filters applied)</small>}
                </div>
              )}
            </>
          )}
        </div>

        <div className="ml-3">
          <PaginationLimit
            limit={ctx.prefs.search.limit}
            updateLimit={onPaginationLimitChange}
            disabled={isNull(searchResults.data.packages) || searchResults.data.packages.length === 0}
          />
        </div>
      </SubNavbar>

      <div className="d-flex position-relative pt-3 pb-3 flex-grow-1">
        {(isSearching || isNull(searchResults.data.packages)) && <Loading className="position-fixed" />}

        <main role="main" className="container-lg px-sm-4 px-lg-0 d-flex flex-row justify-content-between">
          {!isEmptyFacets() && (
            <nav className={`px-xs-0 px-sm-3 px-lg-0 d-none d-md-block ${styles.sidebar}`}>
              <div className="mr-5">
                <Filters
                  facets={searchResults.data.facets}
                  activeFilters={filters}
                  activeTsQuery={tsQuery}
                  onChange={onFiltersChange}
                  onResetSomeFilters={onResetSomeFilters}
                  onTsQueryChange={onTsQueryChange}
                  deprecated={deprecated}
                  operators={operators}
                  verifiedPublisher={verifiedPublisher}
                  official={official}
                  onDeprecatedChange={onDeprecatedChange}
                  onOperatorsChange={onOperatorsChange}
                  onVerifiedPublisherChange={onVerifiedPublisherChange}
                  onOfficialChange={onOfficialChange}
                  onResetFilters={onResetFilters}
                  visibleTitle
                />
              </div>
            </nav>
          )}

          <div
            className={classnames('flex-grow-1 mt-3 px-xs-0 px-sm-3 px-lg-0', styles.list, {
              [styles.emptyList]: isNull(searchResults.data.packages) || searchResults.data.packages.length === 0,
            })}
          >
            {!isNull(searchResults.data.packages) && (
              <>
                {searchResults.data.packages.length === 0 ? (
                  <NoData issuesLinkVisible={!isNull(apiError)}>
                    {isNull(apiError) ? (
                      <>
                        We're sorry!
                        <p className={`h6 mb-0 mt-3 ${styles.noDataMessage}`}>
                          <span> We can't seem to find any packages that match your search </span>
                          {tsQueryWeb && (
                            <span className="pl-1">
                              for "<span className="font-weight-bold">{tsQueryWeb}</span>"
                            </span>
                          )}
                          {!isEmpty(filters) && <span className="pl-1">with the selected filters</span>}
                        </p>
                        <p className={`h6 mb-0 mt-5 ${styles.noDataMessage}`}>
                          You can{' '}
                          {!isEmpty(filters) ? (
                            <button
                              data-testid="resetFiltersLink"
                              className="btn btn-link text-secondary font-weight-bold py-0 pb-1 px-0"
                              onClick={onResetFilters}
                            >
                              <u>reset the filters</u>
                            </button>
                          ) : (
                            <button
                              data-testid="resetLink"
                              className="btn btn-link text-secondary font-weight-bold py-0 pb-1 px-0"
                              onClick={() => {
                                history.push({
                                  pathname: '/packages/search',
                                  search: prepareQueryString({
                                    pageNumber: 1,
                                    tsQueryWeb: '',
                                    tsQuery: [],
                                    filters: {},
                                  }),
                                });
                              }}
                            >
                              <u>browse all packages</u>
                            </button>
                          )}
                          , try a new search or start with one of the sample queries:
                        </p>
                        <div className="h5 d-flex flex-row align-items-end justify-content-center flex-wrap">
                          <SampleQueries className="badge-light border-secondary text-secondary" />
                        </div>
                      </>
                    ) : (
                      <>{apiError}</>
                    )}
                  </NoData>
                ) : (
                  <>
                    <div className="row mb-2">
                      {searchResults.data.packages.map((item: Package) => (
                        <PackageCard
                          key={item.packageId}
                          package={item}
                          searchUrlReferer={{
                            tsQueryWeb: tsQueryWeb,
                            tsQuery: tsQuery,
                            pageNumber: pageNumber,
                            filters: filters,
                            deprecated: deprecated,
                            operators: operators,
                            verifiedPublisher: verifiedPublisher,
                            official: official,
                          }}
                          saveScrollPosition={saveScrollPosition}
                          visibleSignedBadge
                        />
                      ))}
                    </div>

                    <Pagination
                      limit={ctx.prefs.search.limit}
                      offset={searchResults.metadata.offset}
                      total={searchResults.metadata.total}
                      active={pageNumber}
                      onChange={onPageNumberChange}
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

export default React.memo(SearchView);
