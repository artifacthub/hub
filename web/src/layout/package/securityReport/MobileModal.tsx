import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import Modal from '../../common/Modal';
import styles from './MobileModal.module.css';

interface Props {
  visibleSecurityReport: boolean;
}

const MobileModal = (props: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [openStatus, setOpenStatus] = useState<boolean>(false);

  const onCloseModal = () => {
    setOpenStatus(false);
    navigate('', {
      state: location.state,
      replace: true,
    });
  };

  useEffect(() => {
    if (props.visibleSecurityReport && !openStatus) {
      setOpenStatus(true);
    }
  }, []);

  return (
    <>
      {openStatus && (
        <Modal
          modalDialogClassName={styles.modalDialog}
          modalClassName="h-100"
          header={<div className={`h3 m-2 flex-grow-1 ${styles.title}`}>Security report</div>}
          onClose={onCloseModal}
          breakPoint="md"
          open
          footerClassName={styles.modalFooter}
        >
          <div className="d-flex flex-column h-100 align-items-center justify-content-center text-center">
            <p className="mb-3">Security report details are not available on mobile devices.</p>
            <p className="mb-0 small text-muted">Visit this page on a larger screen to review the full report.</p>
          </div>
        </Modal>
      )}
    </>
  );
};

export default MobileModal;
