import { isNull } from 'lodash';
import React, { useState } from 'react';
import { FaUnlock } from 'react-icons/fa';
import { IoMdCloseCircle } from 'react-icons/io';

import { API } from '../../../../../../api';
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

  const onPasscodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    } catch (err) {
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
      <button className="btn btn-danger btn-sm" onClick={() => setOpenStatus(true)}>
        <div className="d-flex flex-row align-items-center">
          <FaUnlock className="mr-2" />
          <span>Disable two-factor authentication</span>
        </div>
      </button>

      <Modal
        modalDialogClassName={styles.modalDialog}
        modalClassName={styles.modal}
        header={<div className={`h3 m-2 flex-grow-1 text-truncate ${styles.title}`}>Disable 2FA</div>}
        open={openStatus}
        onClose={() => setOpenStatus(false)}
        closeButton={
          <>
            <button
              className={`btn btn-sm btn-light text-uppercase ${styles.btnLight}`}
              onClick={() => setOpenStatus(false)}
            >
              <div className="d-flex flex-row align-items-center">
                <IoMdCloseCircle className="mr-2" />
                <span>Cancel</span>
              </div>
            </button>

            <button
              className="btn btn-sm btn-danger ml-3"
              onClick={(e) => {
                e.preventDefault();
                disableTFA();
              }}
              disabled={passcode === '' || isProcessing}
            >
              <div className="d-flex flex-row align-items-center text-uppercase">
                {isProcessing ? (
                  <>
                    <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
                    <span className="ml-2">Disabling...</span>
                  </>
                ) : (
                  <>
                    <FaUnlock className="mr-2" />
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
