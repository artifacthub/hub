import { useState } from 'react';
import { HiPlusCircle } from 'react-icons/hi';

import Modal from '../common/Modal';
import styles from './VersionsModal.module.css';

interface Props {
  packageId?: string;
  version?: string;
  title: string;
  visibleItems?: number;
  items: JSX.Element[];
  itemsForModal?: JSX.Element[] | JSX.Element;
}

const VersionsModal = (props: Props) => {
  const [openStatus, setOpenStatus] = useState(false);

  return (
    <>
      <div role="list">
        {props.items.length > 3 ? (
          <>
            <div className="d-none d-md-block">{props.items.slice(0, 3)}</div>
            <div className="d-block d-md-none">{props.items.slice(0, 5)}</div>
          </>
        ) : (
          <div>{props.items}</div>
        )}
      </div>

      <div className="d-none d-md-flex flex-row align-items-baseline">
        <button
          className={`btn btn-link ps-0 pe-1 position-relative text-primary ${styles.btn}`}
          onClick={() => setOpenStatus(true)}
          aria-label="See all entries"
        >
          <div className="d-flex flex-row align-items-center">
            <HiPlusCircle className="me-1" />
            <span>See all</span>
          </div>
        </button>

        <div className={`text-muted position-relative ${styles.summary}`}>({props.items.length})</div>
      </div>

      <Modal
        modalDialogClassName={styles.modalDialog}
        modalClassName={styles.modal}
        header={<div className={`h3 m-2 flex-grow-1 text-truncate ${styles.title}`}>{props.title}</div>}
        open={openStatus}
        onClose={() => setOpenStatus(false)}
        footerClassName={styles.modalFooter}
        size="lg"
      >
        <div className="my-3 mw-100">{props.itemsForModal}</div>
      </Modal>
    </>
  );
};

export default VersionsModal;
