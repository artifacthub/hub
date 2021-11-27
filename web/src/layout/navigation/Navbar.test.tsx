import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter as Router } from 'react-router-dom';

import { AppCtx } from '../../context/AppCtx';
import Navbar from './Navbar';
jest.mock('./MobileSettings', () => () => <div />);

const defaultProps = {
  isSearching: false,
  fromHome: true,
};

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
    const { asFragment } = render(
      <AppCtx.Provider value={{ ctx: mockCtxLoggedIn, dispatch: jest.fn() }}>
        <Router>
          <Navbar {...defaultProps} />
        </Router>
      </AppCtx.Provider>
    );

    expect(asFragment()).toMatchSnapshot();
  });

  describe('common elements', () => {
    it('goes to Homepage to click brand link', () => {
      render(
        <AppCtx.Provider value={{ ctx: mockCtxLoggedIn, dispatch: jest.fn() }}>
          <Router>
            <Navbar {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );
      const brandLink = screen.getByTestId('brandLink');
      userEvent.click(brandLink);
      expect(window.location.pathname).toBe('/');
    });
  });

  describe('when user is signed in', () => {
    it('renders component', () => {
      render(
        <AppCtx.Provider value={{ ctx: mockCtxLoggedIn, dispatch: jest.fn() }}>
          <Router>
            <Navbar {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      expect(screen.getByRole('button', { name: 'Open menu' })).toBeInTheDocument();
    });
  });

  describe('when user is not signed in', () => {
    it('renders component', () => {
      render(
        <AppCtx.Provider value={{ ctx: mockCtxNotLoggedIn, dispatch: jest.fn() }}>
          <Router>
            <Navbar {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      expect(screen.getByText('Sign in')).toBeInTheDocument();
      expect(screen.getByText('Sign up')).toBeInTheDocument();
      expect(screen.getByTestId('themeOptions')).toBeInTheDocument();
    });

    it('opens Sign in modal when redirect is defined', async () => {
      render(
        <AppCtx.Provider value={{ ctx: mockCtxNotLoggedIn, dispatch: jest.fn() }}>
          <Router>
            <Navbar {...defaultProps} redirect="/control-panel" />
          </Router>
        </AppCtx.Provider>
      );

      expect(await screen.findByTestId('loginForm')).toBeInTheDocument();
    });

    it('opens Sign in modal to click Sign in button', async () => {
      render(
        <AppCtx.Provider value={{ ctx: mockCtxNotLoggedIn, dispatch: jest.fn() }}>
          <Router>
            <Navbar {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      const btn = screen.getByText('Sign in');
      userEvent.click(btn);

      expect(await screen.findByTestId('loginForm')).toBeInTheDocument();
    });

    it('opens Sign up modal to click Sign up button', () => {
      render(
        <AppCtx.Provider value={{ ctx: mockCtxNotLoggedIn, dispatch: jest.fn() }}>
          <Router>
            <Navbar {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      const btn = screen.getByText('Sign up');
      userEvent.click(btn);

      expect(screen.getByText('Create your account using your email')).toBeInTheDocument();
    });
  });

  describe('when we are checking if user is or not signed in', () => {
    it('renders spinning', () => {
      render(
        <AppCtx.Provider value={{ ctx: mockUndefinedUser, dispatch: jest.fn() }}>
          <Router>
            <Navbar {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });
});
