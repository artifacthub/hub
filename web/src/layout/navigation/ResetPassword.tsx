import classnames from 'classnames';
import isUndefined from 'lodash/isUndefined';
import { ChangeEvent, useRef, useState } from 'react';
import { CgLastpass } from 'react-icons/cg';
import { MdDone } from 'react-icons/md';

import API from '../../api';
import { RefInputField } from '../../types';
import InputField from '../common/InputField';

interface FormValidation {
  isValid: boolean;
  resetPwdEmail?: string;
}

interface Props {
  visibleTitle: boolean;
  onFinish?: () => void;
  onFocus?: () => void;
}

const ResetPassword = (props: Props) => {
  const resetPwdForm = useRef<HTMLFormElement>(null);
  const resetPwdEmailInput = useRef<RefInputField>(null);
  const [isValidated, setIsValidated] = useState(false);
  const [resetPwdEmail, setResetPwdEmail] = useState('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const onResetPwdEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    setResetPwdEmail(e.target.value);
  };

  async function requestPasswordResetCode(email: string) {
    try {
      await API.requestPasswordResetCode(email);
      setIsSuccess(true);
      setIsSending(false);
    } catch {
      setIsSending(false);
    } finally {
      if (props.onFinish) {
        props.onFinish();
      }
    }
  }

  const submitForm = () => {
    if (resetPwdForm.current) {
      setIsSending(true);
      validateForm().then((validation: FormValidation) => {
        if (validation.isValid && !isUndefined(validation.resetPwdEmail)) {
          requestPasswordResetCode(validation.resetPwdEmail);
        } else {
          setIsSending(false);
        }
      });
    }
  };

  const validateForm = (): Promise<FormValidation> => {
    let email: undefined | string;

    return resetPwdEmailInput.current!.checkIsValid().then((isValid: boolean) => {
      if (isValid) {
        email = resetPwdEmail;
      }
      setIsValidated(true);
      return { isValid: isValid, resetPwdEmail: email };
    });
  };

  return (
    <>
      {isSuccess ? (
        <div className="d-flex flex-column text-center">
          <div className="display-4 text-success mb-4">
            <MdDone />
          </div>
          We have sent a password reset link to your email, please check your inbox (and the spam folder if needed).
        </div>
      ) : (
        <form
          data-testid="resetPasswordForm"
          ref={resetPwdForm}
          className={classnames('w-100', { 'needs-validation': !isValidated }, { 'was-validated': isValidated })}
          autoComplete="on"
          onFocus={() => {
            if (props.onFocus) {
              props.onFocus();
            }
          }}
          noValidate
        >
          <div className="my-auto">
            {props.visibleTitle && <div className="h6 mb-3 fw-bold">Forgot Password?</div>}
            <p>Please enter your email address and we will send you a password reset link.</p>
            <InputField
              ref={resetPwdEmailInput}
              type="email"
              label="Email"
              name="resetPwdEmail"
              value=""
              invalidText={{
                default: 'This field is required',
                typeMismatch: 'Please enter a valid email address',
              }}
              autoComplete="email"
              onChange={onResetPwdEmailChange}
              validateOnBlur={resetPwdEmail !== ''}
              required
            />

            <div className="text-end">
              <button
                className="btn btn-sm btn-outline-secondary"
                type="button"
                disabled={isSending || resetPwdEmail === ''}
                onClick={submitForm}
                aria-label="Send password reset email"
              >
                <div className="d-flex flex-row align-items-center">
                  {isSending ? (
                    <>
                      <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
                      <span className="ms-2">Sending email...</span>
                    </>
                  ) : (
                    <>
                      <CgLastpass className="me-2" />
                      <>Send password reset email</>
                    </>
                  )}
                </div>
              </button>
            </div>
          </div>
        </form>
      )}
    </>
  );
};

export default ResetPassword;
