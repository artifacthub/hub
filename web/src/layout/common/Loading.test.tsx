import { render, screen } from '@testing-library/react';

import Loading from './Loading';

describe('Loading', () => {
  it('creates snapshot', () => {
    const { asFragment } = render(<Loading />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders proper content', () => {
    render(<Loading spinnerClassName="test" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveClass('test');
    expect(screen.getByRole('status')).toHaveTextContent('Loading...');
  });
});
