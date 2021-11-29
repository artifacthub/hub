import { render, screen } from '@testing-library/react';

import Loading from './Loading';

describe('Loading', () => {
  it('creates snapshot', () => {
    const { asFragment } = render(<Loading />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders loading', () => {
    render(<Loading />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders loading with specific size', () => {
    render(<Loading size="lg" />);
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('size-lg');
  });
});
