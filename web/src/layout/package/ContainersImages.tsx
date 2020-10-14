import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React from 'react';

import { ContainerImage } from '../../types';
import ButtonCopyToClipboard from '../common/ButtonCopyToClipboard';
import SmallTitle from '../common/SmallTitle';
import styles from './ContainersImages.module.css';

interface Props {
  containers?: ContainerImage[] | null;
}

const ContainersImages = (props: Props) => {
  if (isUndefined(props.containers) || isNull(props.containers) || props.containers.length === 0) return null;
  return (
    <>
      <SmallTitle text="Container Image" />
      <div className="mb-3">
        {props.containers.map((containerImage: ContainerImage) => (
          <div className={styles.containerImage} key={`container-${containerImage.image}`}>
            {containerImage.name || containerImage.image}
            <div className="d-inline-block">
              <ButtonCopyToClipboard
                text={containerImage.image}
                className="btn-link pl-2 text-secondary border-0 d-inline"
              />
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default ContainersImages;
