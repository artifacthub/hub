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
  deprecated: boolean;
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
        deprecated: !props.deprecated,
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
        deprecated: false,
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
      };

      try {
        const searchResults = await API.searchPackages(query);
        setSearchResults({ ...searchResults });
        setApiError(null);

        // Preload next page if required
        if (total > ctx.prefs.search.limit + offset) {
          API.searchPackages({
            ...query,
            offset: props.pageNumber * ctx.prefs.search.limit,
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
        setApiError('An error occurred searching packages, please try again later');
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
    ctx.prefs.search.limit,
  ]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const { packages, facets } = searchResults.data;
  const { total, offset } = searchResults.metadata;

  const activeFilters = props.deprecated || !isEmpty(props.filters);

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
                        <>See {total} results</>
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
                    facets={facets}
                    activeFilters={props.filters}
                    activeTsQuery={props.tsQuery}
                    onChange={onFiltersChange}
                    onTsQueryChange={onTsQueryChange}
                    deprecated={props.deprecated}
                    onDeprecatedChange={onDeprecatedChange}
                    onResetFilters={onResetFilters}
                    visibleTitle={false}
                    onFacetExpandableChange={onFacetExpandableChange}
                    expandedList={expandedList}
                  />
                </Sidebar>
              )}

              {!isSearching && (
                <div data-testid="resultsText" className="text-truncate">
                  {total > 0 && (
                    <span className="pr-1">
                      {offset + 1} -{' '}
                      {total < ctx.prefs.search.limit * props.pageNumber
                        ? total
                        : ctx.prefs.search.limit * props.pageNumber}{' '}
                      of{' '}
                    </span>
                  )}
                  {total}
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
        {(isSearching || isNull(packages)) && <Loading />}

        <main role="main" className="container d-flex flex-row justify-content-between">
          {!isEmptyFacets() && (
            <nav className={`d-none d-md-block ${styles.sidebar}`}>
              <div className="mr-5">
                <Filters
                  facets={facets}
                  activeFilters={props.filters}
                  activeTsQuery={props.tsQuery}
                  onChange={onFiltersChange}
                  onTsQueryChange={onTsQueryChange}
                  deprecated={props.deprecated}
                  onDeprecatedChange={onDeprecatedChange}
                  onResetFilters={onResetFilters}
                  onFacetExpandableChange={onFacetExpandableChange}
                  expandedList={expandedList}
                  visibleTitle
                />
              </div>
            </nav>
          )}

          <div
            className={classnames('flex-grow-1', styles.list, {
              [styles.emptyList]: isNull(packages) || packages.length === 0,
            })}
          >
            {!isNull(packages) && (
              <>
                {packages.length === 0 ? (
                  <NoData issuesLinkVisible={!isNull(apiError)}>
                    {isNull(apiError) ? (
                      <>
                        We're sorry!
                        <p className="h6 mb-0 mt-3">
                          <span> We can't seem to find any packages that match your search </span>
                          {!isUndefined(props.tsQueryWeb) && (
                            <span className="pl-1">
                              for "<span className="font-weight-bold">{props.tsQueryWeb}</span>"
                            </span>
                          )}
                        </p>
                      </>
                    ) : (
                      <>{apiError}</>
                    )}
                  </NoData>
                ) : (
                  <>
                    <div className="row no-gutters mb-2">
                      {packages.map((item: Package) => (
                        <PackageCard
                          key={item.packageId}
                          package={item}
                          searchUrlReferer={{
                            tsQueryWeb: props.tsQueryWeb,
                            pageNumber: props.pageNumber,
                            filters: props.filters,
                            deprecated: props.deprecated,
                          }}
                          saveScrollPosition={saveScrollPosition}
                          visibleSignedBadge
                        />
                      ))}
                    </div>

                    <Pagination
                      limit={ctx.prefs.search.limit}
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
