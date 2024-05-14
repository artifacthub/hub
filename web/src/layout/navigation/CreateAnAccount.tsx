import classnames from 'classnames';
import every from 'lodash/every';
import isNull from 'lodash/isNull';
import { ChangeEvent, Dispatch, FormEvent, forwardRef, SetStateAction, useRef, useState } from 'react';
import { MdDone } from 'react-icons/md';

import API from '../../api';
import { RefInputField, ResourceKind, User } from '../../types';
import compoundErrorMessage from '../../utils/compoundErrorMessage';
import InputField from '../common/InputField';

interface Loading {
  status: boolean;
  type?: 'log' | 'google' | 'github' | 'oidc';
}
interface FormValidation {
  isValid: boolean;
  user: null | User;
}

interface Password {
  value: string;
  isValid: boolean;
}

interface Props {
  apiError: string | null;
  setApiError: Dispatch<SetStateAction<string | null>>;
  success: boolean;
  setSuccess: Dispatch<SetStateAction<boolean>>;
  isLoading: Loading;
  setIsLoading: Dispatch<SetStateAction<Loading>>;
}

const CreateAnAccount = forwardRef<HTMLFormElement, Props>((props, ref) => {
  const usernameInput = useRef<RefInputField>(null);
  const emailInput = useRef<RefInputField>(null);
  const passwordInput = useRef<RefInputField>(null);
  const repeatPasswordInput = useRef<RefInputField>(null);
  const [isValidated, setIsValidated] = useState(false);
  const [isValidatingField, setIsValidatingField] = useState(false);
  const [password, setPassword] = useState<Password>({ value: '', isValid: false });

  const onPasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPassword({ value: e.target.value, isValid: e.currentTarget.checkValidity() });
  };

  // Clean API error when form is focused after validation
  const cleanApiError = () => {
    if (!isNull(props.apiError)) {
      props.setApiError(null);
    }
  };

  async function registerUser(user: User) {
    try {
      await API.register(user);
      props.setSuccess(true);
      props.setIsLoading({ status: false });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const error = compoundErrorMessage(err, 'An error occurred registering the user');
      props.setApiError(error);
      props.setIsLoading({ status: false });
    }
  }

  const submitForm = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isValidatingField) {
      cleanApiError();
      props.setIsLoading({ type: 'log', status: true });
      if (e.currentTarget) {
        validateForm(e.currentTarget).then((validation: FormValidation) => {
          if (validation.isValid && !isNull(validation.user)) {
            registerUser(validation.user);
          } else {
            props.setIsLoading({ status: false });
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

  return (
    <>
      {props.success ? (
        <div className="d-flex h-100 w-100 align-items-center justify-content-center">
          <div className="alert" role="alert" aria-live="assertive" aria-atomic="true">
            <div className="d-flex flex-sm-column flex-md-row align-items-center">
              <div className="me-3">
                <MdDone className="h1 text-success mb-3 mb-md-0" />
              </div>
              <h4 className="alert-heading">A verification link has been sent to your email account</h4>
            </div>
            <hr />
            <p>
              Please click on the link that has just been sent to your email account to verify your email and finish the
              registration process.
            </p>
            <p className="mb-0">
              Please note that the verification code <span className="fw-bold">is only valid for 24 hours</span>. If you
              haven't verified your account by then you'll need to sign up again.
            </p>
          </div>
        </div>
      ) : (
        <>
          <form
            ref={ref}
            data-testid="createAnAccountForm"
            className={classnames('w-100', { 'needs-validation': !isValidated }, { 'was-validated': isValidated })}
            onFocus={cleanApiError}
            onSubmit={(e: FormEvent<HTMLFormElement>) => submitForm(e)}
            autoComplete="on"
            noValidate
          >
            <InputField
              ref={usernameInput}
              type="text"
              label="Username"
              labelLegend={<small className="ms-1 fst-italic">(Required)</small>}
              name="alias"
              invalidText={{
                default: 'This field is required',
                customError: 'Username not available',
              }}
              checkAvailability={{
                isAvailable: true,
                resourceKind: ResourceKind.userAlias,
                excluded: [],
              }}
              setValidationStatus={setIsValidatingField}
              validateOnBlur
              autoComplete="username"
              required
            />

            <InputField
              ref={emailInput}
              type="email"
              label="Email"
              labelLegend={<small className="ms-1 fst-italic">(Required)</small>}
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

            <InputField
              ref={passwordInput}
              type="password"
              label="Password"
              name="password"
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
        </>
      )}
    </>
  );
});

export default CreateAnAccount;
