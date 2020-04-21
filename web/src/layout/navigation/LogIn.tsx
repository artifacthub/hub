import classnames from 'classnames';
import every from 'lodash/every';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useContext, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';

import { API } from '../../api';
import { AppCtx, requestSignIn, signOut } from '../../context/AppCtx';
import { RefInputField, UserLogin } from '../../types';
import InputField from '../common/InputField';
import Modal from '../common/Modal';
import styles from './LogIn.module.css';
import OAuth from './OAuth';

interface FormValidation {
  isValid: boolean;
  user: null | UserLogin;
}

interface Loading {
  status: boolean;
  type?: 'log' | 'google' | 'github';
}

interface Props {
  openLogIn: boolean;
  setOpenLogIn: React.Dispatch<React.SetStateAction<boolean>>;
  redirect?: string;
}

const LogIn = (props: Props) => {
  const { dispatch } = useContext(AppCtx);
  const history = useHistory();
  const loginForm = useRef<HTMLFormElement>(null);
  const emailInput = useRef<RefInputField>(null);
  const passwordInput = useRef<RefInputField>(null);
  const [isLoading, setIsLoading] = useState<Loading>({ status: false });
  const [isValidated, setIsValidated] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [email, setEmail] = useState('');

  // Clean API error when form is focused after validation
  const cleanApiError = () => {
    if (!isNull(apiError)) {
      setApiError(null);
    }
  };

  const onEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const onCloseModal = () => {
    if (!isUndefined(props.redirect)) {
      // If redirect option is defined and user closes login modal,
      // querystring is cleaned to avoid open modal again on refresh
      history.replace({
        pathname: '/',
      });
    }
    props.setOpenLogIn(false);
  };

  async function loginUser(user: UserLogin) {
    try {
      await API.login(user);
      setIsLoading({ status: false });
      props.setOpenLogIn(false);
      dispatch(requestSignIn(props.redirect));
    } catch (err) {
      let error = 'An error occurred signing in';
      switch (err.status) {
        case 400:
          error += `: ${err.statusText}`;
          break;
        case 401:
          error = 'Authentication failed. Please check your credentials';
          break;
        default:
          error += ', please try again later';
      }
      setApiError(error);
      setIsLoading({ status: false });
      dispatch(signOut());
    }
  }

  const submitForm = () => {
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

  const handleOnReturnKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter' && !isNull(loginForm)) {
      submitForm();
    }
  };

  return (
    <Modal
      header={<div className="h3 m-2">Sign in</div>}
      modalClassName={styles.modal}
      open={props.openLogIn}
      onClose={onCloseModal}
      error={apiError}
      cleanError={cleanApiError}
    >
      <>
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

          <div className="text-right">
            <button
              data-testid="logInBtn"
              className="btn btn-secondary"
              type="button"
              disabled={isLoading.status}
              onClick={submitForm}
            >
              {!isUndefined(isLoading.type) && isLoading.type === 'log' ? (
                <>
                  <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
                  <span className="ml-2">Singing in...</span>
                </>
              ) : (
                <>Sign in</>
              )}
            </button>
          </div>
        </form>
      </>

      <OAuth isLoading={isLoading} setIsLoading={setIsLoading} />
    </Modal>
  );
};

export default LogIn;
