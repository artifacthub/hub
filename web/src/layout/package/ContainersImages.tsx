import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { memo, useCallback, useEffect, useState } from 'react';
import { FiPackage } from 'react-icons/fi';

import { ContainerImage, RepositoryKind } from '../../types';
import ButtonCopyToClipboard from '../common/ButtonCopyToClipboard';
import ElementWithTooltip from '../common/ElementWithTooltip';
import SeeAllModal from '../common/SeeAllModal';
import SmallTitle from '../common/SmallTitle';
import styles from './ContainersImages.module.css';

interface Props {
  containers?: ContainerImage[] | null;
  packageId: string;
  kind: RepositoryKind;
}

interface ContainersList {
  items: JSX.Element[];
  itemsForModal: JSX.Element[] | JSX.Element;
}

const ContainersImages = (props: Props) => {
  const getBadge = (): JSX.Element => (
    <ElementWithTooltip
      className={styles.tooltipIcon}
      element={<span className={`badge my-1 border border-1 ${styles.badge}`}>Whitelisted</span>}
      tooltipMessage="This image has been whitelisted by the publisher and it won't be scanned for security vulnerabilities."
      visibleTooltip
      active
    />
  );

  const getAllContainers = useCallback((): ContainersList | null => {
    if (
      isUndefined(props.containers) ||
      isNull(props.containers) ||
      props.containers.length === 0 ||
      props.kind === RepositoryKind.Container
    )
      return null;

    const items: JSX.Element[] = [];
    const itemsForModal: JSX.Element[] = [];

    props.containers.forEach((containerImage: ContainerImage, index: number) => {
      const copyBtn = (className?: string) => (
        <>
          {!isUndefined(containerImage.image) && (
            <ButtonCopyToClipboard
              text={containerImage.image}
              className={`btn-link text-dark border-0 position-relative ${styles.copyBtn} ${className}`}
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
          <div className="d-flex flex-row align-items-center mw-100">
            <FiPackage className={`text-muted me-2 ${styles.icon}`} />
            <div data-testid="containerImage" className={`text-truncate text-break ${styles.containerImage}`}>
              {containerImage.name || containerImage.image}
            </div>
            {copyBtn()}
          </div>
          {containerImage.whitelisted && (
            <div className={`d-flex flex-column mb-1 ${styles.badgesWrapper}`}>
              <div className="d-flex flex-row align-items-center">
                <div
                  className={`border border-1 border-top-0 border-end-0 ${styles.badgeDecorator} position-relative mx-1`}
                />
                {getBadge()}
              </div>
            </div>
          )}
        </div>
      );

      itemsForModal.push(
        <tr key={`container-row-${index}-${containerImage.image}`}>
          <td className={styles.image}>
            <div className={`d-flex flex-row align-items-center`}>
              <div className="mx-1">
                <FiPackage className="text-muted" />
              </div>
              <div data-testid="containerImage" className="text-truncate ps-1">
                {containerImage.name || containerImage.image}
              </div>
              {copyBtn('mt-1')}
              {containerImage.whitelisted && <div className="ms-2 me-1">{getBadge()}</div>}
            </div>
          </td>
          <td className="align-middle">
            {!isUndefined(containerImage.platforms) && containerImage.platforms.length > 0 ? (
              <div className="d-flex flex-row flex-wrap pt-1">
                {containerImage.platforms.map((platform: string) => (
                  <div
                    className={`d-inline badge fw-normal me-2 mb-1 mw-100 text-truncate ${styles.platformBadge}`}
                    key={`${containerImage.image}_${platform}`}
                  >
                    {platform}
                  </div>
                ))}
              </div>
            ) : (
              <span>-</span>
            )}
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
              <th scope="col" className={styles.imageCol}>
                <span className="px-1">Image</span>
              </th>
              <th scope="col">
                <span className="px-1">Platforms</span>
              </th>
            </tr>
          </thead>
          <tbody className={styles.body}>{itemsForModal}</tbody>
        </table>
      ),
    };
  }, [props.containers, props.kind]);

  const [containers, setContainers] = useState<ContainersList | null>(getAllContainers());

  useEffect(() => {
    setContainers(getAllContainers());
  }, [props.containers, getAllContainers]);

  if (isNull(containers)) return null;

  return (
    <>
      <SmallTitle text="Containers Images" />
      <div className="mb-3">
        <SeeAllModal
          title="Containers Images"
          moreBtnText="details"
          {...containers}
          packageId={props.packageId}
          size="xl"
          visibleModal
        />
      </div>
    </>
  );
};

export default memo(ContainersImages);
