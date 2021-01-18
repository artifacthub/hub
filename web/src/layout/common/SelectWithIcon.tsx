import classnames from 'classnames';
import { isUndefined } from 'lodash';
import React, { useCallback } from 'react';
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
  const { onChange } = props;

  const handleOnChange = useCallback(
    (selectedOption: ValueType<OptionWithIcon, false>) => {
      if (selectedOption) {
        const value = (selectedOption as OptionWithIcon).value;
        onChange(value);
      }
    },
    [onChange]
  );

  const getSelectedValue = (): OptionWithIcon | undefined => {
    if (props.selected) {
      const selected = props.options.find((opt: OptionWithIcon) => props.selected === opt.value);
      return selected;
    }
    return props.options[0];
  };

  const selectedOption = getSelectedValue();

  const customStyles = {
    control: (provided: any, state: any) => ({
      ...provided,
      border: '1px solid #ced4da',
      background: state.isDisabled ? 'var(--light-gray)' : 'var(--white)',
      opacity: state.isDisabled ? '0.75' : '1',
      boxShadow: 'none',
      '&:hover': {
        border: '1px solid #bed6e3',
      },
      '&:active': {
        border: '1px solid #bed6e3',
      },
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isSelected ? 'var(--color-2-500)' : null,
      color: state.isSelected ? 'var(--color-font)' : 'var(--color-font)',
      '&:hover': {
        backgroundColor: state.isSelected ? 'var(--color-2-500)' : 'var(--color-black-5)',
      },
    }),
    menu: (provided: any) => ({
      ...provided,
      backgroundColor: 'var(--white)',
    }),
  };

  if (isUndefined(selectedOption)) return null;

  return (
    <div className={classnames('mb-4', { [styles.isDisabled]: props.disabled })}>
      <label className={`font-weight-bold ${styles.label}`} htmlFor="description">
        {props.label}
      </label>
      <Select
        styles={customStyles}
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

export default React.memo(SelectWithIcon);
