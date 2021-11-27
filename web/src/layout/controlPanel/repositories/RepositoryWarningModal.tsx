import { useState } from 'react';
import { FaRegQuestionCircle } from 'react-icons/fa';

import Modal from '../../common/Modal';
import styles from './RepositoryWarningModal.module.css';

const RepositoryWarningModal = () => {
  const [openStatus, setOpenStatus] = useState<boolean>(false);

  return (
    <>
      <button
        className={`d-inline-block pl-0 pr-1 py-0 btn btn-link btn-sm ${styles.trackingWarningBtn}`}
        onClick={() => setOpenStatus(true)}
        aria-label="Open repository warning modal"
      >
        <small>
          <FaRegQuestionCircle className={`position-relative ${styles.icon}`} />
        </small>
      </button>
      {openStatus && (
        <Modal className="d-inline-block" noFooter onClose={() => setOpenStatus(false)} open={openStatus}>
          <div className="mw-100 text-left text-dark">
            <div className="d-flex flex-row justify-content-between mb-4">
              <div className={`h3 d-flex flex-row align-items-baseline ${styles.title}`}>Warning info</div>

              <div>
                <button
                  type="button"
                  className={`close ${styles.closeModalBtn}`}
                  onClick={() => {
                    setOpenStatus(false);
                  }}
                  aria-label="Close"
                >
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
            </div>

            <div className={styles.content}>
              <p>
                This warning sign indicates that the tracking operation that took place at the processed time displayed
                failed. You can see more details about why it failed by opening the tracking errors log modal.
              </p>
              <p>
                Please note that <span className="font-weight-bold">this warning will remain visible</span> until the
                next time the repository is processed successfully. Repositories are checked for updates every{' '}
                <span className="font-italic">30 minutes approximately</span>, but they are only
                <span className="font-italic mx-1">processed</span> if they have{' '}
                <span className="font-weight-bold">changed since the last time they were processed</span>.
              </p>
              <p>
                Depending on the nature of the error, an action on your side may be required or not. In the case of
                isolated network errors, you can ignore the warning and it'll be cleaned up automatically on the next
                successful tracking operation.
              </p>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default RepositoryWarningModal;
