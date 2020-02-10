import React from 'react';
import { PackageDetail } from '../../types';
import Image from '../common/Image';
import styles from './Install.module.css';

interface Props {
  package: PackageDetail;
}

const ModalHeader = (props: Props) => (
  <div className="d-flex align-items-center">
    <div className={`d-flex align-items-center justify-content-center p-1 overflow-hidden ${styles.imageWrapper}`}>
      <Image className={styles.image} alt={props.package.name} src={props.package.logo_url} />
    </div>

    <div className="ml-3">
      <div className="h5 mb-0">{props.package.display_name || props.package.name}</div>
    </div>
  </div>
);

export default ModalHeader;
