import React from 'react';

import { RepositoryKind } from '../../types';
import Image from '../common/Image';
import styles from './ModalHeader.module.css';

interface Props {
  displayName?: string | null;
  name: string;
  logoImageId?: string;
  repoKind: RepositoryKind;
}

const ModalHeader = (props: Props) => (
  <div className="d-flex align-items-center">
    <div
      className={`d-flex align-items-center justify-content-center p-1 overflow-hidden ${styles.imageWrapper} imageWrapper`}
    >
      <Image
        className={styles.image}
        alt={props.displayName || props.name}
        imageId={props.logoImageId}
        kind={props.repoKind}
      />
    </div>

    <div className="ml-3 flex-grow-1">
      <div className="h5 mb-0">{props.displayName || props.name}</div>
    </div>
  </div>
);

export default ModalHeader;
