import classnames from 'classnames';
import every from 'lodash/every';
import isEmpty from 'lodash/isEmpty';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { Dispatch, Fragment, SetStateAction, useContext, useEffect, useState } from 'react';
import { FaFilter } from 'react-icons/fa';
import { IoMdCloseCircleOutline } from 'react-icons/io';
import { useHistory } from 'react-router-dom';

import API from '../../api';
import { AppCtx, updateLimit } from '../../context/AppCtx';
import useScrollRestorationFix from '../../hooks/useScrollRestorationFix';
import { FacetOption, Facets, Package, RepositoryKind, SearchFiltersURL, SearchResults } from '../../types';
import getSampleQueries from '../../utils/getSampleQueries';
import { prepareQueryString } from '../../utils/prepareQueryString';
import scrollToTop from '../../utils/scrollToTop';
import Loading from '../common/Loading';
import NoData from '../common/NoData';
import PackageCard from '../common/PackageCard';
import Pagination from '../common/Pagination';
import SampleQueries from '../common/SampleQueries';
import Sidebar from '../common/Sidebar';
import Footer from '../navigation/Footer';
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

interface Props {
  isSearching: boolean;
  setIsSearching: Dispatch<SetStateAction<boolean>>;
  scrollPosition?: number;
  setScrollPosition: Dispatch<SetStateAction<number | undefined>>;
  viewedPackage?: string;
  setViewedPackage: Dispatch<SetStateAction<string | undefined>>;
  tsQueryWeb?: string;
  pageNumber: number;
  filters?: FiltersProp;
  deprecated?: boolean | null;
  operators?: boolean | null;
  verifiedPublisher?: boolean | null;
  official?: boolean | null;
  cncf?: boolean | null;
  fromDetail: boolean;
  visibleModal?: string;
  sort?: string | null;
}

const DEFAULT_SORT = 'relevance';

interface FilterLabel {
  key: string;
  name: string;
}

