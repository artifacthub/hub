import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import Checkbox from './Checkbox';

const onChangeMock = jest.fn();

const defaultProps = {
  name: 'checkbox',
  value: 'val',
  label: 'label',
  checked: false,
  onChange: onChangeMock,
};

describe('Checkbox', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<Checkbox {...defaultProps} />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders input and label', () => {
    const { getByTestId, getByLabelText } = render(<Checkbox {...defaultProps} />);
    const checkbox: HTMLInputElement = getByTestId('checkbox') as HTMLInputElement;
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
    expect(getByLabelText(defaultProps.label)).toBeInTheDocument();
  });

  it('renders checked input with legend', () => {
    const props = {
      ...defaultProps,
      legend: 1,
      checked: true,
    };
    const { getByTestId } = render(<Checkbox {...props} />);
    const checkbox: HTMLInputElement = getByTestId('checkbox') as HTMLInputElement;
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toBeChecked();
    const label = getByTestId('checkboxLabel');
    expect(label).toBeInTheDocument();
    expect(label).toHaveTextContent(`${props.label}(${props.legend})`);
  });

  it('calls onChange to click checkbox label', () => {
    const { getByTestId } = render(<Checkbox {...defaultProps} />);
    const label = getByTestId('checkboxLabel');
    fireEvent.click(label);
    expect(onChangeMock).toHaveBeenCalledTimes(1);
  });
});
