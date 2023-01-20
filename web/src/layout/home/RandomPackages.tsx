import classnames from 'classnames';
import isUndefined from 'lodash/isUndefined';
import { useEffect, useState } from 'react';

import API from '../../api';
import { Package } from '../../types';
import Loading from '../common/Loading';
import NoData from '../common/NoData';
import PackageCard from '../common/PackageCard';
import styles from './RandomPackages.module.css';

const RandomPackages = () => {
  const [packages, setPackages] = useState<Package[] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchPackagesUpdates() {
      try {
        setIsLoading(true);
        setPackages(await API.getRandomPackages());
        setIsLoading(false);
      } catch {
        setIsLoading(false);
        setPackages([]);
      }
    }
    fetchPackagesUpdates();
  }, []);

  return (
    <div className={`position-relative ${styles.wrapper}`}>
      <div className="container-lg px-sm-4 px-lg-0 my-4 my-md-5">
        <div className="d-flex flex-wrap justify-content-center">
          {!isUndefined(packages) && !isLoading ? (
            <>
              <div data-testid="randomPackagesList" className="w-100 my-2">
                <div className="h4 text-center text-dark mt-0 mt-sm-3 mt-md-2 mb-2 mb-sm-4" aria-level={4}>
                  Explore and discover packages
                </div>

                {packages.length > 0 ? (
                  <div className="pt-2 row g-0 justify-content-center" role="list">
                    {packages.map((item: Package, index: number) => {
                      return (
                        <PackageCard
                          key={`rp_${item.packageId}`}
                          package={item}
                          className={styles.card}
                          cardWrapperClassName={classnames('col-12 col-xxl-6 col-xxxl-5', {
                            'd-none d-xxl-block': index > 4,
                          })}
                          noBadges
                        />
                      );
                    })}
                  </div>
                ) : (
                  <NoData>
                    It looks like you haven't added any content yet. You can add repositories from the control panel
                    once you log in.
                  </NoData>
                )}
              </div>
            </>
          ) : (
            <Loading spinnerClassName="position-relative" />
          )}
        </div>
      </div>
    </div>
  );
};

export default RandomPackages;
