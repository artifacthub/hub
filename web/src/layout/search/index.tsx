import React, { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { FaFilter } from 'react-icons/fa';
import isUndefined from 'lodash/isUndefined';
import isNull from 'lodash/isNull';
import every from 'lodash/every';
import API from '../../api';
import { Package, Facets } from '../../types';
import Sidebar from '../common/Sidebar';
import SubNavbar from '../navigation/SubNavbar';
import Filters from './Filters';
import NoData from '../common/NoData';
import Loading from '../common/Loading';
import Pagination from '../common/Pagination';
import PaginationLimit from './PaginationLimit';
import useLocalStorage from '../../hooks/useLocalStorage';
import useScrollRestorationFix from '../../hooks/useScrollRestorationFix';
import PackageCard from './PackageCard';
import prepareQueryString from './utils/prepareQueryString';
import buildSearchParams from './utils/buildSearchParams';
import styles from './SearchView.module.css';
import { useHistory } from 'react-router-dom';

interface Props {
  isSearching: boolean;
  setIsSearching: Dispatch<SetStateAction<boolean>>;
  scrollPosition: number;
  setScrollPosition: Dispatch<SetStateAction<number>>;
  pathname: string;
  search: string;
  fromDetail: boolean;
}

interface Info {
  text?: string;
  facets: Facets[] | null;
  activeFilters: {
    [key: string]: string[];
  };
  packages: Package[] | null;
  offset: number;
  total: number;
  pageNumber: number;
}

const DEFAULT_LIMIT = 15;

const SearchView = (props: Props) => {
  const history = useHistory();
  const [limit, setLimit] = useLocalStorage('limit', DEFAULT_LIMIT.toString());
  const [info, setInfo] = useState<Info>({
    text: '',
    facets: null,
    activeFilters: {},
    packages: null,
    offset: 0,
    total: 0,
    pageNumber: 1,
  });
  const { isSearching, setIsSearching, scrollPosition, setScrollPosition } = props;

  const isEmptyFacets = (): boolean => {
    if (isNull(info.facets)) {
      return true;
    } else {
      return every(info.facets, (f: Facets) => { return f.options.length === 0 });
    }
  }

  useScrollRestorationFix();

  const saveScrollPosition = () => {
    setScrollPosition(window.scrollY);
  };

  const onFiltersChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value, checked } = e.target;
    let newFilters = isUndefined(info.activeFilters[name]) ? [] : info.activeFilters[name].slice();
    if (checked) {
      newFilters.push(value);
    } else {
      newFilters = newFilters.filter(el => el !== value);
    }

    history.push({
      pathname: props.pathname,
      search: prepareQueryString({
        pageNumber: 1,
        text: info.text,
        f: {
          ...info.activeFilters,
          [name]: newFilters,
        },
      }),
    });
  };

  const onPaginationLimitChange = (newLimit: number) => {
    history.replace({
      pathname: props.pathname,
      search: prepareQueryString({
        pageNumber: 1,
        text: info.text,
        f: info.activeFilters,
      }),
    });
    setLimit(newLimit);
  };

  useEffect(() => {
    async function fetchSearchResults() {
      setIsSearching(true);
      const p = buildSearchParams(props.search);
      const query = {
        text: p.text,
        filters: p.f,
        offset: (p.pageNumber - 1) * parseInt(limit),
        limit: parseInt(limit),
      };

      try {
        const searchResults = await API.searchPackages(query);
        setInfo({
          text: p.text,
          facets: searchResults.data.facets,
          packages: searchResults.data.packages,
          activeFilters: p.f,
          total: searchResults.metadata.total,
          offset: searchResults.metadata.offset,
          pageNumber: p.pageNumber,
        });

        // Preload next page if required
        if (searchResults.metadata.total > (searchResults.metadata.limit + searchResults.metadata.offset)) {
          API.searchPackages({
            ...query,
            offset: p.pageNumber * limit,
          });
        }
      } catch {
        // TODO - show error badge
        setInfo({
          text: p.text,
          facets: [],
          packages: [],
          activeFilters: p.f,
          total: 0,
          offset: 0,
          pageNumber: 1,
        });
      } finally {
        setIsSearching(false);
        // Update scroll position
        if (history.action === 'PUSH') {
          // When search page is open from detail page
          if (props.fromDetail) {
            window.scrollTo(0, scrollPosition);
          // When search has changed
          } else {
            window.scrollTo(0, 0);
          }
        // On pop action and when scroll position has been previously saved
        } else if (scrollPosition !== 0) {
          window.scrollTo(0, scrollPosition);
        }
      }
    };
    fetchSearchResults();
  }, [props.search, limit]); /* eslint-disable-line react-hooks/exhaustive-deps */

  return (
    <>
      <SubNavbar>
        <div className="d-flex align-items-center text-truncate">
          {!isNull(info.packages) && (
            <>
              {/* Mobile filters */}
              {!isEmptyFacets() && (
                <Sidebar
                  className="d-inline-block d-md-none mr-2"
                  buttonType={`btn-sm rounded-circle ${styles.btnMobileFilters}`}
                  buttonIcon={<FaFilter />}
                  closeButton={(
                    <>
                      {isSearching ? (
                        <>
                          <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
                          <span className="ml-2">Loading...</span>
                        </>
                      ) : (
                        <>See {info.total} results</>
                      )}
                    </>
                  )}
                  header={<div className="h6 text-uppercase mb-0">Filters</div>}
                >
                  <Filters
                    facets={info.facets}
                    activeFilters={info.activeFilters}
                    onChange={onFiltersChange}
                    visibleTitle={false}
                  />
                </Sidebar>
              )}

              {!isSearching && (
                <div className="text-truncate">
                  {info.total > 0 && (
                    <span className="pr-1">{info.offset + 1} - {info.total < limit * info.pageNumber ? info.total : limit * info.pageNumber} of</span>
                  )}
                  {info.total}
                  <span className="d-none d-sm-inline pl-1">results</span>
                  {!isUndefined(info.text) && (
                    <span className="pl-1">for "<span className="font-weight-bold">{info.text}</span>"</span>
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
          />
        </div>
      </SubNavbar>

      <div className="d-flex position-relative pt-3 pb-3 flex-grow-1">
        {(isSearching || isNull(info.packages)) && <Loading />}

        <main role="main" className="container d-flex flex-row justify-content-between">
          {!isEmptyFacets() && (
            <nav className={`d-none d-md-block ${styles.sidebar}`}>
              <div className="mr-5">
                <Filters
                  facets={info.facets}
                  activeFilters={info.activeFilters}
                  onChange={onFiltersChange}
                  visibleTitle
                />
              </div>
            </nav>
          )}

          <div className="flex-grow-1 mw-100">
            {!isNull(info.packages) && (
              <>
                {info.packages.length === 0 ? (
                  <NoData>
                    <>
                      We're sorry!
                      <p className="h6 mb-0 mt-3">
                        We can't seem to find any packages that match your search
                        {!isUndefined(info.text) && (
                          <span className="pl-1">
                            for "<span className="font-weight-bold">{info.text}</span>"
                          </span>
                        )}
                      </p>
                    </>
                  </NoData>
                ) : (
                  <>
                    <div className="row no-gutters mb-2">
                      {info.packages.map((item: Package) => (
                        <PackageCard
                          key={item.packageId}
                          package={item}
                          searchUrlReferer={{
                            searchText: info.text,
                            query: props.search,
                          }}
                          saveScrollPosition={saveScrollPosition}
                        />
                      ))}
                    </div>

                    <Pagination
                      limit={limit}
                      offset={info.offset}
                      total={info.total}
                      active={info.pageNumber}
                      search={props.search}
                      pathname={props.pathname}
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

export default SearchView;
