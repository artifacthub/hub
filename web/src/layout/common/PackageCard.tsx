import isUndefined from 'lodash/isUndefined';
import React from 'react';
import { Link } from 'react-router-dom';

import { Package, SearchFiltersURL } from '../../types';
import buildPackageURL from '../../utils/buildPackageURL';
import styles from './PackageCard.module.css';
import PackageInfo from './PackageInfo';

interface Props {
  package: Package;
  saveScrollPosition?: () => void;
  searchUrlReferer?: SearchFiltersURL;
  fromStarredPage?: boolean;
  visibleSignedBadge?: boolean;
}

const PackageCard = (props: Props) => (
  <div className="col-12 py-sm-3 py-2" role="listitem">
    <div className={`card h-100 ${styles.card}`}>
      <Link
        data-testid="link"
        className={`text-decoration-none text-reset ${styles.link}`}
        onClick={() => {
          if (!isUndefined(props.saveScrollPosition)) {
            props.saveScrollPosition();
          }
        }}
        to={{
          pathname: buildPackageURL(props.package),
          state: { searchUrlReferer: props.searchUrlReferer, fromStarredPage: props.fromStarredPage },
        }}
      >
        <div className={`card-body d-flex flex-column ${styles.body}`}>
          <PackageInfo
            package={props.package}
            visibleSignedBadge={props.visibleSignedBadge}
            withPackageLinks={false}
            breakpointForInfoSection="lg"
          />
        </div>
      </Link>
    </div>
  </div>
);

export default PackageCard;
