import classnames from 'classnames';
import every from 'lodash/every';
import isEmpty from 'lodash/isEmpty';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { Dispatch, SetStateAction, useContext, useEffect, useState } from 'react';
import { FaFilter } from 'react-icons/fa';
import { IoMdCloseCircleOutline } from 'react-icons/io';
import { useHistory } from 'react-router-dom';

import { API } from '../../api';
import { AppCtx, updateLimit } from '../../context/AppCtx';
import useScrollRestorationFix from '../../hooks/useScrollRestorationFix';
import { Facets, Package, RepositoryKind, SearchResults } from '../../types';
import prepareQueryString from '../../utils/prepareQueryString';
import Loading from '../common/Loading';
import NoData from '../common/NoData';
import PackageCard from '../common/PackageCard';
import Pagination from '../common/Pagination';
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
  setIsSearching: Dispatch<SetStateAction<boolean>>;
  scrollPosition?: number;
  setScrollPosition: Dispatch<SetStateAction<number | undefined>>;
  tsQueryWeb?: string;
  tsQuery?: string[];
  pageNumber: number;
  filters: FiltersProp;
  deprecated?: boolean | null;
  operators?: boolean | null;
  fromDetail: boolean;
}

const SearchView = (props: Props) => {
  const { ctx, dispatch } = useContext(AppCtx);
  const history = useHistory();
  const [expandedList, setExpandedList] = useState<string | undefined>(undefined);
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
  const { isSearching, setIsSearching, scrollPosition, setScrollPosition } = props;
  const [apiError, setApiError] = useState<string | null>(null);

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

  const prepareSelectedFilters = (name: string, newFilters: string[], prevFilters: FiltersProp): FiltersProp => {
    let cleanFilters: FiltersProp = {};
    switch (name) {
      case 'kind':
        // Remove selected chart repositories when some kind different to Chart is selected and Chart is not selected
        if (newFilters.length > 0 && !newFilters.includes(RepositoryKind.Helm.toString())) {
          cleanFilters['repo'] = [];
        }
        break;

      // Remove selected users/s if a org is now selected
      case 'org':
        if (newFilters.length > 0) {
          cleanFilters['user'] = [];
        }
        break;

      // Remove selected org/s if a user is now selected
      case 'user':
        if (newFilters.length > 0) {
          cleanFilters['org'] = [];
        }
        break;
    }

    return {
      ...prevFilters,
      [name]: newFilters,
      ...cleanFilters,
    };
  };

  const onFiltersChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value, checked } = e.target;
    let newFilters = isUndefined(props.filters[name]) ? [] : props.filters[name].slice();
    if (checked) {
      newFilters.push(value);
    } else {
      newFilters = newFilters.filter((el) => el !== value);
    }

    if (!isUndefined(expandedList) && name !== expandedList) {
      setExpandedList(undefined);
    }

    history.push({
      pathname: '/packages/search',
      search: prepareQueryString({
        pageNumber: 1,
        tsQueryWeb: props.tsQueryWeb,
        tsQuery: props.tsQuery,
        filters: prepareSelectedFilters(name, newFilters, props.filters),
        deprecated: props.deprecated,
        operators: props.operators,
      }),
    });
  };

  const onTsQueryChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { value, checked } = e.target;
    let query = isUndefined(props.tsQuery) ? [] : props.tsQuery.slice();
    if (checked) {
      query.push(value);
    } else {
      query = query.filter((el) => el !== value);
    }

    if (!isUndefined(expandedList)) {
      setExpandedList(undefined);
    }

    history.push({
      pathname: '/packages/search',
      search: prepareQueryString({
        pageNumber: 1,
        tsQueryWeb: props.tsQueryWeb,
        tsQuery: query,
        filters: props.filters,
        deprecated: props.deprecated,
        operators: props.operators,
      }),
    });
  };

  const onDeprecatedChange = (): void => {
    history.push({
      pathname: '/packages/search',
      search: prepareQueryString({
        pageNumber: props.pageNumber,
        tsQueryWeb: props.tsQueryWeb,
        tsQuery: props.tsQuery,
        filters: props.filters,
        deprecated: !isUndefined(props.deprecated) && !isNull(props.deprecated) ? !props.deprecated : true,
        operators: props.operators,
      }),
    });
  };

  const onOperatorsChange = (): void => {
    history.push({
      pathname: '/packages/search',
      search: prepareQueryString({
        pageNumber: props.pageNumber,
        tsQueryWeb: props.tsQueryWeb,
        tsQuery: props.tsQuery,
        filters: props.filters,
        deprecated: props.deprecated,
        operators: !isUndefined(props.operators) && !isNull(props.operators) ? !props.operators : true,
      }),
    });
  };

  const onResetFilters = (): void => {
    if (!isUndefined(expandedList)) {
      setExpandedList(undefined);
    }
    history.push({
      pathname: '/packages/search',
      search: prepareQueryString({
        pageNumber: 1,
        tsQueryWeb: props.tsQueryWeb,
        tsQuery: [],
        filters: {},
      }),
    });
  };

  const onPageChange = (pageNumber: number): void => {
    history.push({
      pathname: '/packages/search',
      search: prepareQueryString({
        pageNumber: pageNumber,
        tsQueryWeb: props.tsQueryWeb,
        tsQuery: props.tsQuery,
        filters: props.filters,
        deprecated: props.deprecated,
        operators: props.operators,
      }),
    });
  };

  const onPaginationLimitChange = (newLimit: number): void => {
    history.replace({
      pathname: '/packages/search',
      search: prepareQueryString({
        pageNumber: 1,
        tsQueryWeb: props.tsQueryWeb,
        tsQuery: props.tsQuery,
        filters: props.filters,
        deprecated: props.deprecated,
        operators: props.operators,
      }),
    });
    setScrollPosition(0);
    updateWindowScrollPosition(0);
    dispatch(updateLimit(newLimit));
  };

  const onFacetExpandableChange = (filterKey: string, open: boolean) => {
    setExpandedList(open ? filterKey : undefined);
  };

  useEffect(() => {
    async function fetchSearchResults() {
      setIsSearching(true);
      const query = {
        tsQueryWeb: props.tsQueryWeb,
        tsQuery: props.tsQuery,
        filters: props.filters,
        offset: (props.pageNumber - 1) * ctx.prefs.search.limit,
        limit: ctx.prefs.search.limit,
        deprecated: props.deprecated,
        operators: props.operators,
      };

      try {
        let newSearchResults = await API.searchPackages(query);
        if (newSearchResults.metadata.total === 0 && !isEmpty(searchResults.data.facets)) {
          newSearchResults = {
            ...newSearchResults,
            data: {
              ...newSearchResults.data,
              facets: searchResults.data.facets,
            },
          };
        }
        setSearchResults({ ...newSearchResults });
        setApiError(null);

        // Preload next page if required
        if (newSearchResults.metadata.total > ctx.prefs.search.limit + newSearchResults.metadata.offset) {
          API.searchPackages({
            ...query,
            offset: props.pageNumber * ctx.prefs.search.limit,
          });
        }
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
    props.tsQueryWeb,
    JSON.stringify(props.tsQuery),
    props.pageNumber,
    JSON.stringify(props.filters), // https://twitter.com/dan_abramov/status/1104414272753487872
    props.deprecated,
    props.operators,
    ctx.prefs.search.limit,
  ]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const activeFilters = props.deprecated || props.operators || !isUndefined(props.tsQuery) || !isEmpty(props.filters);

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
                        <button className="btn btn-link btn-sm p-0 pl-1 text-secondary" onClick={onResetFilters}>
                          Reset
                        </button>
                      </div>
                    </>
                  }
                  header={<div className="h6 text-uppercase mb-0">Filters</div>}
                >
                  <Filters
                    facets={searchResults.data.facets}
                    activeFilters={props.filters}
                    activeTsQuery={props.tsQuery}
                    onChange={onFiltersChange}
                    onTsQueryChange={onTsQueryChange}
                    deprecated={props.deprecated}
                    operators={props.operators}
                    onDeprecatedChange={onDeprecatedChange}
                    onOperatorsChange={onOperatorsChange}
                    onResetFilters={onResetFilters}
                    visibleTitle={false}
                    onFacetExpandableChange={onFacetExpandableChange}
                    expandedList={expandedList}
                  />
                </Sidebar>
              )}

              {!isSearching && (
                <div data-testid="resultsText" className="text-truncate">
                  {searchResults.metadata.total > 0 && (
                    <span className="pr-1">
                      {searchResults.metadata.offset + 1} -{' '}
                      {searchResults.metadata.total < ctx.prefs.search.limit * props.pageNumber
                        ? searchResults.metadata.total
                        : ctx.prefs.search.limit * props.pageNumber}{' '}
                      of{' '}
                    </span>
                  )}
                  {searchResults.metadata.total}
                  <span className="pl-1"> results </span>
                  {!isUndefined(props.tsQueryWeb) && props.tsQueryWeb !== '' && (
                    <span className="d-none d-sm-inline pl-1">
                      for "<span className="font-weight-bold">{props.tsQueryWeb}</span>"
                    </span>
                  )}
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

        <main role="main" className="container d-flex flex-row justify-content-between">
          {!isEmptyFacets() && (
            <nav className={`d-none d-md-block ${styles.sidebar}`}>
              <div className="mr-5">
                <Filters
                  facets={searchResults.data.facets}
                  activeFilters={props.filters}
                  activeTsQuery={props.tsQuery}
                  onChange={onFiltersChange}
                  onTsQueryChange={onTsQueryChange}
                  deprecated={props.deprecated}
                  operators={props.operators}
                  onDeprecatedChange={onDeprecatedChange}
                  onOperatorsChange={onOperatorsChange}
                  onResetFilters={onResetFilters}
                  onFacetExpandableChange={onFacetExpandableChange}
                  expandedList={expandedList}
                  visibleTitle
                />
              </div>
            </nav>
          )}

          <div
            className={classnames('flex-grow-1 mt-3', styles.list, {
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
                          {!isUndefined(props.tsQueryWeb) && (
                            <span className="pl-1">
                              for "<span className="font-weight-bold">{props.tsQueryWeb}</span>"
                            </span>
                          )}
                          {!isEmpty(props.filters) && <span className="pl-1">with the selected filters</span>}
                        </p>
                        <p className={`h6 mb-0 mt-5 ${styles.noDataMessage}`}>
                          You can{' '}
                          {!isEmpty(props.filters) ? (
                            <button
                              data-testid="resetLink"
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
                          <button
                            data-testid="sampleFilterLink"
                            className="badge badge-pill badge-light border border-secondary text-secondary font-weight-normal mx-2 mt-3"
                            onClick={() => {
                              history.push({
                                pathname: '/packages/search',
                                search: prepareQueryString({
                                  pageNumber: 1,
                                  tsQueryWeb: 'database',
                                  filters: { kind: ['3'] },
                                }),
                              });
                            }}
                          >
                            OLM operators for databases
                          </button>
                          <button
                            data-testid="sampleFilterLink"
                            className="badge badge-pill badge-light border border-secondary text-secondary font-weight-normal mx-2 mt-3"
                            onClick={() => {
                              history.push({
                                pathname: '/packages/search',
                                search: prepareQueryString({
                                  pageNumber: 1,
                                  filters: { kind: ['0'], org: ['bitnami'] },
                                }),
                              });
                            }}
                          >
                            Helm Charts provided by Bitnami
                          </button>
                          <button
                            data-testid="sampleFilterLink"
                            className="badge badge-pill badge-light border border-secondary text-secondary font-weight-normal mx-2 mt-3"
                            onClick={() => {
                              history.push({
                                pathname: '/packages/search',
                                search: prepareQueryString({
                                  pageNumber: 1,
                                  tsQueryWeb: 'etcd',
                                  filters: {},
                                }),
                              });
                            }}
                          >
                            Packages of any kind related to etcd
                          </button>
                          <button
                            data-testid="sampleFilterLink"
                            className="badge badge-pill badge-light border border-secondary text-secondary font-weight-normal mx-2 mt-3"
                            onClick={() => {
                              history.push({
                                pathname: '/packages/search',
                                search: prepareQueryString({
                                  pageNumber: 1,
                                  tsQueryWeb: 'CVE',
                                  filters: { kind: ['1'] },
                                }),
                              });
                            }}
                          >
                            Falco rules for CVE
                          </button>
                          <button
                            data-testid="sampleFilterLink"
                            className="badge badge-pill badge-light border border-secondary text-secondary font-weight-normal mx-2 mt-3"
                            onClick={() => {
                              history.push({
                                pathname: '/packages/search',
                                search: prepareQueryString({
                                  pageNumber: 1,
                                  tsQuery: ['monitoring'],
                                  filters: { kind: ['3'] },
                                }),
                              });
                            }}
                          >
                            OLM operators in the monitoring category
                          </button>
                        </div>
                      </>
                    ) : (
                      <>{apiError}</>
                    )}
                  </NoData>
                ) : (
                  <>
                    <div className="row no-gutters mb-2">
                      {searchResults.data.packages.map((item: Package) => (
                        <PackageCard
                          key={item.packageId}
                          package={item}
                          searchUrlReferer={{
                            tsQueryWeb: props.tsQueryWeb,
                            tsQuery: props.tsQuery,
                            pageNumber: props.pageNumber,
                            filters: props.filters,
                            deprecated: props.deprecated,
                            operators: props.operators,
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
