import isUndefined from 'lodash/isUndefined';
import React, { useEffect, useState } from 'react';

import { API } from '../../api';
import { Package } from '../../types';
import PackageCard from './PackageCard';
import styles from './RandomPackages.module.css';

const RandomPackages = () => {
  const [packages, setPackages] = useState<Package[] | undefined>(undefined);

  useEffect(() => {
    async function fetchPackagesUpdates() {
      try {
        setPackages(await API.getRandomPackages());
      } catch {
        setPackages([]);
      }
    }
    fetchPackagesUpdates();
  }, []);

  if (!isUndefined(packages) && packages.length === 0) {
    return null;
  }

  return (
    <div className={`position-relative ${styles.wrapper}`}>
      <div className="container mb-5 mt-5">
        <div className="d-flex flex-wrap justify-content-center">
          {!isUndefined(packages) && (
            <>
              {packages.length > 0 && (
                <div data-testid="randomPackagesList" className="mw-100 my-2">
                  <div className="h4 text-center text-secondary mt-2 mb-4">Explore and discover packages</div>

                  <div className="pt-2">
                    {packages.map((item: Package) => {
                      return <PackageCard key={`rp_${item.packageId}`} package={item} />;
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RandomPackages;
