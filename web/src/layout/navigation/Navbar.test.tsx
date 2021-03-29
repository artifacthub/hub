import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';

import { AppCtx } from '../../context/AppCtx';
import Navbar from './Navbar';
jest.mock('./MobileSettings', () => () => <div />);

const defaultProps = {
  isSearching: false,
  fromHome: true,
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

describe('Navbar', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(
      <AppCtx.Provider value={{ ctx: mockCtxLoggedIn, dispatch: jest.fn() }}>
        <Router>
          <Navbar {...defaultProps} />
        </Router>
      </AppCtx.Provider>
    );

    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('common elements', () => {
    it('renders ', () => {
      const { getByText } = render(
        <AppCtx.Provider value={{ ctx: mockCtxLoggedIn, dispatch: jest.fn() }}>
          <Router>
            <Navbar {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      expect(getByText('Artifact')).toBeInTheDocument();
      expect(getByText('HUB')).toBeInTheDocument();
      expect(getByText('Beta')).toBeInTheDocument();
    });

    it('goes to Homepage to click brand link', () => {
      const { getByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockCtxLoggedIn, dispatch: jest.fn() }}>
          <Router>
            <Navbar {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );
      const brandLink = getByTestId('brandLink');
      fireEvent.click(brandLink);
      expect(window.location.pathname).toBe('/');
    });
  });

  describe('when user is signed in', () => {
    it('renders component', () => {
      const { getByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockCtxLoggedIn, dispatch: jest.fn() }}>
          <Router>
            <Navbar {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      expect(getByTestId('userAuthBtn')).toBeInTheDocument();
    });
  });

  describe('when user is not signed in', () => {
    it('renders component', () => {
      const { getByText, getByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockCtxNotLoggedIn, dispatch: jest.fn() }}>
          <Router>
            <Navbar {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      expect(getByText('Sign in')).toBeInTheDocument();
      expect(getByText('Sign up')).toBeInTheDocument();
      expect(getByTestId('themeOptions')).toBeInTheDocument();
    });

    it('opens Sign in modal when redirect is defined', () => {
      const { getByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockCtxNotLoggedIn, dispatch: jest.fn() }}>
          <Router>
            <Navbar {...defaultProps} redirect="/control-panel" />
          </Router>
        </AppCtx.Provider>
      );

      waitFor(() => {
        expect(getByTestId('loginForm')).toBeInTheDocument();
      });
    });

    it('opens Sign in modal to click Sign in button', () => {
      const { getByText, getByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockCtxNotLoggedIn, dispatch: jest.fn() }}>
          <Router>
            <Navbar {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      const btn = getByText('Sign in');
      fireEvent.click(btn);

      waitFor(() => {
        expect(getByTestId('loginForm')).toBeInTheDocument();
      });
    });

    it('opens Sign up modal to click Sign up button', () => {
      const { getByText } = render(
        <AppCtx.Provider value={{ ctx: mockCtxNotLoggedIn, dispatch: jest.fn() }}>
          <Router>
            <Navbar {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      const btn = getByText('Sign up');
      fireEvent.click(btn);

      expect(getByText('Create your account using your email')).toBeInTheDocument();
    });
  });

  describe('when we are checking if user is or not signed in', () => {
    it('renders spinning', () => {
      const { getByRole } = render(
        <AppCtx.Provider value={{ ctx: mockUndefinedUser, dispatch: jest.fn() }}>
          <Router>
            <Navbar {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      expect(getByRole('status')).toBeInTheDocument();
    });
  });
});
