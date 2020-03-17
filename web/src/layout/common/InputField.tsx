import React, { useState, useRef } from 'react';
import classnames from 'classnames';
import isUndefined from 'lodash/isUndefined';
import isNull from 'lodash/isNull';
import { API } from '../../api';
import { ResourceKind } from '../../types';

interface Availability {
  status: boolean;
  errorTxt?: string;
}

export interface Props {
  type: 'text' | 'password' | 'email' | 'url';
  label?: string;
  name: string;
  value?: string;
  validText?: string;
  invalidText?: string;
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
}

const InputField = (props: Props) => {
  const input = useRef<HTMLInputElement>(null);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [inputValue, setInputValue] = useState(props.value || '');
  const [invalidText, setInvalidText] = useState(props.invalidText);

  const checkAvailability = (value: string): void  => {
    async function checkAvailability() {
      try {
        await API.checkAvailability({
          resourceKind: props.checkAvailability!,
          value: value,
        });
        setIsValid(false);
        setInvalidText('Not available');
        input.current!.setCustomValidity('Not available');
      } catch {
        setIsValid(true);
        input.current!.setCustomValidity('');
      } finally {
        setIsValid(input.current!.checkValidity());
      }
    }
    if (value !== '') {
      checkAvailability();
    } else {
      setInvalidText(props.invalidText);
      setIsValid(input.current!.checkValidity());
    }
  }

  const handleOnBlur = (e: React.FocusEvent<HTMLInputElement>): void => {
    if (!isUndefined(props.validateOnBlur) && props.validateOnBlur) {
      if (isUndefined(props.checkAvailability)) {
        setIsValid(e.currentTarget.checkValidity());
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
    </div>
  );
}

export default InputField;
