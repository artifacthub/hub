import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';

import { API } from '../../api';
import { RefInputField, ResourceKind } from '../../types';
import styles from './InputField.module.css';

export interface Props {
  type: 'text' | 'password' | 'email' | 'url';
  label?: string;
  name: string;
  value?: string;
  validText?: string;
  invalidText?: {
    default: string;
    [key: string]: string;
  };
  placeholder?: string;
  required?: boolean;
  className?: string;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  labelLegend?: JSX.Element;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  validateOnBlur?: boolean;
  checkAvailability?: ResourceKind;
  isValidResource?: ResourceKind;
  autoComplete?: string;
  readOnly?: boolean;
  additionalInfo?: string | JSX.Element;
  setValidationStatus?: (status: boolean) => void;
  autoFocus?: boolean;
}

const InputField = forwardRef((props: Props, ref: React.Ref<RefInputField>) => {
  const input = useRef<HTMLInputElement>(null);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [inputValue, setInputValue] = useState(props.value || '');
  const [invalidText, setInvalidText] = useState(!isUndefined(props.invalidText) ? props.invalidText.default : '');
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [isValidatingResource, setIsValidatingResource] = useState(false);

  useImperativeHandle(ref, () => ({
    checkIsValid(): Promise<boolean> {
      return isValidField();
    },
    reset: () => {
      setInputValue('');
    },
  }));

  const checkValidity = (): boolean => {
    const isValid = input.current!.checkValidity();
    if (!isValid && !isUndefined(props.invalidText)) {
      let errorTxt = props.invalidText.default;
      const validityState: ValidityState | undefined = input.current?.validity;
      if (!isUndefined(validityState)) {
        if (validityState.typeMismatch && !isUndefined(props.invalidText.typeMismatch)) {
          errorTxt = props.invalidText.typeMismatch;
        } else if (validityState.tooShort && !isUndefined(props.invalidText.tooShort)) {
          errorTxt = props.invalidText.tooShort;
        } else if (validityState.patternMismatch && !isUndefined(props.invalidText.patternMismatch)) {
          errorTxt = props.invalidText.patternMismatch;
        } else if (validityState.typeMismatch && !isUndefined(props.invalidText.typeMismatch)) {
          errorTxt = props.invalidText.typeMismatch;
        } else if (validityState.customError && !isUndefined(props.invalidText.customError)) {
          errorTxt = props.invalidText.customError;
        }
      }
      setInvalidText(errorTxt);
    }
    setIsValid(isValid);
    if (!isUndefined(props.setValidationStatus)) {
      props.setValidationStatus(false);
    }
    return isValid;
  };

  const isValidField = async (): Promise<boolean> => {
    const value = input.current!.value;
    if (value !== '') {
      if (!isUndefined(props.isValidResource)) {
        setIsValidatingResource(true);
        await API.checkAvailability({
          resourceKind: props.isValidResource!,
          value: value,
        })
          .then(() => {
            input.current!.setCustomValidity('');
          })
          .catch(() => {
            input.current!.setCustomValidity('Is not a valid resource');
          });
        setIsValidatingResource(false);
      }

      if (!isUndefined(props.checkAvailability)) {
        setIsCheckingAvailability(true);
        await API.checkAvailability({
          resourceKind: props.checkAvailability!,
          value: value,
        })
          .then(() => {
            input.current!.setCustomValidity('Already taken');
          })
          .catch(() => {
            input.current!.setCustomValidity('');
          });
        setIsCheckingAvailability(false);
      }

      if (isUndefined(props.isValidResource) && isUndefined(props.checkAvailability)) {
        input.current!.setCustomValidity('');
      }
    }

    return checkValidity();
  };

  const handleOnBlur = (e: React.FocusEvent<HTMLInputElement>): void => {
    if (!isUndefined(props.validateOnBlur) && props.validateOnBlur) {
      isValidField();
    }
  };

  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setInputValue(e.target.value);
    if (!isUndefined(props.onChange)) {
      props.onChange(e);
    }
  };

  return (
    <div className={`form-group mb-4 position-relative ${props.className}`}>
      {!isUndefined(props.label) && (
        <label htmlFor={props.name}>
          {props.label}
          {!isUndefined(props.labelLegend) && <>{props.labelLegend}</>}
        </label>
      )}

      <input
        data-testid={`${props.name}Input`}
        ref={input}
        type={props.type}
        name={props.name}
        value={inputValue}
        className={classnames('form-control', { 'is-invalid': !isNull(isValid) && !isValid })}
        placeholder={props.placeholder}
        required={props.required}
        minLength={props.minLength}
        maxLength={props.maxLength}
        pattern={props.pattern}
        autoComplete={props.autoComplete}
        readOnly={props.readOnly || false}
        onChange={handleOnChange}
        onBlur={handleOnBlur}
        onKeyDown={props.onKeyDown}
        autoFocus={props.autoFocus}
      />

      {(isCheckingAvailability || isValidatingResource) && (
        <div className={`position-absolute ${styles.spinner}`}>
          <span className="spinner-border spinner-border-sm text-primary" />
        </div>
      )}

      {!isUndefined(props.validText) && (
        <div className={`valid-feedback mt-0 ${styles.inputFeedback}`}>{props.validText}</div>
      )}

      {!isUndefined(invalidText) && (
        <div className={`invalid-feedback mt-0 ${styles.inputFeedback}`}>{invalidText}</div>
      )}

      {!isUndefined(props.additionalInfo) && <div className="alert alert-ligth p-0 mt-3">{props.additionalInfo}</div>}
    </div>
  );
});

export default InputField;
