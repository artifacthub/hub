import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';

import { AppCtx } from '../../context/AppCtx';
import UserAuthDropdown from './UserAuthDropdown';

const mockCtxLoggedIn = {
  user: { alias: 'test', email: 'test@test.com' },
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
    const result = render(
      <AppCtx.Provider value={{ ctx: mockCtxLoggedIn, dispatch: jest.fn() }}>
        <Router>
          <UserAuthDropdown />
        </Router>
      </AppCtx.Provider>
    );

    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText, getByTestId, queryByAltText } = render(
        <AppCtx.Provider value={{ ctx: mockCtxLoggedIn, dispatch: jest.fn() }}>
          <Router>
            <UserAuthDropdown />
          </Router>
        </AppCtx.Provider>
      );

      const signedAs = getByText(/Signed in as/i);
      expect(signedAs).toBeInTheDocument();
      expect(signedAs).toHaveTextContent('Signed in as test');

      expect(getByTestId('profileIcon')).toBeInTheDocument();
      expect(queryByAltText('User profile')).toBeNull();
      expect(getByText('Starred packages')).toBeInTheDocument();
      expect(getByText('Control Panel')).toBeInTheDocument();
      expect(getByTestId('themeOptions')).toBeInTheDocument();
      expect(getByText('Sign out')).toBeInTheDocument();
    });

    it('renders component with user image', () => {
      const { getByText, getByAltText, queryByTestId, getByTestId } = render(
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

      const signedAs = getByText(/Signed in as/i);
      expect(signedAs).toBeInTheDocument();
      expect(signedAs).toHaveTextContent('Signed in as test');

      expect(getByAltText('User profile')).toBeInTheDocument();
      expect(queryByTestId('profileIcon')).toBeNull();
      expect(getByText('Starred packages')).toBeInTheDocument();
      expect(getByText('Control Panel')).toBeInTheDocument();
      expect(getByTestId('themeOptions')).toBeInTheDocument();
      expect(getByText('Sign out')).toBeInTheDocument();
    });

    it('loads starred packages page', () => {
      const { getByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockCtxLoggedIn, dispatch: jest.fn() }}>
          <Router>
            <UserAuthDropdown />
          </Router>
        </AppCtx.Provider>
      );

      const link = getByTestId('starredPackagesLink');
      expect(link).toBeInTheDocument();
      fireEvent.click(link);
      expect(window.location.pathname).toBe('/packages/starred');
    });

    it('loads control panel page', () => {
      const { getByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockCtxLoggedIn, dispatch: jest.fn() }}>
          <Router>
            <UserAuthDropdown />
          </Router>
        </AppCtx.Provider>
      );

      const link = getByTestId('controlPanelLink');
      expect(link).toBeInTheDocument();
      fireEvent.click(link);
      expect(window.location.pathname).toBe('/control-panel');
    });
  });
});