const SearchView = (props: Props) => {
  const { ctx, dispatch } = useContext(AppCtx);
  const history = useHistory();
  const sampleQueries = getSampleQueries();
  const [searchResults, setSearchResults] = useState<SearchResults>({
    facets: null,
    packages: null,
    paginationTotalCount: '0',
  });
  const { isSearching, setIsSearching, scrollPosition, setScrollPosition, viewedPackage, setViewedPackage } = props;
  const [apiError, setApiError] = useState<string | null>(null);
  const [currentTsQueryWeb, setCurrentTsQueryWeb] = useState(props.tsQueryWeb);

  const calculateOffset = (): number => {
    return props.pageNumber && ctx.prefs.search.limit ? (props.pageNumber - 1) * ctx.prefs.search.limit : 0;
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

  useScrollRestorationFix();

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
  };

  const getCurrentFilters = (): SearchFiltersURL => {
    return {
      pageNumber: props.pageNumber,
      tsQueryWeb: props.tsQueryWeb,
      filters: props.filters,
      deprecated: props.deprecated,
      operators: props.operators,
      verifiedPublisher: props.verifiedPublisher,
      official: props.official,
      cncf: props.cncf,
      sort: props.sort,
    };
  };

  const updateCurrentPage = (searchChanges: any) => {
    // cleanPrevSearch();
    history.push({
      pathname: '/packages/search',
      search: prepareQueryString({
        ...getCurrentFilters(),
        pageNumber: 1,
        ...searchChanges,
      }),
    });
  };

  const onFiltersChange = (name: string, value: string, checked: boolean): void => {
    const currentFilters = props.filters || {};
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
    let newFilters: FiltersProp = {};
    filterKeys.forEach((fKey: string) => {
      newFilters[fKey] = [];
    });

    updateCurrentPage({
      filters: { ...props.filters, ...newFilters },
    });
  };

  const onDeprecatedChange = (): void => {
    updateCurrentPage({
      deprecated: !isUndefined(props.deprecated) && !isNull(props.deprecated) ? !props.deprecated : true,
    });
  };

  const onOperatorsChange = (): void => {
    updateCurrentPage({
      operators: !isUndefined(props.operators) && !isNull(props.operators) ? !props.operators : true,
    });
  };

  const onVerifiedPublisherChange = (): void => {
    updateCurrentPage({
      verifiedPublisher:
        !isUndefined(props.verifiedPublisher) && !isNull(props.verifiedPublisher) ? !props.verifiedPublisher : true,
    });
  };

  const onCNCFChange = (): void => {
    updateCurrentPage({
      cncf: !isUndefined(props.cncf) && !isNull(props.cncf) ? !props.cncf : true,
    });
  };

  const onOfficialChange = (): void => {
    updateCurrentPage({
      official: !isUndefined(props.official) && !isNull(props.official) ? !props.official : true,
    });
  };

  const onResetFilters = (): void => {
    history.push({
      pathname: '/packages/search',
      search: prepareQueryString({
        pageNumber: 1,
        tsQueryWeb: props.tsQueryWeb,
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
    history.replace({
      pathname: '/packages/search',
      search: prepareQueryString({
        ...getCurrentFilters(),
        sort: sort,
        pageNumber: 1,
      }),
    });
  };

  const onPaginationLimitChange = (newLimit: number): void => {
    history.replace({
      pathname: '/packages/search',
      search: prepareQueryString({
        ...getCurrentFilters(),
        pageNumber: 1,
      }),
    });
    dispatch(updateLimit(newLimit));
  };

  useEffect(() => {
    async function fetchSearchResults() {
      setIsSearching(true);
      const query = {
        tsQueryWeb: props.tsQueryWeb,
        filters: props.filters,
        offset: calculateOffset(),
        limit: ctx.prefs.search.limit,
        deprecated: props.deprecated,
        operators: props.operators,
        verifiedPublisher: props.verifiedPublisher,
        official: props.official,
        cncf: props.cncf,
        sort: props.sort || DEFAULT_SORT,
      };

      try {
        let newSearchResults = await API.searchPackages(query);
        if (
          newSearchResults.paginationTotalCount === '0' &&
          searchResults.facets &&
          !isEmpty(searchResults.facets) &&
          currentTsQueryWeb === props.tsQueryWeb // When some filters have changed, but not ts_query_web
        ) {
          newSearchResults = {
            ...newSearchResults,
            facets: searchResults.facets,
          };
        }
        setSearchResults(newSearchResults);
        setOffset(query.offset);
        setCurrentTsQueryWeb(props.tsQueryWeb);
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
        if (
          (history.action === 'POP' || props.fromDetail) &&
          !isUndefined(viewedPackage) &&
          !isUndefined(scrollPosition)
        ) {
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
    /* eslint-disable react-hooks/exhaustive-deps */
  }, [
    props.tsQueryWeb,
    props.pageNumber,
    JSON.stringify(props.filters), // https://twitter.com/dan_abramov/status/1104414272753487872
    props.deprecated,
    props.operators,
    props.verifiedPublisher,
    props.official,
    props.cncf,
    ctx.prefs.search.limit,
    props.sort,
  ]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const activeFilters =
    props.deprecated ||
    props.operators ||
    props.verifiedPublisher ||
    props.official ||
    props.cncf ||
    !isEmpty(props.filters);

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
                          forceCollapseList={props.tsQueryWeb !== currentTsQueryWeb}
                          facets={searchResults.facets}
                          activeFilters={props.filters || {}}
                          onChange={onFiltersChange}
                          onResetSomeFilters={onResetSomeFilters}
                          deprecated={props.deprecated}
                          operators={props.operators}
                          verifiedPublisher={props.verifiedPublisher}
                          official={props.official}
                          cncf={props.cncf}
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
                            {parseInt(searchResults.paginationTotalCount) < ctx.prefs.search.limit * props.pageNumber
                              ? searchResults.paginationTotalCount
                              : ctx.prefs.search.limit * props.pageNumber}{' '}
                            <span className="ms-1">of</span>{' '}
                          </span>
                        )}
                        {searchResults.paginationTotalCount}
                        <span className="ps-1"> results </span>
                        {props.tsQueryWeb && props.tsQueryWeb !== '' && (
                          <span className="d-none d-sm-inline ps-1">
                            for "<span className="fw-semibold">{props.tsQueryWeb}</span>"
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
                {props.tsQueryWeb && props.tsQueryWeb !== '' && (
                  <SortOptions
                    activeSort={props.sort || DEFAULT_SORT}
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
                {props.official && <FilterBadge name="Official" onClick={onOfficialChange} />}
                {props.verifiedPublisher && (
                  <FilterBadge name="Verified publisher" onClick={onVerifiedPublisherChange} />
                )}
                {props.cncf && <FilterBadge name="CNCF" onClick={onCNCFChange} />}
                {!isUndefined(props.filters) && (
                  <>
                    {Object.keys(props.filters).map((type: string) => {
                      const opts = props.filters![type];
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
                {props.operators && <FilterBadge name="Only operators" onClick={onOperatorsChange} />}
                {props.deprecated && <FilterBadge name="Include deprecated" onClick={onDeprecatedChange} />}
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
              className={`bg-white border d-none d-md-block position-relative ${styles.sidebar}`}
              aria-label="Filters"
            >
              <div role="menu">
                <Filters
                  forceCollapseList={props.tsQueryWeb !== currentTsQueryWeb}
                  facets={searchResults.facets}
                  activeFilters={props.filters || {}}
                  onChange={onFiltersChange}
                  onResetSomeFilters={onResetSomeFilters}
                  deprecated={props.deprecated}
                  operators={props.operators}
                  verifiedPublisher={props.verifiedPublisher}
                  official={props.official}
                  cncf={props.cncf}
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
                          {props.tsQueryWeb && (
                            <span className="ps-1">
                              for "<span className="fw-semibold">{props.tsQueryWeb}</span>"
                            </span>
                          )}
                          {!isEmpty(props.filters) && <span className="ps-1">with the selected filters</span>}
                        </p>
                        <p className="h6 mb-0 mt-5 lh-base">
                          You can{' '}
                          {!isEmpty(props.filters) ? (
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
                                history.push({
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
                              tsQueryWeb: props.tsQueryWeb,
                              pageNumber: props.pageNumber,
                              filters: props.filters,
                              deprecated: props.deprecated,
                              operators: props.operators,
                              verifiedPublisher: props.verifiedPublisher,
                              official: props.official,
                              cncf: props.cncf,
                              sort: props.sort,
                            }}
                            saveScrollPosition={saveScrollPosition}
                            scrollPosition={scrollPosition}
                            viewedPackage={props.fromDetail ? viewedPackage : undefined} // coming from pkg detail to prev viewed pkg in search list
                            saveViewedPackage={saveViewedPackage}
                          />
                        ))}
                      </div>
                    </div>

                    <Pagination
                      limit={ctx.prefs.search.limit}
                      offset={offset}
                      total={parseInt(searchResults.paginationTotalCount)}
                      active={props.pageNumber}
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

      <Footer isHidden={isSearching || isNull(searchResults.packages)} />
    </>
  );
};

export default SearchView;
