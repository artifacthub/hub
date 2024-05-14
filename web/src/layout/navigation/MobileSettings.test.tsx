import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

Object.defineProperty(document, 'querySelector', {
  value: (selector: string) => {
    switch (selector) {
      case `meta[name='artifacthub:allowUserSignUp']`:
        return {
          getAttribute: () => 'true',
        };
      default:
        return false;
    }
  },
  writable: true,
});

describe('MobileSettings', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(
      <AppCtx.Provider value={{ ctx: mockCtxLoggedIn, dispatch: jest.fn() }}>
        <Router>
          <MobileSettings {...defaultProps} />
        </Router>
      </AppCtx.Provider>
    );

    expect(asFragment()).toMatchSnapshot();
  });

  describe('when user is signed in', () => {
    it('renders component', () => {
      render(
        <AppCtx.Provider value={{ ctx: mockCtxLoggedIn, dispatch: jest.fn() }}>
          <Router>
            <MobileSettings {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      const signedText = screen.getByText(/Signed in as/i);
      expect(signedText).toBeInTheDocument();
      expect(signedText).toHaveTextContent('Signed in as test');
      expect(screen.queryByAltText('User profile')).toBeNull();

      expect(screen.getByText('Starred packages')).toBeInTheDocument();
      expect(screen.getByText('Control Panel')).toBeInTheDocument();
      expect(screen.getByTestId('themeOptions')).toBeInTheDocument();
      expect(screen.getByText('Sign out')).toBeInTheDocument();
    });

    it('renders profile Image', () => {
      render(
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

      const signedText = screen.getByText(/Signed in as/i);
      expect(signedText).toBeInTheDocument();
      expect(signedText).toHaveTextContent('Signed in as test');

      expect(screen.getByAltText('User profile')).toBeInTheDocument();
      expect(screen.getByText('Stats')).toBeInTheDocument();
      expect(screen.getByText('Documentation')).toBeInTheDocument();
      expect(screen.getByText('Starred packages')).toBeInTheDocument();
      expect(screen.getByText('Control Panel')).toBeInTheDocument();
      expect(screen.getByTestId('themeOptions')).toBeInTheDocument();
      expect(screen.getByText('Sign out')).toBeInTheDocument();
    });

    it('loads stats page', async () => {
      render(
        <AppCtx.Provider value={{ ctx: mockCtxLoggedIn, dispatch: jest.fn() }}>
          <Router>
            <MobileSettings {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      const link = screen.getByRole('link', { name: 'Stats' });
      expect(link).toBeInTheDocument();
      await userEvent.click(link);
      expect(window.location.pathname).toBe('/stats');
    });

    it('renders documentation link', () => {
      render(
        <AppCtx.Provider value={{ ctx: mockCtxLoggedIn, dispatch: jest.fn() }}>
          <Router>
            <MobileSettings {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      const link = screen.getByRole('button', { name: 'Open documentation' });
      expect(link).toBeInTheDocument();
      expect(link).toHaveProperty('target', '_self');
      expect(link).toHaveProperty('href', 'http://localhost/docs');
      expect(link).toHaveProperty('rel', 'noopener noreferrer');
    });

    it('loads starred packages page', async () => {
      render(
        <AppCtx.Provider value={{ ctx: mockCtxLoggedIn, dispatch: jest.fn() }}>
          <Router>
            <MobileSettings {...defaultProps} />
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
            <MobileSettings {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      const link = screen.getByRole('link', { name: 'Control Panel' });
      expect(link).toBeInTheDocument();
      await userEvent.click(link);
      expect(window.location.pathname).toBe('/control-panel');
    });
  });

  describe('when user is not signed in', () => {
    it('renders component', () => {
      render(
        <AppCtx.Provider value={{ ctx: mockCtxNotLoggedIn, dispatch: jest.fn() }}>
          <Router>
            <MobileSettings {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      expect(screen.getByText('Sign in')).toBeInTheDocument();
      expect(screen.getByText('Sign up')).toBeInTheDocument();
    });

    it('calls open Sign in modal to click Sign in button', async () => {
      render(
        <AppCtx.Provider value={{ ctx: mockCtxNotLoggedIn, dispatch: jest.fn() }}>
          <Router>
            <MobileSettings {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      const btn = screen.getByText('Sign in');
      await userEvent.click(btn);
      await waitFor(() => {
        expect(setOpenLogInMock).toHaveBeenCalledTimes(1);
      });
    });

    it('calls open Sign up modal to click Sign up button', async () => {
      render(
        <AppCtx.Provider value={{ ctx: mockCtxNotLoggedIn, dispatch: jest.fn() }}>
          <Router>
            <MobileSettings {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      const btn = screen.getByText('Sign up');
      await userEvent.click(btn);
      await waitFor(() => {
        expect(setOpenSignUpMock).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('when we are checking if user is or not signed in', () => {
    it('renders spinning', () => {
      render(
        <AppCtx.Provider value={{ ctx: mockUndefinedUser, dispatch: jest.fn() }}>
          <Router>
            <MobileSettings {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });
});
