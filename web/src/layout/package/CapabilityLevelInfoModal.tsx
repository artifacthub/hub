import { useState } from 'react';
import { MdInfoOutline } from 'react-icons/md';

import Loading from '../common/Loading';
import Modal from '../common/Modal';
import styles from './CapabilityLevelInfoModal.module.css';

const CapabilityLevelInfoModal = () => {
  const [onLoadedImage, setOnLoadedImage] = useState<boolean>(false);

  return (
    <Modal
      className="d-none d-lg-inline-block ms-2"
      buttonContent={<MdInfoOutline />}
      buttonType={`btn-link btn-sm px-0 pb-0 text-dark ${styles.btn}`}
      header={<div className={`h3 m-2 flex-grow-1 ${styles.title}`}>Capability level</div>}
    >
      <div className="my-3 mw-100">
        <div className={styles.imageWrapper}>
          {!onLoadedImage && <Loading />}
          <img
            src="/static/media/capability-level-diagram_v3.svg"
            alt="Capability Level Diagram"
            className="capability-level-diagram mw-100"
            onLoad={() => setOnLoadedImage(true)}
          />
        </div>
      </div>
    </Modal>
  );
};

export default CapabilityLevelInfoModal;
