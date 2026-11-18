import classnames from 'classnames';
import every from 'lodash/every';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { ChangeEvent, Dispatch, KeyboardEvent, SetStateAction, useContext, useRef, useState } from 'react';
import { FaSignInAlt } from 'react-icons/fa';
import { IoIosArrowBack } from 'react-icons/io';
import { useLocation, useNavigate } from 'react-router-dom';

import API from '../../api';
import { AppCtx, refreshUserProfile, signOut } from '../../context/AppCtx';
import { ErrorKind, RefInputField, UserLogin } from '../../types';
import cleanLoginUrlParams from '../../utils/cleanLoginUrlParams';
import compoundErrorMessage from '../../utils/compoundErrorMessage';
import getRetryAfterText from '../../utils/getRetryAfterText';
import InputField from '../common/InputField';
import Modal from '../common/Modal';
import ApproveSessionForm from './ApproveSessionForm';
import styles from './LogIn.module.css';
import OAuth from './OAuth';
import ResetPassword from './ResetPassword';

// Shown after the text for too many incorrect codes in the passcode step
const TOO_MANY_CODES_HINT =
  'If you didn\'t make these attempts, someone may know your password: go back and use "Forgot password?" to reset it to a new password. That signs out every other session and stops them; then finish signing in with a recovery code, or with a code from your app once the wait is over.';

interface FormValidation {
  isValid: boolean;
  user: null | UserLogin;
}

interface Loading {
  status: boolean;
  type?: 'log' | 'google' | 'github' | 'oidc';
}

interface Props {
  openLogIn: boolean;
  setOpenLogIn: Dispatch<SetStateAction<boolean>>;
  redirect: string | null;
  visibleModal: string | null;
}

