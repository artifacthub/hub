import isUndefined from 'lodash/isUndefined';
import { ChangeEvent } from 'react';

import styles from './Checkbox.module.css';

interface Props {
  name: string;
  value: string;
  label: string | JSX.Element;
  legend?: string | number;
  checked: boolean;
  disabled?: boolean;
  className?: string;
  labelClassName?: string;
  icon?: JSX.Element;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  device: string;
}

const CheckBox = (props: Props) => {
  const handleOnChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (props.onChange) {
      props.onChange(e);
    }
  };

  const id = `${props.device}-${props.name}-${props.value}`;

  return (
    <div className={`form-check me-sm-2 mb-2 ${props.className}`}>
      <input
        type="checkbox"
        className={`form-check-input ${styles.input}`}
        name={props.name}
        value={props.value}
        id={id}
        onChange={handleOnChange}
        checked={props.checked}
        aria-checked={props.checked}
        disabled={props.disabled}
        tabIndex={0}
      />
      <label
        className={`form-check-label ${styles.label} ${props.labelClassName}`}
        htmlFor={id}
        data-testid="checkboxLabel"
      >
        <div className="d-flex align-items-baseline mw-100">
          {props.icon && <span className={`me-2 position-relative ${styles.icon}`}>{props.icon}</span>}
          <span className="d-inline-block text-truncate">{props.label}</span>
          {!isUndefined(props.legend) && <small className="ps-1">({props.legend})</small>}
        </div>
      </label>
    </div>
  );
};

export default CheckBox;
