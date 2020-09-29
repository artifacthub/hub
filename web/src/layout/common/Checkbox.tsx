import isUndefined from 'lodash/isUndefined';
import React, { ChangeEvent } from 'react';

import styles from './Checkbox.module.css';

interface Props {
  name: string;
  value: string;
  label: string | JSX.Element;
  legend?: string | number;
  checked: boolean;
  disabled?: boolean;
  className?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
}

const CheckBox = (props: Props) => {
  const handleOnChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (props.onChange) {
      props.onChange(e);
    }
  };

  const id = `${props.name}-${props.value}`;

  return (
    <div className={`custom-control custom-checkbox mr-sm-2 mb-2 ${props.className}`}>
      <input
        data-testid="checkbox"
        type="checkbox"
        className={`custom-control-input ${styles.input}`}
        name={props.name}
        value={props.value}
        id={id}
        onChange={handleOnChange}
        checked={props.checked}
        disabled={props.disabled}
      />
      <label className={`custom-control-label w-100 ${styles.label}`} htmlFor={id} data-testid="checkboxLabel">
        <div className="d-flex align-items-baseline mw-100">
          <span className="d-inline-block text-truncate">{props.label}</span>
          {!isUndefined(props.legend) && <small className="pl-1">({props.legend})</small>}
        </div>
      </label>
    </div>
  );
};

export default CheckBox;
