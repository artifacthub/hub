import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReactRouter, { BrowserRouter as Router } from 'react-router-dom';

import { AppCtx } from '../../context/AppCtx';
import Navbar from './Navbar';
jest.mock('./MobileSettings', () => () => <div />);

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as object),
  useSearchParams: () => jest.fn(),
}));

const defaultProps = {
  isSearching: false,
  inHome: true,
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

describe('Navbar', () => {
  beforeEach(() => {
    jest.spyOn(ReactRouter, 'useSearchParams').mockReturnValue([
      {
        get: (): null => {
          return null;
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any);
  });

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
    it('goes to Homepage to click brand link', async () => {
      render(
        <AppCtx.Provider value={{ ctx: mockCtxLoggedIn, dispatch: jest.fn() }}>
          <Router>
            <Navbar {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );
      const brandLink = screen.getByTestId('brandLink');
      await userEvent.click(brandLink);
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

      expect(screen.getByText('Docs')).toBeInTheDocument();
      expect(screen.getByText('Stats')).toBeInTheDocument();
      expect(screen.getByText('Sign in')).toBeInTheDocument();
      expect(screen.getByText('Sign up')).toBeInTheDocument();
      expect(screen.getByTestId('themeOptions')).toBeInTheDocument();
    });

    it('opens Stats page', async () => {
      render(
        <AppCtx.Provider value={{ ctx: mockCtxNotLoggedIn, dispatch: jest.fn() }}>
          <Router>
            <Navbar {...defaultProps} />
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
        <AppCtx.Provider value={{ ctx: mockCtxNotLoggedIn, dispatch: jest.fn() }}>
          <Router>
            <Navbar {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      const link = screen.getByRole('button', { name: 'Open documentation' });
      expect(link).toBeInTheDocument();
      expect(link).toHaveProperty('target', '_self');
      expect(link).toHaveProperty('href', 'http://localhost/docs');
      expect(link).toHaveProperty('rel', 'noopener noreferrer');
    });

    it('opens Sign in modal when redirect is defined', async () => {
      jest.spyOn(ReactRouter, 'useSearchParams').mockReturnValue([
        {
          get: (name: string): string | null => {
            switch (name) {
              case 'redirect':
                return '/control-panel';
              default:
                return null;
            }
          },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any);

      render(
        <AppCtx.Provider value={{ ctx: mockCtxNotLoggedIn, dispatch: jest.fn() }}>
          <Router>
            <Navbar {...defaultProps} />
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
      await userEvent.click(btn);

      expect(await screen.findByTestId('loginForm')).toBeInTheDocument();
    });

    it('opens Sign up modal to click Sign up button', async () => {
      render(
        <AppCtx.Provider value={{ ctx: mockCtxNotLoggedIn, dispatch: jest.fn() }}>
          <Router>
            <Navbar {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      const btn = screen.getByText('Sign up');
      await userEvent.click(btn);

      expect(await screen.findByText('Create your account using your email')).toBeInTheDocument();
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
