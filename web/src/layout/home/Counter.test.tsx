import { render, screen } from '@testing-library/react';

import Counter from './Counter';

const defaultProps = {
  name: 'name',
  isLoading: false,
  value: 12,
};

describe('Counter', () => {
  it('renders correctly', () => {
    const { asFragment } = render(<Counter {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders proper content', () => {
    render(<Counter {...defaultProps} />);
    expect(screen.getByText(defaultProps.value!.toString())).toBeInTheDocument();
    expect(screen.getByText(defaultProps.name)).toBeInTheDocument();
  });

  it('renders loading', () => {
    render(<Counter {...defaultProps} isLoading />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(defaultProps.name)).toBeInTheDocument();
  });

  it('renders placeholder if value is 0 or null', () => {
    render(<Counter {...defaultProps} value={0} />);
    expect(screen.getByText('-')).toBeInTheDocument();
  });
});
