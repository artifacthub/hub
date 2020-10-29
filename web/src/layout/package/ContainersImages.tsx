import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React from 'react';
import { GoPackage } from 'react-icons/go';

import { ContainerImage } from '../../types';
import AttachedIconToText from '../common/AttachedIconToText';
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
      <SmallTitle text="Containers Images" />
      <div className="mb-3">
        {props.containers.map((containerImage: ContainerImage, index: number) => (
          <div className="py-1 py-sm-0" key={`container-${index}-${containerImage.image}`}>
            <div className="d-flex flex-row align-items-start mw-100">
              <GoPackage className={`text-muted mr-2 ${styles.icon}`} />
              <div data-testid="containerImage" className={`flex-grow-1 ${styles.containerImage}`}>
                <AttachedIconToText
                  text={containerImage.name || containerImage.image}
                  icon={
                    <ButtonCopyToClipboard text={containerImage.image} className="btn-link text-secondary border-0" />
                  }
                  isVisible
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default React.memo(ContainersImages);
