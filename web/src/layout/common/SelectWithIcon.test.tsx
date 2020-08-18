import { render } from '@testing-library/react';
import React from 'react';

import SelectWithIcon from './SelectWithIcon';

const mockOnChange = jest.fn();

const defaultProps = {
  options: [
    {
      value: 'test',
      label: 'Test',
      icon: <div data-testid="icon">icon</div>,
    },
    {
      value: 'test1',
      label: 'Test 1',
      icon: <div data-testid="icon">icon</div>,
    },
    {
      value: 'test2',
      label: 'Test 2',
      icon: <div data-testid="icon">icon</div>,
    },
  ],
  label: 'Select test',
  onChange: mockOnChange,
};

describe('SelectWithIcon', () => {
  it('creates snapshot', () => {
    const { asFragment } = render(<SelectWithIcon {...defaultProps} />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders proper content', () => {
    const { getByText } = render(<SelectWithIcon {...defaultProps} />);

    expect(getByText('Select test')).toBeInTheDocument();
    expect(getByText('Test')).toBeInTheDocument();
  });
});
