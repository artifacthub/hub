import isNull from 'lodash/isNull';
import { ChangeEvent, useState } from 'react';
import { FaLock } from 'react-icons/fa';
import { IoMdCloseCircle } from 'react-icons/io';
import { MdDone, MdNavigateNext } from 'react-icons/md';

import API from '../../../../../../api';
import { ErrorKind, TwoFactorAuth } from '../../../../../../types';
import alertDispatcher from '../../../../../../utils/alertDispatcher';
import compoundErrorMessage from '../../../../../../utils/compoundErrorMessage';
import BlockCodeButtons from '../../../../../common/BlockCodeButtons';
import ButtonCopyToClipboard from '../../../../../common/ButtonCopyToClipboard';
import InputField from '../../../../../common/InputField';
import Modal from '../../../../../common/Modal';
import styles from './EnableModal.module.css';

interface Props {
  onAuthError: () => void;
  onChange: () => void;
}

const EnableTwoFactorAuthenticationModal = (props: Props) => {
  const [openStatus, setOpenStatus] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [setUp, setSetUp] = useState<TwoFactorAuth | null | undefined>();
  const [activeStep, setActiveStep] = useState<number>(1);
  const [passcode, setPasscode] = useState<string>('');
  const [apiError, setApiError] = useState<null | string>(null);

  const onPasscodeChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPasscode(e.target.value);
    if (!isNull(apiError)) {
      setApiError(null);
    }
  };

  const onClose = () => {
    setOpenStatus(false);
    if (activeStep === 3) {
      props.onChange();
    }
    setSetUp(undefined);
    setApiError(null);
    setPasscode('');
    setActiveStep(1);
  };

  async function setUpTFA() {
    try {
      setIsLoading(true);
      setSetUp(await API.setUpTFA());
      setOpenStatus(true);
      setIsLoading(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setIsLoading(false);
      setSetUp(null);
      if (err.kind !== ErrorKind.Unauthorized) {
        const error = compoundErrorMessage(err, 'An error occurred turning on two-factor authentication');
        alertDispatcher.postAlert({
          type: 'danger',
          message: error,
        });
      } else {
        props.onAuthError();
      }
    }
  }

  async function enableTFA() {
    try {
      setIsProcessing(true);
      await API.enableTFA(passcode);
      setApiError(null);
      setActiveStep(3);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setIsProcessing(false);
      if (err.kind !== ErrorKind.Unauthorized) {
        const error = compoundErrorMessage(err, 'An error occurred turning on two-factor authentication');
        setApiError(error);
      } else {
        props.onAuthError();
      }
    }
  }

  return (
    <>
      <button className="btn btn-success btn-sm" onClick={setUpTFA} disabled={isLoading} aria-label="Open modal">
        <div className="d-flex flex-row align-items-center">
          {isLoading ? (
            <>
              <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
              <span className="ms-2">Enabling two-factor authentication...</span>
            </>
          ) : (
            <>
              <FaLock className="me-2" />
              <span>Enable two-factor authentication</span>
            </>
          )}
        </div>
      </button>

      <Modal
        modalClassName={styles.modal}
        header={<div className={`h3 m-2 flex-grow-1 text-truncate ${styles.title}`}>Setup 2FA</div>}
        open={openStatus}
        onClose={onClose}
        closeButton={
          <>
            <button
              className="btn btn-sm btn-outline-secondary text-uppercase"
              onClick={onClose}
              aria-label={activeStep === 3 ? 'Close' : 'Cancel'}
            >
              <div className="d-flex flex-row align-items-center">
                <IoMdCloseCircle className="me-2" />
                <span>{activeStep === 3 ? 'Close' : 'Cancel'}</span>
              </div>
            </button>

            {(() => {
              switch (activeStep) {
                case 1:
                  return (
                    <button
                      className="btn btn-sm btn-outline-secondary ms-3"
                      onClick={(e) => {
                        e.preventDefault();
                        setActiveStep(2);
                      }}
                      aria-label="Open next step"
                    >
                      <div className="d-flex flex-row align-items-center text-uppercase">
                        <MdNavigateNext className="me-2" />
                        <span>Next</span>
                      </div>
                    </button>
                  );
                case 2:
                  return (
                    <button
                      className="btn btn-sm btn-success ms-3"
                      onClick={(e) => {
                        e.preventDefault();
                        enableTFA();
                      }}
                      disabled={passcode === '' || isProcessing}
                      aria-label="Enable two-factor authentication"
                    >
                      <div className="d-flex flex-row align-items-center text-uppercase">
                        {isProcessing ? (
                          <>
                            <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
                            <span className="ms-2">Enabling...</span>
                          </>
                        ) : (
                          <>
                            <FaLock className="me-2" />
                            <span>Enable</span>
                          </>
                        )}
                      </div>
                    </button>
                  );
                default:
                  return null;
              }
            })()}
          </>
        }
        error={apiError}
        cleanError={() => setApiError(null)}
      >
        <div className="mw-100 h-100 position-relative">
          {setUp && (
            <>
              {(() => {
                switch (activeStep) {
                  case 1:
                    return (
                      <>
                        <div className="h4">Recovery codes</div>
                        <div className={`mt-3 mb-4 ${styles.label}`}>
                          These codes can be used if you lose access to your 2FA credentials. Each of the codes can only
                          be used once.{' '}
                          <span className="fw-bold">Please treat them as passwords and store them safely</span>.
                        </div>
                        <div className={`border border-1 position-relative p-2 p-sm-4 ${styles.codesWrapper}`}>
                          <BlockCodeButtons
                            filename="artifacthub-recovery-codes.txt"
                            content={setUp.recoveryCodes.join('\n')}
                            hiddenCopyBtn
                          />

                          <div className="d-flex flex-column align-items-center overflow-auto">
                            {setUp.recoveryCodes.map((code: string) => (
                              <div className={`font-monospace ${styles.code}`} key={`code_${code}`}>
                                {code}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="mt-4 alert alert-warning">
                          We strongly recommend you to download and print your recovery codes before proceeding with the
                          2FA setup.
                        </div>
                      </>
                    );
                  case 2:
                    return (
                      <>
                        <div className="h4">Authentication app</div>
                        <div className={`mt-3 mb-4 ${styles.label}`}>
                          Please scan the image below with your 2FA authentication app. If you can't scan it, you can
                          use{' '}
                          <ButtonCopyToClipboard
                            text={setUp.secret}
                            wrapperClassName="d-inline-block"
                            icon={<></>}
                            visibleBtnText
                            contentBtn="this text code"
                            className={`btn-link text-reset p-0 text-secondary fw-bold ${styles.copyBtn}`}
                            label="Copy 2FA code to clipboard"
                          />
                          to set it up manually.
                        </div>

                        <div className="text-center mb-4">
                          <div className="border border-1 d-inline-block p-1 my-1">
                            <img className={styles.qrCode} src={setUp.qrCode} alt="QR code" />
                          </div>
                        </div>

                        <div className={`mb-4 ${styles.label}`}>
                          Please enter one of the codes from the 2FA authentication app to confirm your account has been
                          setup successfully before completing the process.
                        </div>

                        <InputField
                          className={styles.inputWrapper}
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
                      </>
                    );
                  case 3:
                    return (
                      <div className="d-flex flex-column h-100 w-100 px-3 align-items-center justify-content-center text-center position-relative">
                        {isNull(apiError) && (
                          <>
                            <MdDone className="display-4 text-success mb-4" />
                            Two-factor authentication has been successfully enabled. We recommend you to sign out and
                            back in to your account.
                          </>
                        )}
                      </div>
                    );
                  default:
                    return null;
                }
              })()}
            </>
          )}
        </div>
      </Modal>
    </>
  );
};

export default EnableTwoFactorAuthenticationModal;
