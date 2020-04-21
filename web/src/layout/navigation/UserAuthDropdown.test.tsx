import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';

import { AppCtx } from '../../context/AppCtx';
import UserAuthDropdown from './UserAuthDropdown';

const mockCtxLoggedIn = {
  user: { alias: 'test', email: 'test@test.com' },
  org: null,
  requestSignIn: false,
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
      const { getByText } = render(
        <AppCtx.Provider value={{ ctx: mockCtxLoggedIn, dispatch: jest.fn() }}>
          <Router>
            <UserAuthDropdown />
          </Router>
        </AppCtx.Provider>
      );

      const signedAs = getByText(/Signed in as/i);
      expect(signedAs).toBeInTheDocument();
      expect(signedAs).toHaveTextContent('Signed in as test');

      expect(getByText('Starred packages')).toBeInTheDocument();
      expect(getByText('Control Panel')).toBeInTheDocument();
      expect(getByText('Sign out')).toBeInTheDocument();
    });

    it('renders component', () => {
      const { getByText } = render(
        <AppCtx.Provider value={{ ctx: mockCtxLoggedIn, dispatch: jest.fn() }}>
          <Router>
            <UserAuthDropdown />
          </Router>
        </AppCtx.Provider>
      );

      const signedAs = getByText(/Signed in as/i);
      expect(signedAs).toBeInTheDocument();
      expect(signedAs).toHaveTextContent('Signed in as test');

      expect(getByText('Starred packages')).toBeInTheDocument();
      expect(getByText('Control Panel')).toBeInTheDocument();
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
      expect(window.location.pathname).toBe('/user/packages/starred');
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
