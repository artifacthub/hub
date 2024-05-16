import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { useContext, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import API from '../../api';
import { AppCtx, signOut } from '../../context/AppCtx';
import { ErrorKind, Package } from '../../types';
import Loading from '../common/Loading';
import NoData from '../common/NoData';
import PackageCard from '../common/PackageCard';
import Pagination from '../common/Pagination';
import styles from './StarredPackagesView.module.css';

const DEFAULT_LIMIT = 10;

const StarredPackagesView = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activePageParam = searchParams.get('page');
  const { dispatch } = useContext(AppCtx);
  const [isLoading, setIsLoading] = useState(false);
  const [packages, setPackages] = useState<Package[] | undefined>(undefined);
  const [apiError, setApiError] = useState<string | JSX.Element | null>(null);
  const [activePage, setActivePage] = useState<number>(activePageParam ? parseInt(activePageParam) : 1);

  const calculateOffset = (pageNumber?: number): number => {
    return DEFAULT_LIMIT * ((pageNumber || activePage) - 1);
  };

  const [offset, setOffset] = useState<number>(calculateOffset());
  const [total, setTotal] = useState<number | undefined>(undefined);

  const onPageNumberChange = (pageNumber: number): void => {
    setOffset(calculateOffset(pageNumber));
    setActivePage(pageNumber);
  };

  const updatePageNumber = () => {
    navigate(`?page=${activePage}`, { replace: true });
  };

  const onAuthError = (): void => {
    dispatch(signOut());
    navigate('/?modal=login&redirect=/packages/starred');
  };

  async function fetchStarredPackages() {
    try {
      setIsLoading(true);
      const data = await API.getStarredByUser({
        limit: DEFAULT_LIMIT,
        offset: offset,
      });
      const total = parseInt(data.paginationTotalCount);
      if (total > 0 && data.items.length === 0) {
        onPageNumberChange(1);
      } else {
        setPackages(data.items);
        setTotal(total);
      }
      updatePageNumber();
      setApiError(null);
      setIsLoading(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setIsLoading(false);
      if (err.kind !== ErrorKind.Unauthorized) {
        setApiError('An error occurred getting your starred packages, please try again later.');
        setPackages([]);
      } else {
        onAuthError();
      }
    }
  }

  useEffect(() => {
    fetchStarredPackages();
  }, []);

  useEffect(() => {
    if (activePageParam && activePage !== parseInt(activePageParam)) {
      fetchStarredPackages();
    }
  }, [activePage]);

  return (
    <div className="d-flex flex-column flex-grow-1 position-relative">
      {(isUndefined(packages) || isLoading) && <Loading />}

      <main role="main" className="container-lg px-sm-4 px-lg-0 py-5">
        <div className="flex-grow-1 position-relative">
          <div className="h3 pb-0">
            <div className="d-flex align-items-center justify-content-center">
              <div>Your starred packages</div>
            </div>
          </div>

          <div className={`row mx-auto mt-4 noFocus ${styles.wrapper}`} role="list" id="content" tabIndex={-1}>
            {!isUndefined(packages) && (
              <>
                {packages.length === 0 ? (
                  <NoData issuesLinkVisible={!isNull(apiError)}>
                    {isNull(apiError) ? <>You have not starred any package yet</> : <>{apiError}</>}
                  </NoData>
                ) : (
                  <>
                    {packages.map((item: Package) => (
                      <PackageCard
                        className={styles.card}
                        cardWrapperClassName="col-12 col-xxl-6"
                        key={item.packageId}
                        package={item}
                        fromStarredPage={true}
                        noBadges
                      />
                    ))}
                  </>
                )}
              </>
            )}
          </div>
          {!isUndefined(total) && (
            <div className="mx-auto">
              <Pagination
                limit={DEFAULT_LIMIT}
                offset={offset}
                total={total}
                active={activePage}
                className="my-5"
                onChange={onPageNumberChange}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default StarredPackagesView;
