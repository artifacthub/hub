import classnames from 'classnames';
import every from 'lodash/every';
import isEmpty from 'lodash/isEmpty';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { Fragment, useContext, useEffect, useState } from 'react';
import { FaFilter } from 'react-icons/fa';
import { IoMdCloseCircleOutline } from 'react-icons/io';
import { NavigationType, useLocation, useNavigate, useNavigationType, useOutletContext } from 'react-router-dom';

import API from '../../api';
import { AppCtx, updateLimit } from '../../context/AppCtx';
import {
  FacetOption,
  Facets,
  OutletContext,
  Package,
  RepositoryKind,
  SearchFiltersURL,
  SearchResults,
  SortOption,
} from '../../types';
import buildSearchParams from '../../utils/buildSearchParams';
import getSampleQueries from '../../utils/getSampleQueries';
import { prepareQueryString } from '../../utils/prepareQueryString';
import scrollToTop from '../../utils/scrollToTop';
import Loading from '../common/Loading';
import NoData from '../common/NoData';
import PackageCard from '../common/PackageCard';
import Pagination from '../common/Pagination';
import SampleQueries from '../common/SampleQueries';
import Sidebar from '../common/Sidebar';
import SubNavbar from '../navigation/SubNavbar';
import FilterBadge from './FilterBadge';
import Filters from './Filters';
import MoreActionsButton from './MoreActionsButton';
import PaginationLimit from './PaginationLimit';
import styles from './SearchView.module.css';
import SortOptions from './SortOptions';

interface FiltersProp {
  [key: string]: string[];
}

const DEFAULT_SORT = SortOption.Relevance;

interface FilterLabel {
  key: string;
  name: string;
}

