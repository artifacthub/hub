import React, { useState, useRef } from 'react';
import classnames from 'classnames';
import isNull from 'lodash/isNull';
import { API } from '../../api';
import { UserLogin, UserAuth } from '../../types';
import InputField from '../common/InputField';
import isUndefined from 'lodash/isUndefined';
import Modal from '../common/Modal';
import styles from './LogIn.module.css';
import { useHistory } from 'react-router-dom';

interface FormValidation {
  isValid: boolean;
  user: null | UserLogin;
}

interface Props {
  setIsAuth: React.Dispatch<React.SetStateAction<UserAuth | null>>;
  onSuccess?: () => void;
  openLogIn: boolean;
  setOpenLogIn: React.Dispatch<React.SetStateAction<boolean>>;
  redirect?: string;
}

const LogIn = (props: Props) => {
  const history = useHistory();
  const loginForm = useRef<HTMLFormElement>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Clean API error when form is focused after validation
  const cleanApiError = () => {
    if (!isNull(apiError)) {
      setApiError(null);
    }
  }

  const onCloseModal = () => {
    if (!isUndefined(props.redirect)) {
      // If redirect option is defined and user closes login modal,
      // querystring is cleaned to avoid open modal again on refresh
      history.replace({
        pathname: '/',
      });
    }
    props.setOpenLogIn(false);
  }

  async function loginUser(user: UserLogin) {
    try {
      await API.login(user);
      if (!isUndefined(props.onSuccess)) {
        props.onSuccess();
      }
      setIsLoggingIn(false);
      props.setIsAuth({status: true});
      props.setOpenLogIn(false);
      if (!isUndefined(props.redirect)) {
        history.push({
          pathname: props.redirect,
        });
      }
    } catch(err) {
      let error = 'An error occurred, please try again later';
      switch(err.status) {
        case 400:
          error = `Error: ${err.statusText}`;
          break;
        case 401:
          error = 'Authentication failed. Please check your credentials';
          break;
      }
      setApiError(error);
      setIsLoggingIn(false);
      props.setIsAuth({status: false});
    }
  }

  const submitForm = () => {
    cleanApiError();
    setIsLoggingIn(true);
    if (loginForm.current) {
      const {isValid, user} = validateForm(loginForm.current);
      if (isValid && !isNull(user)) {
        loginUser(user);
      } else {
        setIsLoggingIn(false);
      }
    }
  }

  const validateForm = (form: HTMLFormElement): FormValidation => {
    let isValid = form.checkValidity();
    let user: UserLogin | null = null;

    if (isValid) {
      const formData = new FormData(form);
      user = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
      };
    } else {
      setIsValidated(true);
    }
    return { isValid, user };
  }

  const handleOnReturnKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter' && !isNull(loginForm)) {
      submitForm();
    }
  }

  return (
    <Modal
      header={<div className="h3 m-2">Sign in</div>}
      modalClassName={styles.modal}
      closeButton={(
        <button
          className="btn btn-secondary"
          type="button"
          disabled={isLoggingIn}
          onClick={submitForm}
        >
          {isLoggingIn ? (
            <>
              <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
              <span className="ml-2">Singing in...</span>
            </>
          ) : (
            <>Sign in</>
          )}
        </button>
      )}
      open={props.openLogIn}
      onClose={onCloseModal}
    >
      <div className="d-flex align-items-center flex-grow-1">
        <form
          ref={loginForm}
          className={classnames(
            'w-100',
            {'needs-validation': !isValidated},
            {'was-validated': isValidated},
          )}
          onFocus={cleanApiError}
          autoComplete="on"
          noValidate
        >
          <InputField
            type="email"
            label="Email address"
            name="email"
            value=""
            invalidText={{
              default: "This field is required",
            }}
            validateOnBlur
            autoComplete="email"
            required
          />

          <InputField
            type="password"
            label="Password"
            name="password"
            value=""
            invalidText={{
              default: "This field is required",
            }}
            validateOnBlur
            onKeyDown={handleOnReturnKeyDown}
            autoComplete="current-password"
            required
          />

          {!isNull(apiError) && (
            <div className="alert alert-danger mt-3" role="alert">
              {apiError}
            </div>
          )}
        </form>
      </div>
    </Modal>
  );
}

export default LogIn;
