import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';

import { AppCtx } from '../../context/AppCtx';
import MobileSettings from './MobileSettings';

const setOpenSignUpMock = jest.fn();
const setOpenLogInMock = jest.fn();

const defaultProps = {
  setOpenSignUp: setOpenSignUpMock,
  setOpenLogIn: setOpenLogInMock,
  privateRoute: false,
};

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

const mockCtxNotLoggedIn = {
  user: null,
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

const mockUndefinedUser = {
  user: undefined,
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

describe('MobileSettings', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(
      <AppCtx.Provider value={{ ctx: mockCtxLoggedIn, dispatch: jest.fn() }}>
        <Router>
          <MobileSettings {...defaultProps} />
        </Router>
      </AppCtx.Provider>
    );

    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('when user is signed in', () => {
    it('renders component', () => {
      const { getByText, queryByAltText, getByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockCtxLoggedIn, dispatch: jest.fn() }}>
          <Router>
            <MobileSettings {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      const signedText = getByText(/Signed in as/i);
      expect(signedText).toBeInTheDocument();
      expect(signedText).toHaveTextContent('Signed in as test');
      expect(queryByAltText('User profile')).toBeNull();

      expect(getByText('Starred packages')).toBeInTheDocument();
      expect(getByText('Control Panel')).toBeInTheDocument();
      expect(getByTestId('themeOptions')).toBeInTheDocument();
      expect(getByText('Sign out')).toBeInTheDocument();
    });

    it('renders profile Image', () => {
      const { getByText, getByAltText, getByTestId } = render(
        <AppCtx.Provider
          value={{
            ctx: { ...mockCtxLoggedIn, user: { ...mockCtxLoggedIn.user, profileImageId: '123' } },
            dispatch: jest.fn(),
          }}
        >
          <Router>
            <MobileSettings {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      const signedText = getByText(/Signed in as/i);
      expect(signedText).toBeInTheDocument();
      expect(signedText).toHaveTextContent('Signed in as test');

      expect(getByAltText('User profile')).toBeInTheDocument();
      expect(getByText('Starred packages')).toBeInTheDocument();
      expect(getByText('Control Panel')).toBeInTheDocument();
      expect(getByTestId('themeOptions')).toBeInTheDocument();
      expect(getByText('Sign out')).toBeInTheDocument();
    });

    it('loads starred packages page', () => {
      const { getByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockCtxLoggedIn, dispatch: jest.fn() }}>
          <Router>
            <MobileSettings {...defaultProps} />
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
            <MobileSettings {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      const link = getByTestId('controlPanelLink');
      expect(link).toBeInTheDocument();
      fireEvent.click(link);
      expect(window.location.pathname).toBe('/control-panel');
    });
  });

  describe('when user is not signed in', () => {
    it('renders component', () => {
      const { getByText } = render(
        <AppCtx.Provider value={{ ctx: mockCtxNotLoggedIn, dispatch: jest.fn() }}>
          <Router>
            <MobileSettings {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      expect(getByText('Sign in')).toBeInTheDocument();
      expect(getByText('Sign up')).toBeInTheDocument();
    });

    it('calls open Sign in modal to click Sign in button', () => {
      const { getByText } = render(
        <AppCtx.Provider value={{ ctx: mockCtxNotLoggedIn, dispatch: jest.fn() }}>
          <Router>
            <MobileSettings {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      const btn = getByText('Sign in');
      fireEvent.click(btn);
      expect(setOpenLogInMock).toHaveBeenCalledTimes(1);
    });

    it('calls open Sign up modal to click Sign up button', () => {
      const { getByText } = render(
        <AppCtx.Provider value={{ ctx: mockCtxNotLoggedIn, dispatch: jest.fn() }}>
          <Router>
            <MobileSettings {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      const btn = getByText('Sign up');
      fireEvent.click(btn);
      expect(setOpenSignUpMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('when we are checking if user is or not signed in', () => {
    it('renders spinning', () => {
      const { getByRole } = render(
        <AppCtx.Provider value={{ ctx: mockUndefinedUser, dispatch: jest.fn() }}>
          <Router>
            <MobileSettings {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      expect(getByRole('status')).toBeInTheDocument();
    });
  });
});
