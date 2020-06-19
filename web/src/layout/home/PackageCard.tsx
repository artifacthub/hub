import React from 'react';

import { Package } from '../../types';
import PackageHeader from '../common/PackageInfo';
import styles from './PackageCard.module.css';

interface Props {
  package: Package;
}

const PackageCard = (props: Props) => (
  <div className={`position-relative mw-100 ${styles.card}`}>
    <div className={`card-body d-flex flex-column ${styles.body}`}>
      <PackageHeader package={props.package} withPackageLinks />
    </div>
  </div>
);

export default PackageCard;
