import React, { useState, useRef } from 'react';
import classnames from 'classnames';
import isUndefined from 'lodash/isUndefined';
import isNull from 'lodash/isNull';
import { API } from '../../api';
import { ResourceKind } from '../../types';
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
  autoComplete?: string;
  readOnly?: boolean;
  additionalInfo?: string | JSX.Element;
}

const InputField = (props: Props) => {
  const input = useRef<HTMLInputElement>(null);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [inputValue, setInputValue] = useState(props.value || '');
  const [invalidText, setInvalidText] = useState(!isUndefined(props.invalidText) ? props.invalidText.default : '');
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);

  const checkAvailability = (value: string): void  => {
    async function checkAvailability() {
      try {
        setIsCheckingAvailability(true);
        await API.checkAvailability({
          resourceKind: props.checkAvailability!,
          value: value,
        });
        input.current!.setCustomValidity('Already taken');
      } catch {
        input.current!.setCustomValidity('');
      } finally {
        checkValidity();
        setIsCheckingAvailability(false);
      }
    }
    if (value !== '') {
      input.current!.setCustomValidity('');
      checkAvailability();
    } else {
      checkValidity();
    }
  }

  const checkValidity = () => {
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
  }

  const handleOnBlur = (e: React.FocusEvent<HTMLInputElement>): void => {
    if (!isUndefined(props.validateOnBlur) && props.validateOnBlur) {
      if (isUndefined(props.checkAvailability)) {
        checkValidity();
      } else {
        checkAvailability(e.target.value);
      }
    }
  }

  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setInputValue(e.target.value);
    if (!isUndefined(props.onChange)) {
      props.onChange(e);
    }
  }

  return (
    <div className={`form-group mb-4 position-relative ${props.className}`}>
      {!isUndefined(props.label) && (
        <label htmlFor={props.name}>
          {props.label}
          {!isUndefined(props.labelLegend) && (
            <>{props.labelLegend}</>
          )}
        </label>
      )}

      <input
        ref={input}
        type={props.type}
        name={props.name}
        value={inputValue}
        className={classnames(
          'form-control',
          {'is-invalid': !isNull(isValid) && !isValid},
        )}
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
      />

      {isCheckingAvailability && (
        <div className={`position-absolute ${styles.spinner}`}>
          <span className="spinner-border spinner-border-sm text-primary" />
        </div>
      )}

      {!isUndefined(props.validText) && (
        <div className="valid-feedback position-absolute mt-0">
          {props.validText}
        </div>
      )}

      {!isUndefined(invalidText) && (
        <div className="invalid-feedback position-absolute mt-0">
          {invalidText}
        </div>
      )}

      {!isUndefined(props.additionalInfo) && (
        <div className="alert alert-ligth p-0 mt-3">
          {props.additionalInfo}
        </div>
      )}
    </div>
  );
}

export default InputField;
