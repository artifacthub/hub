import React from 'react';
import { Link } from 'react-router-dom';

import { Package } from '../../types';
import buildPackageURL from '../../utils/buildPackageURL';
import PackageInfo from '../common/PackageInfo';
import styles from './PackageCard.module.css';

interface Props {
  package: Package;
  className?: string;
}

const PackageCard = (props: Props) => (
  <div className={`col-12 col-xxl-5 py-sm-3 py-2 px-0 px-xxl-3 position-relative ${props.className}`}>
    <div className={`card cardWithHover h-100 ${styles.card}`}>
      <Link
        data-testid="link"
        className={`text-decoration-none text-reset h-100 ${styles.link}`}
        to={{
          pathname: buildPackageURL(props.package.normalizedName, props.package.repository, props.package.version!),
        }}
      >
        <div className={`card-body d-flex flex-column h-100 ${styles.body}`}>
          <PackageInfo package={props.package} withPackageLinks={false} />
        </div>
      </Link>
    </div>
  </div>
);

export default PackageCard;
