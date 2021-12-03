import isUndefined from 'lodash/isUndefined';
import { useRef, useState } from 'react';
import { FaPencilAlt } from 'react-icons/fa';
import { MdAddCircle } from 'react-icons/md';

import { Organization } from '../../../types';
import Modal from '../../common/Modal';
import OrganizationForm from './Form';
import styles from './Modal.module.css';

interface Props {
  open: boolean;
  organization?: Organization;
  onSuccess?: () => void;
  onClose: () => void;
  onAuthError: () => void;
}

const OrganizationModal = (props: Props) => {
  const form = useRef<HTMLFormElement>(null);
  const [isSending, setIsSending] = useState(false);
  const [apiError, setApiError] = useState<null | string>(null);

  const onCloseModal = () => {
    props.onClose();
  };

  const submitForm = () => {
    if (form.current) {
      form.current.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
  };

  return (
    <Modal
      header={
        <div className={`h3 m-2 flex-grow-1 ${styles.title}`}>
          {isUndefined(props.organization) ? <>Add organization</> : <>Update organization</>}
        </div>
      }
      open={props.open}
      modalClassName={styles.modal}
      closeButton={
        <button
          className="btn btn-sm btn-outline-secondary"
          type="button"
          disabled={isSending}
          onClick={submitForm}
          aria-label={`${isUndefined(props.organization) ? 'Add' : 'Update'} organization`}
        >
          {isSending ? (
            <>
              <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
              <span className="ms-2">
                {isUndefined(props.organization) ? <>Adding organization</> : <>Updating organization</>}
              </span>
            </>
          ) : (
            <div className="d-flex flex-row align-items-center text-uppercase">
              {isUndefined(props.organization) ? (
                <>
                  <MdAddCircle className="me-2" />
                  <div>Add</div>
                </>
              ) : (
                <>
                  <FaPencilAlt className="me-2" />
                  <div>Update</div>
                </>
              )}
            </div>
          )}
        </button>
      }
      onClose={onCloseModal}
      error={apiError}
      cleanError={() => setApiError(null)}
    >
      <div className="w-100">
        <OrganizationForm
          ref={form}
          organization={props.organization}
          onSuccess={() => {
            if (!isUndefined(props.onSuccess)) {
              props.onSuccess();
            }
            onCloseModal();
          }}
          setIsSending={setIsSending}
          onAuthError={props.onAuthError}
          setApiError={setApiError}
        />
      </div>
    </Modal>
  );
};

export default OrganizationModal;
