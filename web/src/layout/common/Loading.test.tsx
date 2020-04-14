import { render } from '@testing-library/react';
import React from 'react';

import Loading from './Loading';

describe('Loading', () => {
  it('renders correctly', () => {
    const { asFragment } = render(<Loading />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders proper content', () => {
    const { getByRole } = render(<Loading spinnerClassName="test" />);
    expect(getByRole('status')).toBeInTheDocument();
    expect(getByRole('status')).toHaveClass('test');
    expect(getByRole('status').textContent).toBe('Loading...');
  });
});
