import classnames from 'classnames';
import isUndefined from 'lodash/isUndefined';
import React, { useEffect, useState } from 'react';

import { API } from '../../api';
import { Package } from '../../types';
import Loading from '../common/Loading';
import PackageCard from './PackageCard';
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

  if (!isLoading && !isUndefined(packages) && packages.length === 0) {
    return null;
  }

  return (
    <div className={`position-relative ${styles.wrapper}`}>
      <div className="container-lg px-sm-4 px-lg-0 my-4 my-md-5">
        <div className="d-flex flex-wrap justify-content-center">
          {!isUndefined(packages) && !isLoading ? (
            <>
              {packages.length > 0 && (
                <div data-testid="randomPackagesList" className="w-100 my-2">
                  <div className="h4 text-center text-secondary mt-3 mt-md-2 mb-4">Explore and discover packages</div>

                  <div className="pt-2 row no-gutters justify-content-center">
                    {packages.map((item: Package, index: number) => {
                      return (
                        <PackageCard
                          key={`rp_${item.packageId}`}
                          package={item}
                          className={classnames({ 'd-none d-xxl-block': index > 4 })}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
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