const SearchView = () => {
  const { ctx, dispatch } = useContext(AppCtx);
  const navigate = useNavigate();
  const location = useLocation();
  const navType: NavigationType = useNavigationType();
  const { tsQueryWeb, filters, pageNumber, deprecated, operators, verifiedPublisher, cncf, official, sort } =
    buildSearchParams(location.search);
  const sampleQueries = getSampleQueries();
  const [searchResults, setSearchResults] = useState<SearchResults>({
    facets: null,
    packages: null,
    paginationTotalCount: '0',
  });
  const { isSearching, setIsSearching, scrollPosition, setScrollPosition, viewedPackage, setViewedPackage } =
    useOutletContext() as OutletContext;
  const [apiError, setApiError] = useState<string | null>(null);
  const [currentTsQueryWeb, setCurrentTsQueryWeb] = useState(tsQueryWeb);
  const fromDetail = location.state && location.state.fromDetail;

  const calculateOffset = (): number => {
    return pageNumber && ctx.prefs.search.limit ? (pageNumber - 1) * ctx.prefs.search.limit : 0;
  };

  const [offset, setOffset] = useState<number>(calculateOffset());

  const getFilterName = (key: string, label: string): FilterLabel | null => {
    let correctKey = key;
    if (['user', 'org'].includes(key)) {
      correctKey = 'publisher';
    } else if (key === 'repo') {
      correctKey = 'repository';
    }
    // Org, user and repo are not included in facets
    if (['publisher', 'repository'].includes(correctKey)) {
      return { key: correctKey, name: label };
    } else if (searchResults.facets) {
      const selectedKey = searchResults.facets.find((fac: Facets) => fac.filterKey === correctKey);
      if (selectedKey) {
        const selectedOpt = selectedKey.options.find((opt: FacetOption) => opt.id.toString() === label);
        if (selectedOpt) {
          return { key: selectedKey.title, name: selectedOpt.name };
        } else {
          return null;
        }
      } else {
        return null;
      }
    }
    return null;
  };

  const isEmptyFacets = (): boolean => {
    if (searchResults.facets) {
      return every(searchResults.facets, (f: Facets) => {
        return f.options.length === 0;
      });
    } else {
      return true;
    }
  };

  const saveScrollPosition = () => {
    setScrollPosition(window.scrollY);
  };

  const saveViewedPackage = (id: string) => {
    setViewedPackage(id);
  };

  const cleanPrevSearch = () => {
    setViewedPackage(undefined);
    setScrollPosition(0);
    scrollToTop();
  };

  const prepareSelectedFilters = (name: string, newFilters: string[], prevFilters: FiltersProp): FiltersProp => {
    const cleanFilters: FiltersProp = {};
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
  };

  const getCurrentFilters = (): SearchFiltersURL => {
    return {
      pageNumber: pageNumber,
      tsQueryWeb: tsQueryWeb,
      filters: filters,
      deprecated: deprecated,
      operators: operators,
      verifiedPublisher: verifiedPublisher,
      official: official,
      cncf: cncf,
      sort: sort,
    };
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateCurrentPage = (searchChanges: any) => {
    // cleanPrevSearch();
    navigate({
      pathname: '/packages/search',
      search: prepareQueryString({
        ...getCurrentFilters(),
        pageNumber: 1,
        ...searchChanges,
      }),
    });
  };

  const onFiltersChange = (name: string, value: string, checked: boolean): void => {
    const currentFilters = filters || {};
    let newFilters = isUndefined(currentFilters[name]) ? [] : currentFilters[name].slice();
    if (checked) {
      newFilters.push(value);
    } else {
      newFilters = newFilters.filter((el) => el !== value);
    }

    updateCurrentPage({
      filters: prepareSelectedFilters(name, newFilters, currentFilters),
    });
  };

  const onResetSomeFilters = (filterKeys: string[]): void => {
    const newFilters: FiltersProp = {};
    filterKeys.forEach((fKey: string) => {
      newFilters[fKey] = [];
    });

    updateCurrentPage({
      filters: { ...filters, ...newFilters },
    });
  };

  const onDeprecatedChange = (): void => {
    updateCurrentPage({
      deprecated: !isUndefined(deprecated) && !isNull(deprecated) ? !deprecated : true,
    });
  };

  const onOperatorsChange = (): void => {
    updateCurrentPage({
      operators: !isUndefined(operators) && !isNull(operators) ? !operators : true,
    });
  };

  const onVerifiedPublisherChange = (): void => {
    updateCurrentPage({
      verifiedPublisher: !isUndefined(verifiedPublisher) && !isNull(verifiedPublisher) ? !verifiedPublisher : true,
    });
  };

  const onCNCFChange = (): void => {
    updateCurrentPage({
      cncf: !isUndefined(cncf) && !isNull(cncf) ? !cncf : true,
    });
  };

  const onOfficialChange = (): void => {
    updateCurrentPage({
      official: !isUndefined(official) && !isNull(official) ? !official : true,
    });
  };

  const onResetFilters = (): void => {
    navigate({
      pathname: '/packages/search',
      search: prepareQueryString({
        pageNumber: 1,
        tsQueryWeb: tsQueryWeb,
        filters: {},
        sort: DEFAULT_SORT,
      }),
    });
  };

  const onPageNumberChange = (pageNumber: number): void => {
    updateCurrentPage({
      pageNumber: pageNumber,
    });
  };

  const onSortChange = (sort: string): void => {
    navigate(
      {
        pathname: '/packages/search',
        search: prepareQueryString({
          ...getCurrentFilters(),
          sort: sort,
          pageNumber: 1,
        }),
      },
      { replace: true }
    );
  };

  const onPaginationLimitChange = (newLimit: number): void => {
    navigate(
      {
        pathname: '/packages/search',
        search: prepareQueryString({
          ...getCurrentFilters(),
          pageNumber: 1,
        }),
      },
      { replace: true }
    );
    dispatch(updateLimit(newLimit));
  };

  useEffect(() => {
    async function fetchSearchResults() {
      setIsSearching(true);
      const query = {
        tsQueryWeb: tsQueryWeb,
        filters: filters,
        offset: calculateOffset(),
        limit: ctx.prefs.search.limit,
        deprecated: deprecated,
        operators: operators,
        verifiedPublisher: verifiedPublisher,
        official: official,
        cncf: cncf,
        sort: sort || DEFAULT_SORT,
      };

      try {
        let newSearchResults = await API.searchPackages(query);
        if (
          newSearchResults.paginationTotalCount === '0' &&
          searchResults.facets &&
          !isEmpty(searchResults.facets) &&
          currentTsQueryWeb === tsQueryWeb // When some filters have changed, but not ts_query_web
        ) {
          newSearchResults = {
            ...newSearchResults,
            facets: searchResults.facets,
          };
        }
        setSearchResults(newSearchResults);
        setOffset(query.offset);
        setCurrentTsQueryWeb(tsQueryWeb);
        setApiError(null);
      } catch {
        setSearchResults({
          facets: [],
          packages: [],
          paginationTotalCount: '0',
        });
        setApiError('An error occurred searching packages, please try again later.');
      } finally {
        setIsSearching(false);
        if (navType === 'POP' || (fromDetail && !isUndefined(viewedPackage) && !isUndefined(scrollPosition))) {
          setTimeout(() => {
            scrollToTop(scrollPosition);
          }, 200);
        } else {
          cleanPrevSearch();
        }
      }
    }
    fetchSearchResults();

    // prettier-ignore
  }, [
    tsQueryWeb,
    pageNumber,
    JSON.stringify(filters), // https://twitter.com/dan_abramov/status/1104414272753487872
    deprecated,
    operators,
    verifiedPublisher,
    official,
    cncf,
    ctx.prefs.search.limit,
    sort,
  ]);

  const activeFilters = deprecated || operators || verifiedPublisher || official || cncf || !isEmpty(filters);

  return (
    <>
      <SubNavbar className={`h-auto ${styles.subnavbar}`}>
        <div className="d-flex flex-column w-100">
          <div className="d-flex align-items-center justify-content-between flex-nowrap">
            <div className="d-flex align-items-center text-truncate w-100">
              {!isNull(searchResults.packages) && (
                <>
                  {/* Mobile filters */}
                  {!isEmptyFacets() && (
                    <Sidebar
                      label="Filters"
                      className="d-inline-block d-md-none me-2"
                      wrapperClassName="px-4"
                      buttonType={classnames('btn-sm position-relative', styles.btnMobileFilters, {
                        [styles.filtersBadge]: activeFilters,
                      })}
                      buttonIcon={<FaFilter />}
                      closeButton={
                        <>
                          {isSearching ? (
                            <>
                              <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
                              <span className="ms-2">Loading...</span>
                            </>
                          ) : (
                            <>See {searchResults.paginationTotalCount} results</>
                          )}
                        </>
                      }
                      leftButton={
                        <>
                          <div className="d-flex align-items-center">
                            <IoMdCloseCircleOutline className={`text-dark ${styles.resetBtnDecorator}`} />
                            <button
                              className="btn btn-link btn-sm p-0 ps-1 text-dark"
                              onClick={onResetFilters}
                              aria-label="Reset filters"
                            >
                              Reset
                            </button>
                          </div>
                        </>
                      }
                      header={<div className="h6 text-uppercase mb-0 flex-grow-1">Filters</div>}
                    >
                      <div role="menu">
                        <Filters
                          forceCollapseList={tsQueryWeb !== currentTsQueryWeb}
                          facets={searchResults.facets}
                          activeFilters={filters || {}}
                          onChange={onFiltersChange}
                          onResetSomeFilters={onResetSomeFilters}
                          deprecated={deprecated}
                          operators={operators}
                          verifiedPublisher={verifiedPublisher}
                          official={official}
                          cncf={cncf}
                          onDeprecatedChange={onDeprecatedChange}
                          onOperatorsChange={onOperatorsChange}
                          onVerifiedPublisherChange={onVerifiedPublisherChange}
                          onCNCFChange={onCNCFChange}
                          onOfficialChange={onOfficialChange}
                          onResetFilters={onResetFilters}
                          visibleTitle={false}
                          device="mobile"
                        />
                      </div>
                    </Sidebar>
                  )}

                  {!isSearching && (
                    <div className="d-flex flex-column w-100 text-truncate">
                      <div className={`text-truncate ${styles.searchText}`} role="status">
                        {parseInt(searchResults.paginationTotalCount) > 0 && (
                          <span className="pe-1">
                            {offset + 1} -{' '}
                            {parseInt(searchResults.paginationTotalCount) < ctx.prefs.search.limit * pageNumber
                              ? searchResults.paginationTotalCount
                              : ctx.prefs.search.limit * pageNumber}{' '}
                            <span className="ms-1">of</span>{' '}
                          </span>
                        )}
                        {searchResults.paginationTotalCount}
                        <span className="ps-1"> results </span>
                        {tsQueryWeb && tsQueryWeb !== '' && (
                          <span className="d-none d-sm-inline ps-1">
                            for "<span className="fw-semibold">{tsQueryWeb}</span>"
                          </span>
                        )}
                        {activeFilters && (
                          <small className="d-inline d-lg-none fst-italic ms-1"> (some filters applied)</small>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="ms-3">
              <div className="d-flex flex-row">
                {/* Only display sort options when ts_query_web is defined */}
                {tsQueryWeb && tsQueryWeb !== '' && (
                  <SortOptions
                    activeSort={(sort || DEFAULT_SORT) as SortOption}
                    updateSort={onSortChange}
                    disabled={isNull(searchResults.packages) || searchResults.packages.length === 0}
                  />
                )}
                <div className="d-none d-sm-flex">
                  <PaginationLimit
                    limit={ctx.prefs.search.limit}
                    updateLimit={onPaginationLimitChange}
                    disabled={isNull(searchResults.packages) || searchResults.packages.length === 0}
                  />
                </div>
                <MoreActionsButton />
              </div>
            </div>
          </div>

          {activeFilters && (
            <div className="d-none d-lg-inline">
              <div className="d-flex flex-row flex-wrap align-items-center pt-2">
                <span className="me-2 pe-1 mb-2">Filters:</span>
                {official && <FilterBadge name="Official" onClick={onOfficialChange} />}
                {verifiedPublisher && <FilterBadge name="Verified publisher" onClick={onVerifiedPublisherChange} />}
                {cncf && <FilterBadge name="CNCF" onClick={onCNCFChange} />}
                {!isUndefined(filters) && (
                  <>
                    {Object.keys(filters).map((type: string) => {
                      const opts = filters![type];
                      return (
                        <Fragment key={`opts_${type}`}>
                          {opts.map((opt: string) => {
                            const filter = getFilterName(type, opt);
                            if (isNull(filter)) return null;
                            return (
                              <FilterBadge
                                key={`btn_${type}_${opt}`}
                                type={filter.key}
                                name={filter.name}
                                onClick={() => onFiltersChange(type, opt, false)}
                              />
                            );
                          })}
                        </Fragment>
                      );
                    })}
                  </>
                )}
                {operators && <FilterBadge name="Only operators" onClick={onOperatorsChange} />}
                {deprecated && <FilterBadge name="Include deprecated" onClick={onDeprecatedChange} />}
              </div>
            </div>
          )}
        </div>
      </SubNavbar>

      <div className="d-flex position-relative pb-3 flex-grow-1">
        {(isSearching || isNull(searchResults.packages)) && <Loading spinnerClassName="position-fixed top-50" />}

        <main role="main" className="container-lg px-sm-4 px-lg-0 d-flex flex-row align-items-start">
          {!isEmptyFacets() && (
            <aside
              className={`bg-white border border-1 d-none d-md-block position-relative mb-4 ${styles.sidebar}`}
              aria-label="Filters"
            >
              <div role="menu">
                <Filters
                  forceCollapseList={tsQueryWeb !== currentTsQueryWeb}
                  facets={searchResults.facets}
                  activeFilters={filters || {}}
                  onChange={onFiltersChange}
                  onResetSomeFilters={onResetSomeFilters}
                  deprecated={deprecated}
                  operators={operators}
                  verifiedPublisher={verifiedPublisher}
                  official={official}
                  cncf={cncf}
                  onDeprecatedChange={onDeprecatedChange}
                  onOperatorsChange={onOperatorsChange}
                  onVerifiedPublisherChange={onVerifiedPublisherChange}
                  onCNCFChange={onCNCFChange}
                  onOfficialChange={onOfficialChange}
                  onResetFilters={onResetFilters}
                  visibleTitle
                  device="desktop"
                />
              </div>
            </aside>
          )}

          <div
            className={classnames('flex-grow-1 mt-1 mt-sm-3 px-xs-0 px-sm-2 px-md-3 px-lg-0', styles.list, {
              [styles.emptyList]: isNull(searchResults.packages) || searchResults.packages.length === 0,
            })}
          >
            {!isNull(searchResults.packages) && (
              <>
                {searchResults.packages.length === 0 ? (
                  <NoData issuesLinkVisible={!isNull(apiError)}>
                    {isNull(apiError) ? (
                      <>
                        We're sorry!
                        <p className="h6 mb-0 mt-3 lh-base">
                          <span> We can't seem to find any packages that match your search </span>
                          {tsQueryWeb && (
                            <span className="ps-1">
                              for "<span className="fw-semibold">{tsQueryWeb}</span>"
                            </span>
                          )}
                          {!isEmpty(filters) && <span className="ps-1">with the selected filters</span>}
                        </p>
                        <p className="h6 mb-0 mt-5 lh-base">
                          You can{' '}
                          {!isEmpty(filters) ? (
                            <button
                              className="btn btn-link text-dark fw-semibold py-0 pb-1 px-0"
                              onClick={onResetFilters}
                              aria-label="Reset filters"
                            >
                              <u>reset the filters</u>
                            </button>
                          ) : (
                            <button
                              className="btn btn-link text-dark fw-semibold py-0 pb-1 px-0"
                              onClick={() => {
                                navigate({
                                  pathname: '/packages/search',
                                  search: prepareQueryString({
                                    pageNumber: 1,
                                    tsQueryWeb: '',
                                    filters: {},
                                  }),
                                });
                              }}
                              aria-label="Browse all packages"
                            >
                              <u>browse all packages</u>
                            </button>
                          )}
                          {sampleQueries.length > 0 ? (
                            <>, try a new search or start with one of the sample queries:</>
                          ) : (
                            <> or try a new search.</>
                          )}
                        </p>
                        <div className="h5 d-flex flex-row align-items-end justify-content-center flex-wrap">
                          <SampleQueries className="bg-light text-dark border-secondary text-dark" />
                        </div>
                      </>
                    ) : (
                      <>{apiError}</>
                    )}
                  </NoData>
                ) : (
                  <>
                    <div className="mb-2 noFocus" id="content" tabIndex={-1} aria-label="Packages list">
                      <div className={`row ${styles.listRow}`} role="list">
                        {searchResults.packages.map((item: Package) => (
                          <PackageCard
                            key={item.packageId}
                            cardWrapperClassName="col-12 col-xxxl-6"
                            package={item}
                            searchUrlReferer={{
                              tsQueryWeb: tsQueryWeb,
                              pageNumber: pageNumber,
                              filters: filters,
                              deprecated: deprecated,
                              operators: operators,
                              verifiedPublisher: verifiedPublisher,
                              official: official,
                              cncf: cncf,
                              sort: sort,
                            }}
                            saveScrollPosition={saveScrollPosition}
                            scrollPosition={scrollPosition}
                            viewedPackage={fromDetail ? viewedPackage : undefined} // coming from pkg detail to prev viewed pkg in search list
                            saveViewedPackage={saveViewedPackage}
                          />
                        ))}
                      </div>
                    </div>

                    <Pagination
                      limit={ctx.prefs.search.limit}
                      offset={offset}
                      total={parseInt(searchResults.paginationTotalCount)}
                      active={pageNumber}
                      className="my-5"
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

export default SearchView;
