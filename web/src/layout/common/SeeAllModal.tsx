import { isUndefined } from 'lodash';
import { useEffect, useState } from 'react';
import { HiPlusCircle } from 'react-icons/hi';

import Modal from './Modal';
import styles from './SeeAllModal.module.css';

interface Props {
  packageId?: string;
  version?: string;
  title: string;
  visibleItems?: number;
  items: JSX.Element[];
  itemsForModal?: JSX.Element[] | JSX.Element;
  open?: boolean;
  modalClassName?: string;
}

const DEFAULT_VISIBLE_ITEMS = 5;

const SeeAllModal = (props: Props) => {
  const numVisibleItems = props.visibleItems || DEFAULT_VISIBLE_ITEMS;
  const getFirstItems = (): JSX.Element => {
    return (
      <>
        <div className="d-none d-md-block">{props.items.slice(0, props.visibleItems ? numVisibleItems : 3)}</div>
        <div className="d-block d-md-none">{props.items.slice(0, props.visibleItems ? numVisibleItems : 5)}</div>
      </>
    );
  };

  const [openStatus, setOpenStatus] = useState(props.open || false);
  const [visibleItems, setVisibleItems] = useState<JSX.Element>(getFirstItems());

  useEffect(() => {
    if (!isUndefined(props.open) && openStatus !== props.open) {
      setOpenStatus(props.open);
    }
  }, [props.open, openStatus]);

  useEffect(() => {
    if (openStatus) {
      setOpenStatus(!openStatus);
    }
    setVisibleItems(getFirstItems());
  }, [props.packageId, props.version, props.items]); /* eslint-disable-line react-hooks/exhaustive-deps */

  return (
    <>
      {props.items.length <= numVisibleItems ? (
        <div role="list">{props.items}</div>
      ) : (
        <>
          <div role="list">{visibleItems}</div>

          <div className={`d-block d-md-none ${styles.legend}`}>
            <small className="text-muted font-italic">Displaying only the first 5 entries</small>
          </div>

          <button
            className={`btn btn-link pl-0 d-none d-md-block position-relative text-primary ${styles.btn}`}
            onClick={() => setOpenStatus(true)}
            aria-label="See all entries"
          >
            <div className="d-flex flex-row align-items-center">
              <HiPlusCircle className="mr-1" />
              <span>See all</span>
            </div>
          </button>

          <Modal
            modalDialogClassName={styles.modalDialog}
            modalClassName={`${props.modalClassName} ${styles.modal}`}
            header={<div className={`h3 m-2 flex-grow-1 text-truncate ${styles.title}`}>{props.title}</div>}
            open={openStatus}
            onClose={() => setOpenStatus(false)}
          >
            <div className="my-3 mw-100">
              <div className="d-none d-md-block">{props.itemsForModal || props.items}</div>
              <div className="d-block d-md-none" role="list">
                {props.items}
              </div>
            </div>
          </Modal>
        </>
      )}
    </>
  );
};

export default SeeAllModal;
