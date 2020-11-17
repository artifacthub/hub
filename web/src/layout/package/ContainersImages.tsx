import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React from 'react';
import { GoPackage } from 'react-icons/go';

import { ContainerImage } from '../../types';
import ButtonCopyToClipboard from '../common/ButtonCopyToClipboard';
import ExpandableList from '../common/ExpandableList';
import SmallTitle from '../common/SmallTitle';
import styles from './ContainersImages.module.css';

interface Props {
  containers?: ContainerImage[] | null;
}

const ContainersImages = (props: Props) => {
  if (isUndefined(props.containers) || isNull(props.containers) || props.containers.length === 0) return null;

  const allContainers: JSX.Element[] = props.containers.map((containerImage: ContainerImage, index: number) => (
    <div data-testid="containerImageItem" className="py-1 py-sm-0" key={`container-${index}-${containerImage.image}`}>
      <div className="d-flex flex-row align-items-start mw-100">
        <GoPackage className={`text-muted mr-2 ${styles.icon}`} />
        <div data-testid="containerImage" className={`text-truncate ${styles.containerImage}`}>
          {containerImage.name || containerImage.image}
        </div>
        <ButtonCopyToClipboard
          text={containerImage.image}
          className={`btn-link text-secondary border-0 ${styles.copyBtn}`}
        />
      </div>
    </div>
  ));

  return (
    <>
      <SmallTitle text="Containers Images" />
      <div className="mb-3">
        <ExpandableList items={allContainers} visibleItems={5} />
      </div>
    </>
  );
};

export default React.memo(ContainersImages);
