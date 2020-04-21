import { render } from '@testing-library/react';
import React from 'react';

import Loading from './Loading';

describe('Loading', () => {
  it('creates snapshot', () => {
    const { asFragment } = render(<Loading />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders proper content', () => {
    const { getByRole } = render(<Loading spinnerClassName="test" />);
    expect(getByRole('status')).toBeInTheDocument();
    expect(getByRole('status')).toHaveClass('test');
    expect(getByRole('status')).toHaveTextContent('Loading...');
  });
});
