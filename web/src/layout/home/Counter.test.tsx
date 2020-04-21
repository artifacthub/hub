import { render } from '@testing-library/react';
import React from 'react';

import Counter from './Counter';

const defaultProps = {
  name: 'name',
  isLoading: false,
  value: 12,
};

describe('Counter', () => {
  it('renders correctly', () => {
    const { asFragment } = render(<Counter {...defaultProps} />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders proper content', () => {
    const { getByText } = render(<Counter {...defaultProps} />);
    expect(getByText(defaultProps.value!.toString())).toBeInTheDocument();
    expect(getByText(defaultProps.name)).toBeInTheDocument();
  });

  it('renders loading', () => {
    const { getByRole, getByText } = render(<Counter {...defaultProps} isLoading />);
    expect(getByRole('status')).toBeInTheDocument();
    expect(getByText(defaultProps.name)).toBeInTheDocument();
  });

  it('renders placeholder if value is 0 or null', () => {
    const { getByText } = render(<Counter {...defaultProps} value={0} />);
    expect(getByText('-')).toBeInTheDocument();
  });
});
