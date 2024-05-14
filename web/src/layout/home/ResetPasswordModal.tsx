import classnames from 'classnames';
import every from 'lodash/every';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { CgLastpass } from 'react-icons/cg';
import { MdClose, MdDone } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';

import API from '../../api';
import { ErrorKind, RefInputField } from '../../types';
import compoundErrorMessage from '../../utils/compoundErrorMessage';
import InputField from '../common/InputField';
import Loading from '../common/Loading';
import Modal from '../common/Modal';
import ResetPassword from '../navigation/ResetPassword';
import styles from './ResetPasswordModal.module.css';

interface Password {
  value: string;
  isValid: boolean;
}

interface FormValidation {
  isValid: boolean;
  password?: string;
}

interface Props {
  code?: string | null;
}

const ResetPasswordModal = (props: Props) => {
  const [code, setCode] = useState(props.code);
  const [verifying, setVerifying] = useState<boolean | null>(null);
  const [validCode, setValidCode] = useState<boolean | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const passwordInput = useRef<RefInputField>(null);
  const repeatPasswordInput = useRef<RefInputField>(null);
  const [password, setPassword] = useState<Password>({ value: '', isValid: false });
  const [displayResetPwd, setDisplayResetPwd] = useState<boolean>(false);
  const navigate = useNavigate();
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isValidated, setIsValidated] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiPwdError, setApiPwdError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const onPasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPassword({ value: e.target.value, isValid: e.currentTarget.checkValidity() });
  };

  // Clean API error when form is focused after validation
  const cleanApiError = () => {
    if (!isNull(apiError)) {
      setApiError(null);
    }
  };

  async function resetPassword(password: string) {
    try {
      await API.resetPassword(code!, password);
      setIsSuccess(true);
      setIsSending(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const error = compoundErrorMessage(err, 'An error occurred resetting the password');
      setApiError(error);
      setIsSending(false);
    }
  }

  const submitForm = () => {
    cleanApiError();
    setIsSending(true);
    if (form.current) {
      validateForm(form.current).then((validation: FormValidation) => {
        if (validation.isValid) {
          resetPassword(validation.password!);
          setIsValidated(true);
        } else {
          setIsSending(false);
        }
      });
    }
  };

  const validateForm = async (form: HTMLFormElement): Promise<FormValidation> => {
    let currentPassword: string | undefined;
    return validateAllFields().then((isValid: boolean) => {
      if (isValid) {
        const formData = new FormData(form);

        currentPassword = formData.get('password') as string;
      }
      setIsValidated(true);
      return { isValid, password: currentPassword };
    });
  };

  const validateAllFields = async (): Promise<boolean> => {
    return Promise.all([passwordInput.current!.checkIsValid(), repeatPasswordInput.current!.checkIsValid()]).then(
      (res: boolean[]) => {
        return every(res, (isValid: boolean) => isValid);
      }
    );
  };

  useEffect(() => {
    async function verifyPasswordResetCode() {
      setVerifying(true);
      try {
        await API.verifyPasswordResetCode(code!);
        setValidCode(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        if (err.kind === ErrorKind.Gone) {
          setApiError('This password reset link is no longer valid, please get a new one.');
          setDisplayResetPwd(true);
        } else {
          let error = 'An error occurred with your password reset code.';
          if (!isUndefined(err.message)) {
            error = `Sorry, ${err.message}`;
          }
          setApiPwdError(error);
        }
        setValidCode(false);
      } finally {
        setVerifying(false);
      }
    }

    if (code) {
      navigate(
        {
          pathname: '/',
          search: '',
        },
        { replace: true }
      );
      if (code !== props.code) {
        setCode(code);
      }
      verifyPasswordResetCode();
    }
  }, [code]);

  if (isUndefined(code) || isNull(code) || isNull(verifying)) return null;

  const closeButton = (
    <button
      className="btn btn-sm btn-outline-secondary"
      type="button"
      disabled={isSending}
      onClick={submitForm}
      aria-label="Reset password"
    >
      <div className="d-flex flex-row align-items-center">
        {isSending ? (
          <>
            <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
            <span className="ms-2">Resetting password...</span>
          </>
        ) : (
          <>
            <CgLastpass className="me-2" />
            <span className="text-uppercase">Reset password</span>
          </>
        )}
      </div>
    </button>
  );

  return (
    <Modal
      data-testid="resetPwdModal"
      header={<div className={`h3 m-2 flex-grow-1 ${styles.title}`}>Reset password</div>}
      disabledClose={verifying}
      modalClassName={styles.modal}
      open
      closeButton={validCode && !isSuccess ? closeButton : undefined}
      error={apiError}
      cleanError={cleanApiError}
    >
      <div
        className={`d-flex flex-column h-100 w-100 align-items-center justify-content-center text-center position-relative ${styles.content}`}
      >
        {verifying ? (
          <>
            <Loading className="position-relative" spinnerClassName="mt-0" />
            <small className="text-muted">We are verifying your code...</small>
          </>
        ) : (
          <div className="text-start w-100">
            {validCode ? (
              <>
                {isSuccess ? (
                  <div className="d-flex flex-column text-center h5">
                    <div className="display-4 text-success mb-4">
                      <MdDone />
                    </div>
                    Your password has been reset successfully. You can now log in using the new credentials.
                  </div>
                ) : (
                  <form
                    ref={form}
                    data-testid="resetPwdForm"
                    className={classnames(
                      'w-100',
                      { 'needs-validation': !isValidated },
                      { 'was-validated': isValidated }
                    )}
                    onFocus={cleanApiError}
                    autoComplete="off"
                    noValidate
                  >
                    <InputField
                      ref={passwordInput}
                      type="password"
                      label="Password"
                      name="password"
                      minLength={6}
                      invalidText={{
                        default: 'This field is required',
                        customError: 'Insecure password',
                      }}
                      onChange={onPasswordChange}
                      autoComplete="new-password"
                      checkPasswordStrength
                      validateOnChange
                      validateOnBlur
                      required
                    />

                    <InputField
                      ref={repeatPasswordInput}
                      type="password"
                      label="Confirm password"
                      labelLegend={<small className="ms-1 fst-italic">(Required)</small>}
                      name="confirmPassword"
                      pattern={password.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}
                      invalidText={{
                        default: 'This field is required',
                        patternMismatch: "Passwords don't match",
                      }}
                      autoComplete="new-password"
                      validateOnBlur={password.isValid}
                      required
                    />
                  </form>
                )}
              </>
            ) : (
              <>
                {displayResetPwd && <ResetPassword visibleTitle={false} onFinish={cleanApiError} />}
                {apiPwdError && (
                  <div className="d-flex flex-column text-center h5">
                    <div className="display-4 text-danger mb-4">
                      <MdClose />
                    </div>
                    {apiPwdError}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ResetPasswordModal;
