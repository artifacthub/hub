import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import GuestDropdown from './GuestDropdown';

describe('GuestDropdown', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<GuestDropdown />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders component', () => {
    render(<GuestDropdown />);

    expect(screen.getByTestId('settingsIcon')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guest dropdown button' })).toBeInTheDocument();
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('displays dropdown', async () => {
    render(<GuestDropdown />);

    expect(screen.getByRole('menu')).not.toHaveClass('show');
    const btn = screen.getByRole('button', { name: 'Guest dropdown button' });
    await userEvent.click(btn);
    expect(await screen.findByRole('menu')).toHaveClass('show');
  });
});
