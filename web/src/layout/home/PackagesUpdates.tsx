import React, { useState, useEffect } from 'react';
import { API } from '../../api';
import { PackagesUpdatesList, Package } from '../../types';
import PackageCard from './PackageCard';
import isNull from 'lodash/isNull';
import Loading from '../common/Loading';
import styles from './PackagesUpdates.module.css';

const PackagesUpdates = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [packagesUpdates, setPackagesUpdates] = useState<PackagesUpdatesList | null>(null);

  useEffect(() => {
    setIsLoading(true);
    async function fetchPackagesUpdates() {
      try {
        setPackagesUpdates(await API.getPackagesUpdates());
        setIsLoading(false);
      } catch(err) {
        if (err.name !== 'AbortError') {
          setPackagesUpdates({
            latestPackagesAdded: [],
            packagesRecentlyUpdated: [],
          });
          setIsLoading(false);
        }
      }
    };
    fetchPackagesUpdates();
  }, []);

  if (!isLoading && !isNull(packagesUpdates) && (packagesUpdates.latestPackagesAdded.length === 0 && packagesUpdates.packagesRecentlyUpdated.length === 0)) {
    return null;
  }

  return (
    <div className={`position-relative ${styles.wrapper}`}>
      <div className="container mb-5 mt-4">
        <div className="d-flex flex-wrap justify-content-center">
          {!isNull(packagesUpdates) && !isLoading ? (
            <>
              {packagesUpdates.latestPackagesAdded.length > 0 && (
                <div data-testid="latestPackagesList" className="m-sm-4 m-0 mb-4 mw-100">
                  <div className="h5 text-center text-muted mb-4">Latest packages added</div>

                  {packagesUpdates.latestPackagesAdded.map((item: Package) => {
                    return (
                      <PackageCard
                        key={`lpa_${item.packageId}`}
                        package={item}
                      />
                    );
                  })}
                </div>
              )}

              {packagesUpdates.packagesRecentlyUpdated.length > 0 && (
                <div data-testid="recentlyUpdatedPackagesList" className="m-sm-4 m-0 mw-100">
                  <div className="h5 text-center text-muted mb-4">Packages recently updated</div>

                  {packagesUpdates.packagesRecentlyUpdated.map((item: Package) => {
                    return (
                      <PackageCard
                        key={`pru_${item.packageId}`}
                        package={item}
                      />
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <Loading />
          )}
        </div>
      </div>
    </div>
  );
}

export default PackagesUpdates;