const LogIn = (props: Props) => {
  const { dispatch } = useContext(AppCtx);
  const navigate = useNavigate();
  const location = useLocation();
  const loginForm = useRef<HTMLFormElement>(null);
  const emailInput = useRef<RefInputField>(null);
  const passwordInput = useRef<RefInputField>(null);
  const [isLoading, setIsLoading] = useState<Loading>({ status: false });
  const [isValidated, setIsValidated] = useState(false);
  const [visible2FACode, setVisible2FACode] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [visibleResetPassword, setVisibleResetPassword] = useState(false);

  // Clean API error when form is focused after validation
  const cleanApiError = () => {
    if (!isNull(apiError)) {
      setApiError(null);
    }
  };

  const onEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const onCloseModal = () => {
    if (!isNull(props.redirect) || !isNull(props.visibleModal)) {
      // If redirect option is defined and user closes login modal,
      // querystring with login parameters is cleaned to avoid open modal again on refresh
      navigate(
        {
          pathname: location.pathname,
          search: cleanLoginUrlParams(location.search),
        },
        { replace: true }
      );
    }
    setVisibleResetPassword(false);
    props.setOpenLogIn(false);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onLoginError = (err: any) => {
    let error = compoundErrorMessage(err, 'An error occurred signing in');
    if (err.kind === ErrorKind.Unauthorized) {
      error = 'Authentication failed. Please check your credentials.';
    } else if (err.kind === ErrorKind.TooManyAttempts) {
      error = `Too many sign-in attempts for this account. Please try again in ${getRetryAfterText(
        err.retryAfter
      )}, or use "Forgot password?" to reset your password and sign in.`;
    } else if (err.kind === ErrorKind.TooManyRequests) {
      error = `Too many requests. Please try again in ${getRetryAfterText(err.retryAfter)}.`;
    }
    setApiError(error);
    setIsLoading({ status: false });
    dispatch(signOut());
  };

  const onLoginSuccess = () => {
    setIsLoading({ status: false });
    dispatch(refreshUserProfile(dispatch, props.redirect));
    props.setOpenLogIn(false);
  };

  async function loginUser(user: UserLogin) {
    try {
      await API.login(user);
      onLoginSuccess();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      if (err.kind === ErrorKind.NotApprovedSession) {
        setIsLoading({ status: false });
        setVisible2FACode(true);
      } else {
        onLoginError(err);
      }
    }
  }

  const submitForm = () => {
    // Each request uses one of the sign-in attempts allowed for the account,
    // so only one is sent at a time
    if (isLoading.status) return;
    cleanApiError();
    setIsLoading({ type: 'log', status: true });
    if (loginForm.current) {
      validateForm(loginForm.current).then((validation: FormValidation) => {
        if (validation.isValid && !isNull(validation.user)) {
          loginUser(validation.user);
        } else {
          setIsLoading({ status: false });
        }
      });
    }
  };

  const validateForm = (form: HTMLFormElement): Promise<FormValidation> => {
    let user: UserLogin | null = null;

    return validateAllFields().then((isValid: boolean) => {
      if (isValid) {
        const formData = new FormData(form);
        user = {
          email: formData.get('email') as string,
          password: formData.get('password') as string,
        };
      }
      setIsValidated(true);
      return { isValid, user };
    });
  };

  const validateAllFields = async (): Promise<boolean> => {
    return Promise.all([emailInput.current!.checkIsValid(), passwordInput.current!.checkIsValid()]).then(
      (res: boolean[]) => {
        return every(res, (isValid: boolean) => isValid);
      }
    );
  };

  const handleOnReturnKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter' && !event.repeat && !isNull(loginForm)) {
      submitForm();
    }
  };

  return (
    <Modal
      header={<div className={`h3 m-2 flex-grow-1 ${styles.title}`}>Sign in</div>}
      modalClassName={styles.modal}
      open={props.openLogIn}
      onClose={onCloseModal}
      error={apiError}
      cleanError={cleanApiError}
    >
      {visibleResetPassword ? (
        <div className="h-100 d-flex flex-column">
          <div>
            <button
              className="btn btn-sm btn-link ps-0 mb-2 text-no-decoration"
              type="button"
              onClick={() => setVisibleResetPassword(false)}
              aria-label="Back to Sign in"
            >
              <div className="d-flex flex-row align-items-center">
                <IoIosArrowBack className="me-2" />
                Back to Sign in
              </div>
            </button>
          </div>

          <div className="flex-grow-1 w-100 d-flex align-items-center">
            <ResetPassword visibleTitle />
          </div>
        </div>
      ) : (
        <>
          {visible2FACode ? (
            <div className="h-100 d-flex flex-column">
              <div>
                <button
                  className="btn btn-sm btn-link ps-0 mb-2 text-no-decoration"
                  type="button"
                  onClick={() => setVisible2FACode(false)}
                  aria-label="Back to Sign in"
                >
                  <div className="d-flex flex-row align-items-center">
                    <IoIosArrowBack className="me-2" />
                    Back to Sign in
                  </div>
                </button>
              </div>

              <ApproveSessionForm
                onSuccess={onLoginSuccess}
                onError={setApiError}
                expiredHint="Go back and sign in again."
                tooManyHint={TOO_MANY_CODES_HINT}
              />
            </div>
          ) : (
            <div className="my-auto">
              <form
                ref={loginForm}
                data-testid="loginForm"
                className={classnames('w-100', { 'needs-validation': !isValidated }, { 'was-validated': isValidated })}
                onFocus={cleanApiError}
                autoComplete="on"
                noValidate
              >
                <InputField
                  ref={emailInput}
                  type="email"
                  label="Email"
                  name="email"
                  value=""
                  invalidText={{
                    default: 'This field is required',
                    typeMismatch: 'Please enter a valid email address',
                  }}
                  autoComplete="email"
                  onChange={onEmailChange}
                  validateOnBlur={email !== ''}
                  required
                  autoFocus={true}
                />

                <InputField
                  ref={passwordInput}
                  type="password"
                  label="Password"
                  name="password"
                  value=""
                  invalidText={{
                    default: 'This field is required',
                  }}
                  validateOnBlur
                  onKeyDown={handleOnReturnKeyDown}
                  autoComplete="current-password"
                  required
                />

                <div className="d-flex flex-row align-items-row justify-content-between">
                  <button
                    className="btn btn-sm btn-link ps-0 text-no-decoration"
                    type="button"
                    onClick={() => setVisibleResetPassword(true)}
                    aria-label="Open reset password"
                  >
                    Forgot password?
                  </button>

                  <button
                    className="btn btn-sm btn-outline-secondary"
                    type="button"
                    disabled={isLoading.status}
                    onClick={submitForm}
                    aria-label="Sign in"
                  >
                    <div className="d-flex flex-row align-items-center text-uppercase">
                      {!isUndefined(isLoading.type) && isLoading.type === 'log' ? (
                        <>
                          <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
                          <span className="ms-2">Signing in...</span>
                        </>
                      ) : (
                        <>
                          <FaSignInAlt className="me-2" />
                          <>Sign in</>
                        </>
                      )}
                    </div>
                  </button>
                </div>
              </form>
            </div>
          )}

          {!visible2FACode && <OAuth isLoading={isLoading} setIsLoading={setIsLoading} />}
        </>
      )}
    </Modal>
  );
};

export default LogIn;
