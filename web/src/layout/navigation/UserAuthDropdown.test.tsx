import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter as Router } from 'react-router-dom';

import { AppCtx } from '../../context/AppCtx';
import UserAuthDropdown from './UserAuthDropdown';

const mockCtxLoggedIn = {
  user: { alias: 'test', email: 'test@test.com', passwordSet: true },
  prefs: {
    controlPanel: {},
    search: { limit: 60 },
    theme: {
      configured: 'light',
      effective: 'light',
    },
    notifications: {
      lastDisplayedTime: null,
      enabled: true,
      displayed: [],
    },
  },
};

describe('UserAuthDropdown', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(
      <AppCtx.Provider value={{ ctx: mockCtxLoggedIn, dispatch: jest.fn() }}>
        <Router>
          <UserAuthDropdown />
        </Router>
      </AppCtx.Provider>
    );

    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(
        <AppCtx.Provider value={{ ctx: mockCtxLoggedIn, dispatch: jest.fn() }}>
          <Router>
            <UserAuthDropdown />
          </Router>
        </AppCtx.Provider>
      );

      const signedAs = screen.getByText(/Signed in as/i);
      expect(signedAs).toBeInTheDocument();
      expect(signedAs).toHaveTextContent('Signed in as test');

      expect(screen.getByTestId('profileIcon')).toBeInTheDocument();
      expect(screen.queryByAltText('User profile')).toBeNull();
      expect(screen.getByText('Starred packages')).toBeInTheDocument();
      expect(screen.getByText('Control Panel')).toBeInTheDocument();
      expect(screen.getByTestId('themeOptions')).toBeInTheDocument();
      expect(screen.getByText('Sign out')).toBeInTheDocument();
    });

    it('renders component with user image', () => {
      render(
        <AppCtx.Provider
          value={{
            ctx: { ...mockCtxLoggedIn, user: { ...mockCtxLoggedIn.user, profileImageId: '123' } },
            dispatch: jest.fn(),
          }}
        >
          <Router>
            <UserAuthDropdown />
          </Router>
        </AppCtx.Provider>
      );

      const signedAs = screen.getByText(/Signed in as/i);
      expect(signedAs).toBeInTheDocument();
      expect(signedAs).toHaveTextContent('Signed in as test');

      expect(screen.getByAltText('User profile')).toBeInTheDocument();
      expect(screen.queryByTestId('profileIcon')).toBeNull();
      expect(screen.getByText('Starred packages')).toBeInTheDocument();
      expect(screen.getByText('Control Panel')).toBeInTheDocument();
      expect(screen.getByTestId('themeOptions')).toBeInTheDocument();
      expect(screen.getByText('Sign out')).toBeInTheDocument();
    });

    it('loads starred packages page', async () => {
      render(
        <AppCtx.Provider value={{ ctx: mockCtxLoggedIn, dispatch: jest.fn() }}>
          <Router>
            <UserAuthDropdown />
          </Router>
        </AppCtx.Provider>
      );

      const link = screen.getByRole('link', { name: 'Starred packages' });
      expect(link).toBeInTheDocument();
      await userEvent.click(link);
      expect(window.location.pathname).toBe('/packages/starred');
    });

    it('loads control panel page', async () => {
      render(
        <AppCtx.Provider value={{ ctx: mockCtxLoggedIn, dispatch: jest.fn() }}>
          <Router>
            <UserAuthDropdown />
          </Router>
        </AppCtx.Provider>
      );

      const link = screen.getByRole('link', { name: 'Control Panel' });
      expect(link).toBeInTheDocument();
      await userEvent.click(link);
      expect(window.location.pathname).toBe('/control-panel');
    });
  });
});
