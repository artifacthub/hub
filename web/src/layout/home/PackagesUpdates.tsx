import React, { useState, useEffect } from 'react';
import API from '../../api';
import { PackagesUpdates as PackagesUpdatesProp, Package } from '../../types';
import PackageCard from './PackageCard';
import isNull from 'lodash/isNull';
import Loading from '../common/Loading';
import styles from './PackagesUpdates.module.css';

const PackagesUpdates = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [packagesUpdates, setPackagesUpdates] = useState<PackagesUpdatesProp | null>(null);

  useEffect(() => {
    async function fetchPackagesUpdates() {
      try {
        setPackagesUpdates(await API.getPackagesUpdates());
      } catch {
        setPackagesUpdates({
          latestPackagesAdded: [],
          packagesRecentlyUpdated: [],
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchPackagesUpdates();
  }, []);

  if (!isNull(packagesUpdates) && (packagesUpdates.latestPackagesAdded.length === 0 && packagesUpdates.packagesRecentlyUpdated.length === 0)) {
    return null;
  }

  return (
    <div className={`position-relative ${styles.wrapper}`}>
      <div className="container mb-5 mt-4">
        <div className="d-flex flex-wrap justify-content-center">
          {!isNull(packagesUpdates) && !isLoading ? (
            <>
              {packagesUpdates.latestPackagesAdded.length > 0 && (
                <div className="m-sm-4 m-0 mb-4 mw-100">
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
                <div className="m-sm-4 m-0 mw-100">
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
