import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useCallback, useEffect, useState } from 'react';
import { GoPackage } from 'react-icons/go';

import { ContainerImage } from '../../types';
import ButtonCopyToClipboard from '../common/ButtonCopyToClipboard';
import SeeAllModal from '../common/SeeAllModal';
import SmallTitle from '../common/SmallTitle';
import styles from './ContainersImages.module.css';

interface Props {
  containers?: ContainerImage[] | null;
  packageId: string;
}

interface ContainersList {
  items: JSX.Element[];
  itemsForModal: JSX.Element[] | JSX.Element;
}

const ContainersImages = (props: Props) => {
  const getAllContainers = useCallback((): ContainersList | null => {
    if (isUndefined(props.containers) || isNull(props.containers) || props.containers.length === 0) return null;

    let items: JSX.Element[] = [];
    let itemsForModal: JSX.Element[] = [];

    props.containers.forEach((containerImage: ContainerImage, index: number) => {
      const copyBtn = (
        <>
          {!isUndefined(containerImage.image) && (
            <ButtonCopyToClipboard
              text={containerImage.image}
              className={`btn-link text-secondary border-0 ${styles.copyBtn}`}
            />
          )}
        </>
      );

      items.push(
        <div
          data-testid="containerImageItem"
          className="py-1 py-sm-0"
          key={`container-${index}-${containerImage.image}`}
        >
          <div className="d-flex flex-row align-items-start mw-100">
            <GoPackage className={`text-muted mr-2 ${styles.icon}`} />
            <div data-testid="containerImage" className={`text-truncate ${styles.containerImage}`}>
              {containerImage.name || containerImage.image}
            </div>
            {copyBtn}
          </div>
        </div>
      );

      itemsForModal.push(
        <tr key={`container-row-${index}-${containerImage.image}`}>
          <td>
            <div className={`d-flex flex-row align-items-center`}>
              <div className="mx-1">
                <GoPackage className="text-muted" />
              </div>
              <div data-testid="containerImage" className="text-truncate pl-1">
                {containerImage.name || containerImage.image}
              </div>
              {copyBtn}
            </div>
          </td>
        </tr>
      );
    });

    return {
      items,
      itemsForModal: (
        <table className={`table table-striped table-bordered table-sm mb-0 ${styles.table}`}>
          <thead>
            <tr className={`table-primary ${styles.tableTitle}`}>
              <th scope="col">
                <span className="px-1">Image</span>
              </th>
            </tr>
          </thead>
          <tbody>{itemsForModal}</tbody>
        </table>
      ),
    };
  }, [props.containers]);

  const [containers, setContainers] = useState<ContainersList | null>(getAllContainers());

  useEffect(() => {
    setContainers(getAllContainers());
  }, [props.containers, getAllContainers]);

  if (isNull(containers)) return null;

  return (
    <>
      <SmallTitle text="Containers Images" />
      <div className="mb-3">
        <SeeAllModal title="Containers Images" {...containers} packageId={props.packageId} />
      </div>
    </>
  );
};

export default React.memo(ContainersImages);
