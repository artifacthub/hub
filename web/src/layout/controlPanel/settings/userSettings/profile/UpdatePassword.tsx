import classnames from 'classnames';
import every from 'lodash/every';
import React, { useRef, useState } from 'react';
import { FaPencilAlt } from 'react-icons/fa';

import { API } from '../../../../../api';
import { ErrorKind, RefInputField } from '../../../../../types';
import alertDispatcher from '../../../../../utils/alertDispatcher';
import compoundErrorMessage from '../../../../../utils/compoundErrorMessage';
import InputField from '../../../../common/InputField';

interface Password {
  value: string;
  isValid: boolean;
}

interface FormValidation {
  isValid: boolean;
  oldPassword: string | null;
  newPassword: string | null;
}

const UpdatePassword = () => {
  const form = useRef<HTMLFormElement>(null);
  const oldPasswordInput = useRef<RefInputField>(null);
  const passwordInput = useRef<RefInputField>(null);
  const repeatPasswordInput = useRef<RefInputField>(null);
  const [isSending, setIsSending] = useState(false);
  const [password, setPassword] = useState<Password>({ value: '', isValid: false });
  const [isValidated, setIsValidated] = useState(false);

  const onPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword({ value: e.target.value, isValid: e.currentTarget.checkValidity() });
  };

  async function updatePassword(oldPassword: string, newPassword: string) {
    try {
      setIsSending(true);
      await API.updatePassword(oldPassword, newPassword);
      cleanForm();
      setIsSending(false);
      setIsValidated(false);
    } catch (err) {
      setIsSending(false);
      if (err.kind !== ErrorKind.Unauthorized) {
        let error = compoundErrorMessage(err, 'An error occurred updating your password');
        alertDispatcher.postAlert({
          type: 'danger',
          message: error,
        });
      } else {
        alertDispatcher.postAlert({
          type: 'danger',
          message:
            'An error occurred updating your password, please make sure you have entered your old password correctly',
        });
      }
    }
  }

  const cleanForm = () => {
    oldPasswordInput.current!.reset();
    passwordInput.current!.reset();
    repeatPasswordInput.current!.reset();
  };

  const submitForm = () => {
    setIsSending(true);
    if (form.current) {
      validateForm(form.current).then((validation: FormValidation) => {
        if (validation.isValid) {
          updatePassword(validation.oldPassword!, validation.newPassword!);
        } else {
          setIsSending(false);
        }
      });
    }
  };

  const validateForm = async (form: HTMLFormElement): Promise<FormValidation> => {
    let newPassword: string | null = null;
    let oldPassword: string | null = null;

    return validateAllFields().then((isValid: boolean) => {
      if (isValid) {
        const formData = new FormData(form);
        newPassword = formData.get('password') as string;
        oldPassword = formData.get('oldPassword') as string;
      }

      setIsValidated(true);
      return { isValid, newPassword, oldPassword };
    });
  };

  const validateAllFields = async (): Promise<boolean> => {
    return Promise.all([
      oldPasswordInput.current!.checkIsValid(),
      passwordInput.current!.checkIsValid(),
      repeatPasswordInput.current!.checkIsValid(),
    ]).then((res: boolean[]) => {
      return every(res, (isValid: boolean) => isValid);
    });
  };

  return (
    <form
      data-testid="updatePasswordForm"
      ref={form}
      className={classnames('w-100', { 'needs-validation': !isValidated }, { 'was-validated': isValidated })}
      autoComplete="on"
      noValidate
    >
      <InputField
        ref={oldPasswordInput}
        type="password"
        label="Old password"
        name="oldPassword"
        invalidText={{
          default: 'This field is required',
        }}
        autoComplete="password"
        validateOnBlur
        required
      />

      <InputField
        ref={passwordInput}
        type="password"
        label="New password"
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
        label="Confirm new password"
        labelLegend={<small className="ml-1 font-italic">(Required)</small>}
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

      <div className="mt-4 mb-2">
        <button
          data-testid="updatePasswordBtn"
          className="btn btn-sm btn-secondary"
          type="button"
          disabled={isSending}
          onClick={submitForm}
        >
          {isSending ? (
            <>
              <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true" />
              <span className="ml-2">Changing password</span>
            </>
          ) : (
            <div className="d-flex flex-row align-items-center text-uppercase">
              <FaPencilAlt className="mr-2" />
              <div>Change</div>
            </div>
          )}
        </button>
      </div>
    </form>
  );
};

export default UpdatePassword;
