import React from 'react';
import { PackagesUpdatesInfo, Package } from '../../types';
import UpdatesCard from './UpdatesCard';

interface Props {
  packages: PackagesUpdatesInfo;
}

const Updates = (props: Props) => (
  <div className="container mb-5 mt-2">
    <div className="d-flex flex-wrap justify-content-center">
      {props.packages.latest_packages_added.length > 0 && (
        <div className="m-sm-4 m-0 mw-100">
          <div className="h5 text-center text-muted mb-4">Latest packages added</div>

          {props.packages.latest_packages_added.map((packageItem: Package) => {
            return (
              <UpdatesCard
                key={`lpa_${packageItem.package_id}`}
                packageItem={packageItem}
              />
            );
          })}
        </div>
      )}

      {props.packages.packages_recently_updated.length > 0 && (
        <div className="m-sm-4 m-0 mw-100">
          <div className="h5 text-center text-muted mb-4">Packages recently updated</div>

          {props.packages.packages_recently_updated.map((packageItem: Package) => {
            return (
              <UpdatesCard
                key={`pru_${packageItem.package_id}`}
                packageItem={packageItem}
              />
            );
          })}
        </div>
      )}
    </div>
  </div>
);

export default Updates;
