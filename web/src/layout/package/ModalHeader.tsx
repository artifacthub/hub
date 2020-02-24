import React from 'react';
import { Package } from '../../types';
import Image from '../common/Image';
import styles from './ModalHeader.module.css';

interface Props {
  package: Package;
}

const ModalHeader = (props: Props) => (
  <div className="d-flex align-items-center">
    <div className={`d-flex align-items-center justify-content-center p-1 overflow-hidden ${styles.imageWrapper}`}>
      <Image
        className={styles.image}
        alt={props.package.displayName || props.package.name}
        imageId={props.package.logoImageId}
      />
    </div>

    <div className="ml-3">
      <div className="h5 mb-0">
        {props.package.displayName || props.package.name}
      </div>
    </div>
  </div>
);

export default ModalHeader;
