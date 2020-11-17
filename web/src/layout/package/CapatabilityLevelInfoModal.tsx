import React, { useState } from 'react';
import { MdInfoOutline } from 'react-icons/md';

import Loading from '../common/Loading';
import Modal from '../common/Modal';
import styles from './CapatabilityLevelInfoModal.module.css';

const CapatabilityLevelInfoModal = () => {
  const [onLoadedImage, setOnLoadedImage] = useState<boolean>(false);

  return (
    <Modal
      className="d-none d-lg-inline-block mt-1 ml-2"
      buttonContent={<MdInfoOutline />}
      buttonType={`btn-link btn-sm px-0 pb-0 text-secondary ${styles.btn}`}
      header={<div className="h5 m-0 flex-grow-1">Capability level</div>}
    >
      <div className="my-3 mw-100">
        <div className={styles.imageWrapper}>
          {!onLoadedImage && <Loading />}
          <img
            src="/static/media/capability-level-diagram.svg"
            alt="Capability Level Diagram"
            className="capability-level-diagram mw-100"
            onLoad={() => setOnLoadedImage(true)}
          />
        </div>
      </div>
    </Modal>
  );
};

export default CapatabilityLevelInfoModal;
