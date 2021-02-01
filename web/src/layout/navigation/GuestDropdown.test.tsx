import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import GuestDropdown from './GuestDropdown';

describe('GuestDropdown', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(<GuestDropdown />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  it('renders component', () => {
    const { getByTestId } = render(<GuestDropdown />);

    expect(getByTestId('settingsIcon')).toBeInTheDocument();
    expect(getByTestId('guestDropdownBtn')).toBeInTheDocument();
    expect(getByTestId('guestDropdown')).toBeInTheDocument();
  });

  it('displays dropdown', () => {
    const { getByTestId } = render(<GuestDropdown />);

    const dropdown = getByTestId('guestDropdown');
    expect(dropdown).not.toHaveClass('show');
    const btn = getByTestId('guestDropdownBtn');
    fireEvent.click(btn);
    expect(dropdown).toHaveClass('show');
  });
});
