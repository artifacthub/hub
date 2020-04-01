import classnames from 'classnames';
import every from 'lodash/every';
import isNull from 'lodash/isNull';
import React, { useRef, useState } from 'react';
import { MdDone } from 'react-icons/md';

import { API } from '../../api';
import { RefInputField, ResourceKind, User } from '../../types';
import InputField from '../common/InputField';
import Modal from '../common/Modal';
import styles from './SignUp.module.css';

interface FormValidation {
  isValid: boolean;
  user: null | User;
}

interface Password {
  value: string;
  isValid: boolean;
}

interface Props {
  openSignUp: boolean;
  setOpenSignUp: React.Dispatch<React.SetStateAction<boolean>>;
}

const SignUp = (props: Props) => {
  const registerForm = useRef<HTMLFormElement>(null);
  const usernameInput = useRef<RefInputField>(null);
  const emailInput = useRef<RefInputField>(null);
  const passwordInput = useRef<RefInputField>(null);
  const repeatPasswordInput = useRef<RefInputField>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const [isValidatingField, setIsValidatingField] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [password, setPassword] = useState<Password>({ value: '', isValid: false });
  const [success, setSuccess] = useState(false);

  const onPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword({ value: e.target.value, isValid: e.currentTarget.checkValidity() });
  };

  // Clean API error when form is focused after validation
  const cleanApiError = () => {
    if (!isNull(apiError)) {
      setApiError(null);
    }
  };

  const onCloseModal = () => {
    props.setOpenSignUp(false);
  };

  async function registerUser(user: User) {
    try {
      await API.register(user);
      setSuccess(true);
    } catch (err) {
      let error = 'An error occurred, please try again later';
      switch (err.status) {
        case 400:
          error = `Error: ${err.statusText}`;
          break;
      }
      setApiError(error);
    } finally {
      setIsLoading(false);
    }
  }

  const submitForm = () => {
    if (!isValidatingField) {
      cleanApiError();
      setIsLoading(true);
      if (registerForm.current) {
        validateForm(registerForm.current).then((validation: FormValidation) => {
          if (validation.isValid && !isNull(validation.user)) {
            registerUser(validation.user);
          } else {
            setIsLoading(false);
          }
        });
      }
    }
  };

  const validateForm = async (form: HTMLFormElement): Promise<FormValidation> => {
    let user: User | null = null;

    return validateAllFields().then((isValid: boolean) => {
      if (isValid) {
        const formData = new FormData(form);
        user = {
          alias: formData.get('alias') as string,
          email: formData.get('email') as string,
          password: formData.get('password') as string,
        };

        if (formData.get('firstName') !== '') {
          user['firstName'] = formData.get('firstName') as string;
        }

        if (formData.get('lastName') !== '') {
          user['lastName'] = formData.get('lastName') as string;
        }
      }
      setIsValidated(true);
      return { isValid, user };
    });
  };

  const validateAllFields = async (): Promise<boolean> => {
    return Promise.all([
      usernameInput.current!.checkIsValid(),
      emailInput.current!.checkIsValid(),
      passwordInput.current!.checkIsValid(),
      repeatPasswordInput.current!.checkIsValid(),
    ]).then((res: boolean[]) => {
      return every(res, (isValid: boolean) => isValid);
    });
  };

  const closeButton = (
    <button className="btn btn-secondary" type="button" disabled={isLoading} onClick={submitForm}>
      {isLoading ? (
        <>
          <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
          <span className="ml-2">Signing up...</span>
        </>
      ) : (
        <>Sign up</>
      )}
    </button>
  );

  const handleOnReturnKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      submitForm();
    }
  };

  return (
    <Modal
      header={<div className="h3 m-2">Sign up</div>}
      modalClassName={styles.modal}
      closeButton={!success ? closeButton : undefined}
      open={props.openSignUp}
      onClose={onCloseModal}
      error={apiError}
      cleanError={cleanApiError}
    >
      {success ? (
        <div className="d-flex h-100 w-100 align-items-center justify-content-center">
          <div className="alert" role="alert">
            <div className="d-flex flex-sm-column flex-md-row align-items-center">
              <div className="mr-3">
                <MdDone className="h1 text-success mb-3 mb-md-0" />
              </div>
              <h4 className="alert-heading">A verification link has been sent to your email account</h4>
            </div>
            <hr />
            <p className="mb-0">
              Please click on the link that has just been sent to your email account to verify your email and finish the
              registration process.
            </p>
          </div>
        </div>
      ) : (
        <form
          ref={registerForm}
          className={classnames('w-100', { 'needs-validation': !isValidated }, { 'was-validated': isValidated })}
          onFocus={cleanApiError}
          noValidate
        >
          <InputField
            ref={usernameInput}
            type="text"
            label="Username"
            labelLegend={<small className="ml-1 font-italic">(Required)</small>}
            name="alias"
            invalidText={{
              default: 'This field is required',
              customError: 'Username not available',
            }}
            checkAvailability={ResourceKind.userAlias}
            setValidationStatus={setIsValidatingField}
            validateOnBlur
            autoComplete="username"
            required
          />

          <InputField
            ref={emailInput}
            type="email"
            label="Email"
            labelLegend={<small className="ml-1 font-italic">(Required)</small>}
            name="email"
            invalidText={{
              default: 'This field is required',
              typeMismatch: 'Please enter a valid email address',
            }}
            validateOnBlur
            autoComplete="email"
            required
          />

          <InputField type="text" label="First Name" name="firstName" autoComplete="given-name" />

          <InputField type="text" label="Last Name" name="lastName" autoComplete="family-name" />

          <div className="form-row">
            <InputField
              ref={passwordInput}
              className="col-sm-12 col-md-6"
              type="password"
              label="Password"
              labelLegend={<small className="ml-1 font-italic">(6 characters min.)</small>}
              name="password"
              minLength={6}
              invalidText={{
                default: 'This field is required',
                tooShort: 'Passwords must be at least 6 characters long',
              }}
              onChange={onPasswordChange}
              autoComplete="new-password"
              validateOnBlur
              required
            />

            <InputField
              ref={repeatPasswordInput}
              className="col-sm-12 col-md-6"
              type="password"
              label="Confirm password"
              labelLegend={<small className="ml-1 font-italic">(Required)</small>}
              name="confirmPassword"
              pattern={password.value}
              invalidText={{
                default: 'This field is required',
                patternMismatch: "Passwords don't match",
              }}
              autoComplete="new-password"
              validateOnBlur={password.isValid}
              onKeyDown={handleOnReturnKeyDown}
              required
            />
          </div>
        </form>
      )}
    </Modal>
  );
};

export default SignUp;
