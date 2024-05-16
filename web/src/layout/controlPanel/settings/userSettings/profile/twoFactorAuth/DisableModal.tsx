import isNull from 'lodash/isNull';
import { ChangeEvent, useState } from 'react';
import { FaUnlock } from 'react-icons/fa';
import { IoMdCloseCircle } from 'react-icons/io';

import API from '../../../../../../api';
import { ErrorKind } from '../../../../../../types';
import InputField from '../../../../../common/InputField';
import Modal from '../../../../../common/Modal';
import styles from './DisableModal.module.css';

interface Props {
  onAuthError: () => void;
  onChange: () => void;
}

const DisableTwoFactorAuthenticationModal = (props: Props) => {
  const [openStatus, setOpenStatus] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [passcode, setPasscode] = useState<string>('');
  const [apiError, setApiError] = useState<null | string>(null);

  const onPasscodeChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPasscode(e.target.value);
    if (!isNull(apiError)) {
      setApiError(null);
    }
  };

  async function disableTFA() {
    try {
      setIsProcessing(true);
      await API.disableTFA(passcode);
      setApiError(null);
      props.onChange();
      setOpenStatus(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setIsProcessing(false);
      if (err.kind !== ErrorKind.Unauthorized) {
        setApiError('An error occurred turning off two-factor authentication, please try again later.');
      } else {
        props.onAuthError();
      }
    }
  }

  return (
    <>
      <button
        className="btn btn-danger btn-sm"
        onClick={() => setOpenStatus(true)}
        aria-label="Open disable two-factor authentication modal"
      >
        <div className="d-flex flex-row align-items-center">
          <FaUnlock className="me-2" />
          <span>Disable two-factor authentication</span>
        </div>
      </button>

      <Modal
        modalClassName={styles.modal}
        header={<div className={`h3 m-2 flex-grow-1 text-truncate ${styles.title}`}>Disable 2FA</div>}
        open={openStatus}
        onClose={() => setOpenStatus(false)}
        closeButton={
          <>
            <button
              className="btn btn-sm btn-outline-secondary text-uppercase"
              onClick={() => setOpenStatus(false)}
              aria-label="Cancel"
            >
              <div className="d-flex flex-row align-items-center">
                <IoMdCloseCircle className="me-2" />
                <span>Cancel</span>
              </div>
            </button>

            <button
              className="btn btn-sm btn-danger ms-3"
              onClick={(e) => {
                e.preventDefault();
                disableTFA();
              }}
              disabled={passcode === '' || isProcessing}
              aria-label="Disable two-factor authentication"
            >
              <div className="d-flex flex-row align-items-center text-uppercase">
                {isProcessing ? (
                  <>
                    <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
                    <span className="ms-2">Disabling...</span>
                  </>
                ) : (
                  <>
                    <FaUnlock className="me-2" />
                    <span>Disable</span>
                  </>
                )}
              </div>
            </button>
          </>
        }
        error={apiError}
        cleanError={() => setApiError(null)}
      >
        <div className="mw-100">
          <div className={`mb-4 ${styles.label}`}>
            To disable two-factor authentication for your account please enter one of the codes from the 2FA
            authentication app or one of your recovery codes.
          </div>

          <InputField
            type="text"
            name="passcode"
            autoComplete="off"
            value={passcode}
            onChange={onPasscodeChange}
            invalidText={{
              default: 'This field is required',
            }}
            validateOnBlur
            required
          />
        </div>
      </Modal>
    </>
  );
};

export default DisableTwoFactorAuthenticationModal;
