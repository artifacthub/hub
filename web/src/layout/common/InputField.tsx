import React, { useState } from 'react';
import classnames from 'classnames';
import isUndefined from 'lodash/isUndefined';
import isNull from 'lodash/isNull';

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
  autoComplete?: string;
  readOnly?: boolean;
}

const InputField = (props: Props) => {
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [inputValue, setInputValue] = useState(props.value || '');

  const handleOnBlur = (e: React.FocusEvent<HTMLInputElement>): void => {
    if (!isUndefined(props.validateOnBlur) && props.validateOnBlur) {
      setIsValid(e.currentTarget.checkValidity());
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

      {!isUndefined(props.invalidText) && (
        <div className="invalid-feedback position-absolute mt-0">
          {props.invalidText}
        </div>
      )}
    </div>
  );
}

export default InputField;
