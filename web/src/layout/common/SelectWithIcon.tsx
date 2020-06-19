import { isNull, isUndefined } from 'lodash';
import React from 'react';
import Select, { components, ValueType } from 'react-select';

import { OptionWithIcon } from '../../types';
import styles from './SelectWithIcon.module.css';

interface Props {
  label: string;
  options: OptionWithIcon[];
  selected?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
}

const { Option } = components;
const CustomSelectOption = (props: any) => (
  <Option {...props}>
    <CustomSelectValue {...props} />
  </Option>
);

const CustomSelectValue = (props: any) => (
  <div className={`d-flex flex-row align-items-center ${styles.option}`}>
    <span className="mr-2">{props.data.icon}</span>
    <div>{props.data.label}</div>
  </div>
);

const SelectWithIcon = (props: Props) => {
  const handleOnChange = (selectedOption: ValueType<OptionWithIcon>) => {
    if (!isNull(selectedOption) && !isUndefined(selectedOption)) {
      const value = (selectedOption as OptionWithIcon).value;
      props.onChange(value);
    }
  };

  const getSelectedValue = (): OptionWithIcon | undefined => {
    if (!isUndefined(props.selected)) {
      const selected = props.options.find((opt: OptionWithIcon) => props.selected === opt.value);
      return selected;
    }
    return props.options[0];
  };

  const selectedOption = getSelectedValue();

  if (isUndefined(selectedOption)) return null;

  return (
    <div className="mb-4">
      <label className={`font-weight-bold ${styles.label}`} htmlFor="description">
        {props.label}
      </label>
      <Select
        options={props.options}
        components={{ Option: CustomSelectOption, SingleValue: CustomSelectValue }}
        value={selectedOption}
        onChange={handleOnChange}
        isDisabled={props.disabled}
        required={props.required}
      />
    </div>
  );
};

export default SelectWithIcon;
