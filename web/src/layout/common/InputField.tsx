import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { ChangeEvent, forwardRef, KeyboardEvent, Ref, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

import API from '../../api';
import { AvailabilityInfo, RefInputField } from '../../types';
import capitalizeFirstLetter from '../../utils/capitalizeFirstLetter';
import styles from './InputField.module.css';
import Loading from './Loading';

export interface Props {
  type: 'text' | 'password' | 'email' | 'url' | 'number';
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
  inputClassName?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  labelLegend?: JSX.Element;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
  checkAvailability?: AvailabilityInfo;
  checkPasswordStrength?: boolean;
  autoComplete?: string;
  readOnly?: boolean;
  additionalInfo?: string | JSX.Element;
  setValidationStatus?: (status: boolean) => void;
  autoFocus?: boolean;
  disabled?: boolean;
  visiblePassword?: boolean;
  excludedValues?: string[];
  smallBottomMargin?: boolean;
  onBlur?: (e: ChangeEvent<HTMLInputElement>) => void;
}

const VALIDATION_DELAY = 3 * 100; // 300ms

const InputField = forwardRef((props: Props, ref: Ref<RefInputField>) => {
  const input = useRef<HTMLInputElement>(null);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [inputValue, setInputValue] = useState(props.value || '');
  const [invalidText, setInvalidText] = useState(!isUndefined(props.invalidText) ? props.invalidText.default : '');
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [isCheckingPwdStrength, setIsCheckingPwdStrength] = useState(false);
  const [pwdStrengthError, setPwdStrengthError] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string>(props.type);
  const [validateTimeout, setValidateTimeout] = useState<NodeJS.Timeout | null>(null);

  useImperativeHandle(ref, () => ({
    checkIsValid(): Promise<boolean> {
      return isValidField();
    },
    reset: () => {
      setInputValue('');
    },
    getValue(): string {
      return inputValue;
    },
    checkValidity(): boolean {
      return input.current ? input.current!.checkValidity() : true;
    },
    updateValue(newValue: string): void {
      setInputValue(newValue);
    },
  }));

  const checkValidity = (): boolean => {
    let isInputValid = true;
    if (input.current) {
      isInputValid = input.current!.checkValidity();
      if (!isInputValid && !isUndefined(props.invalidText)) {
        let errorTxt = props.invalidText.default;
        const validityState: ValidityState | undefined = input.current.validity;
        if (!isUndefined(validityState)) {
          if (validityState.typeMismatch && !isUndefined(props.invalidText.typeMismatch)) {
            errorTxt = props.invalidText.typeMismatch;
          } else if (validityState.tooShort && !isUndefined(props.invalidText.tooShort)) {
            errorTxt = props.invalidText.tooShort;
          } else if (validityState.patternMismatch && !isUndefined(props.invalidText.patternMismatch)) {
            errorTxt = props.invalidText.patternMismatch;
          } else if (validityState.rangeUnderflow && !isUndefined(props.invalidText.rangeUnderflow)) {
            errorTxt = props.invalidText.rangeUnderflow;
          } else if (validityState.rangeOverflow && !isUndefined(props.invalidText.rangeOverflow)) {
            errorTxt = props.invalidText.rangeOverflow;
          } else if (validityState.customError && !isUndefined(props.invalidText.customError)) {
            if (!isUndefined(props.excludedValues) && props.excludedValues.includes(input.current.value)) {
              errorTxt = props.invalidText.excluded;
            } else {
              errorTxt = props.invalidText.customError;
            }
          }
        }
        setInvalidText(errorTxt);
      }
      setIsValid(isInputValid);
      if (!isUndefined(props.setValidationStatus)) {
        props.setValidationStatus(false);
      }
    }
    return isInputValid;
  };

  const isValidField = async (): Promise<boolean> => {
    if (input.current) {
      const value = input.current!.value;
      if (value !== '') {
        if (!isUndefined(props.excludedValues) && props.excludedValues.includes(value)) {
          input.current!.setCustomValidity('Value is excluded');
        } else if (!isUndefined(props.checkAvailability) && !props.checkAvailability.excluded.includes(value)) {
          setIsCheckingAvailability(true);
          try {
            const isAvailable = await API.checkAvailability({
              resourceKind: props.checkAvailability.resourceKind,
              value: value,
            });
            if (!isNull(input.current)) {
              if (isAvailable) {
                input.current!.setCustomValidity(props.checkAvailability!.isAvailable ? 'Already taken' : '');
              } else {
                input.current!.setCustomValidity(props.checkAvailability!.isAvailable ? '' : 'Resource is not valid');
              }
            }
          } catch {
            if (!isNull(input.current)) {
              input.current!.setCustomValidity(props.checkAvailability!.isAvailable ? 'Already taken' : '');
            }
          }
          setIsCheckingAvailability(false);
        } else if (props.checkPasswordStrength) {
          setIsCheckingPwdStrength(true);
          try {
            await API.checkPasswordStrength(value);
            if (!isNull(input.current)) {
              input.current!.setCustomValidity('');
              setPwdStrengthError(null);
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } catch (e: any) {
            if (!isNull(input.current) && e.message) {
              setPwdStrengthError(e.message);
              input.current!.setCustomValidity(e.message);
            }
          }
          setIsCheckingPwdStrength(false);
        } else {
          if (!isNull(input.current)) {
            input.current!.setCustomValidity('');
          }
        }
      }
    }
    return checkValidity();
  };

  const handleOnBlur = (e: ChangeEvent<HTMLInputElement>): void => {
    if (!isUndefined(props.onBlur)) {
      props.onBlur(e);
    }
    if (!isUndefined(props.validateOnBlur) && props.validateOnBlur && input.current) {
      cleanTimeout(); // On blur we clean timeout if it's necessary
      isValidField();
    }
  };

  const handleOnChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setInputValue(e.target.value);
    if (!isUndefined(props.onChange)) {
      props.onChange(e);
    }
  };

  const cleanTimeout = () => {
    if (!isNull(validateTimeout)) {
      clearTimeout(validateTimeout);
      setValidateTimeout(null);
    }
  };

  useEffect(() => {
    const isInputFocused = input.current === document.activeElement;
    if (isInputFocused && !isUndefined(props.validateOnChange) && props.validateOnChange) {
      cleanTimeout();
      setValidateTimeout(
        setTimeout(() => {
          isValidField();
        }, VALIDATION_DELAY)
      );
    }

    return () => {
      if (validateTimeout) {
        clearTimeout(validateTimeout);
      }
    };
  }, [inputValue]);

  return (
    <div className={`${props.smallBottomMargin ? 'mb-3' : 'mb-4'} position-relative ${props.className}`}>
      {!isUndefined(props.label) && (
        <label htmlFor={props.name} className={`form-label fw-bold ${styles.label}`}>
          <span className="fw-bold">{props.label}</span>
          {!isUndefined(props.labelLegend) && <>{props.labelLegend}</>}
        </label>
      )}

      <input
        data-testid={`${props.name}Input`}
        ref={input}
        type={activeType}
        id={props.name}
        name={props.name}
        value={inputValue}
        className={classnames('form-control', props.inputClassName, { 'is-invalid': !isNull(isValid) && !isValid })}
        placeholder={props.placeholder}
        required={props.required}
        minLength={props.minLength}
        maxLength={props.maxLength}
        min={props.min}
        max={props.max}
        pattern={props.pattern}
        autoComplete={props.autoComplete}
        readOnly={props.readOnly || false}
        onChange={handleOnChange}
        onBlur={handleOnBlur}
        onKeyDown={props.onKeyDown}
        autoFocus={props.autoFocus}
        disabled={props.disabled}
        spellCheck="false"
      />

      {props.type === 'password' && props.visiblePassword && (
        <button
          type="button"
          className={classnames('btn btn-link position-absolute bottom-0', styles.revealBtn, {
            'text-muted': activeType === 'password',
            'text-secondary': activeType !== 'password',
          })}
          onClick={() => setActiveType(activeType === 'password' ? 'text' : 'password')}
          aria-label={`${activeType === 'password' ? 'Hide' : 'Show'} password`}
        >
          {activeType === 'password' ? <FaEyeSlash /> : <FaEye />}
        </button>
      )}

      {(isCheckingAvailability || isCheckingPwdStrength) && (
        <div className={`position-absolute ${styles.spinner}`}>
          <Loading noWrapper smallSize />
        </div>
      )}

      {!isUndefined(props.validText) && (
        <div className={`valid-feedback mt-0 ${styles.inputFeedback}`}>{props.validText}</div>
      )}

      {!isUndefined(invalidText) && isNull(pwdStrengthError) && (
        <div className={`invalid-feedback mt-0 ${styles.inputFeedback}`}>{invalidText}</div>
      )}

      {!isNull(pwdStrengthError) && (
        <div className={`invalid-feedback mt-0 ${styles.inputPwdStrengthError}`}>
          {capitalizeFirstLetter(pwdStrengthError)}
        </div>
      )}

      {!isUndefined(props.additionalInfo) && <div className="alert p-0 mt-4">{props.additionalInfo}</div>}
    </div>
  );
});

export default InputField;
