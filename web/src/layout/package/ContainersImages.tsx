import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { memo, useCallback, useEffect, useState } from 'react';
import { GoPackage } from 'react-icons/go';

import { ContainerImage } from '../../types';
import ButtonCopyToClipboard from '../common/ButtonCopyToClipboard';
import ElementWithTooltip from '../common/ElementWithTooltip';
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
  const getBadge = (): JSX.Element => (
    <ElementWithTooltip
      className={styles.tooltipIcon}
      element={<span className={`badge rounded-pill my-1 border ${styles.badge}`}>Whitelisted</span>}
      tooltipMessage="This image has been whitelisted by the publisher and it won't be scanned for security vulnerabilities."
      visibleTooltip
      active
    />
  );

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
              className={`btn-link text-dark border-0 position-relative ${styles.copyBtn}`}
              label={`Copy ${containerImage.name || containerImage.image} container image to clipboard`}
            />
          )}
        </>
      );

      items.push(
        <div
          data-testid="containerImageItem"
          className="py-1 py-sm-0"
          key={`container-${index}-${containerImage.image}`}
          role="listitem"
        >
          <div className="d-flex flex-row align-items-start mw-100">
            <GoPackage className={`text-muted me-2 ${styles.icon}`} />
            <div data-testid="containerImage" className={`text-truncate text-break ${styles.containerImage}`}>
              {containerImage.name || containerImage.image}
            </div>
            {copyBtn}
          </div>
          {containerImage.whitelisted && (
            <div className={`d-flex flex-column mb-1 ${styles.badgesWrapper}`}>
              <div className="d-flex flex-row align-items-center">
                <div className={`border border-top-0 border-end-0 ${styles.badgeDecorator} position-relative mx-1`} />
                {getBadge()}
              </div>
            </div>
          )}
        </div>
      );

      itemsForModal.push(
        <tr key={`container-row-${index}-${containerImage.image}`}>
          <td>
            <div className={`d-flex flex-row align-items-center`}>
              <div className="mx-1">
                <GoPackage className="text-muted" />
              </div>
              <div data-testid="containerImage" className="text-truncate ps-1">
                {containerImage.name || containerImage.image}
              </div>
              {copyBtn}
              {containerImage.whitelisted && <div className="ms-2 me-1">{getBadge()}</div>}
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
            <tr className={styles.tableTitle}>
              <th scope="col">
                <span className="px-1">Image</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white">{itemsForModal}</tbody>
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

export default memo(ContainersImages);
