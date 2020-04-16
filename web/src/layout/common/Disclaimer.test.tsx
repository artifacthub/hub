import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import Disclaimer from './Disclaimer';

describe('Disclaimer', () => {
  it('renders correctly', () => {
    const { asFragment } = render(<Disclaimer />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders proper content', () => {
    const { getByRole } = render(<Disclaimer />);
    expect(getByRole('alert')).toHaveTextContent('This is pre-alpha software and not for production use×');
  });

  it('hides disclaimer to click close button', () => {
    const { getByTestId, getByRole } = render(<Disclaimer />);
    const btn = getByTestId('disclaimerCloseBtn');
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(getByRole('alert')).toHaveClass('d-none');
  });
});
