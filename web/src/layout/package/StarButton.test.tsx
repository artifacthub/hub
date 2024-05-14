import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mocked } from 'jest-mock';
import { BrowserRouter as Router } from 'react-router-dom';

import API from '../../api';
import { AppCtx } from '../../context/AppCtx';
import { ErrorKind } from '../../types';
import alertDispatcher from '../../utils/alertDispatcher';
import StarButton from './StarButton';
jest.mock('../../api');
jest.mock('../../utils/alertDispatcher');

const defaultProps = {
  packageId: 'id',
};

const mockCtx = {
  user: { alias: 'userAlias', email: 'jsmith@email.com', passwordSet: false },
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

const mockDispatch = jest.fn();

const mockUseNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as object),
  useNavigate: () => mockUseNavigate,
}));

describe('StarButton', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    mocked(API).getStars.mockResolvedValue({ stars: 4, starredByUser: false });

    const { asFragment } = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <Router>
          <StarButton {...defaultProps} />
        </Router>
      </AppCtx.Provider>
    );

    await waitFor(() => {
      expect(API.getStars).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText('Star')).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    describe('when user is signed in', () => {
      it('renders unstarred package', async () => {
        mocked(API)
          .getStars.mockResolvedValue({ stars: 5, starredByUser: true })
          .mockResolvedValueOnce({ stars: 4, starredByUser: false });
        mocked(API).toggleStar.mockResolvedValue('');

        render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <Router>
              <StarButton {...defaultProps} />
            </Router>
          </AppCtx.Provider>
        );

        await waitFor(() => {
          expect(API.getStars).toHaveBeenCalledTimes(1);
          expect(API.getStars).toHaveBeenCalledWith(defaultProps.packageId);
        });

        expect(await screen.findByText('Star')).toBeInTheDocument();
        expect(screen.getByText('4')).toBeInTheDocument();
        expect(screen.queryByRole('status')).toBeNull();

        const btn = await screen.findByRole('button', { name: 'Star package' });
        expect(btn).toBeInTheDocument();
        await userEvent.click(btn);

        await waitFor(() => {
          expect(API.toggleStar).toHaveBeenCalledTimes(1);
          expect(API.toggleStar).toHaveBeenCalledWith(defaultProps.packageId);
        });

        await waitFor(() => {
          expect(screen.queryByRole('status')).toBeNull();
        });

        await waitFor(() => {
          expect(API.getStars).toHaveBeenCalledTimes(2);
          expect(API.getStars).toHaveBeenCalledWith(defaultProps.packageId);
        });

        expect(await screen.findByRole('button', { name: 'Unstar package' })).toBeInTheDocument();
        expect(screen.getByRole('button')).not.toHaveClass('disabled');
        expect(screen.getByText('5')).toBeInTheDocument();
      });

      it('renders starred package', async () => {
        mocked(API)
          .getStars.mockResolvedValue({ stars: 4, starredByUser: false })
          .mockResolvedValueOnce({ stars: 5, starredByUser: true });
        mocked(API).toggleStar.mockResolvedValue('');

        render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <Router>
              <StarButton {...defaultProps} />
            </Router>
          </AppCtx.Provider>
        );

        await waitFor(() => {
          expect(API.getStars).toHaveBeenCalledTimes(1);
        });

        expect(await screen.findByText('Unstar')).toBeInTheDocument();
        expect(screen.queryByRole('status')).toBeNull();
        const btn = await screen.findByRole('button', { name: 'Unstar package' });
        expect(btn).toBeInTheDocument();
        await userEvent.click(btn);

        await waitFor(() => {
          expect(API.toggleStar).toHaveBeenCalledTimes(1);
          expect(API.toggleStar).toHaveBeenCalledWith(defaultProps.packageId);
        });

        await waitFor(() => {
          expect(screen.queryByRole('status')).toBeNull();
        });

        await waitFor(() => {
          expect(API.getStars).toHaveBeenCalledTimes(2);
          expect(API.getStars).toHaveBeenCalledWith(defaultProps.packageId);
        });

        expect(await screen.findByRole('button', { name: 'Star package' })).toBeInTheDocument();
        expect(screen.getByRole('button')).not.toHaveClass('disabled');
        expect(screen.getByText('4')).toBeInTheDocument();
      });
    });

    describe('calls alertDispatcher on error', () => {
      it('when package is not starred', async () => {
        mocked(API).getStars.mockResolvedValue({ stars: 4, starredByUser: false });
        mocked(API).toggleStar.mockRejectedValue('');

        render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <Router>
              <StarButton {...defaultProps} />
            </Router>
          </AppCtx.Provider>
        );

        await waitFor(() => {
          expect(API.getStars).toHaveBeenCalledTimes(1);
        });

        const btn = await screen.findByRole('button', { name: 'Star package' });
        expect(btn).toBeInTheDocument();
        await userEvent.click(btn);

        await waitFor(() => {
          expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
          expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
            type: 'danger',
            message: 'An error occurred starring the package, please try again later.',
          });
        });
      });

      it('when package is starred', async () => {
        mocked(API).getStars.mockResolvedValue({ stars: 4, starredByUser: true });
        mocked(API).toggleStar.mockRejectedValue('');

        render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <Router>
              <StarButton {...defaultProps} />
            </Router>
          </AppCtx.Provider>
        );

        await waitFor(() => {
          expect(API.getStars).toHaveBeenCalledTimes(1);
        });

        const btn = await screen.findByRole('button', { name: 'Unstar package' });
        expect(btn).toBeInTheDocument();
        await userEvent.click(btn);

        await waitFor(() => {
          expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
          expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
            type: 'danger',
            message: 'An error occurred unstarring the package, please try again later.',
          });
        });
      });
    });

    describe('on getStars error', () => {
      it('does not render component', async () => {
        mocked(API).getStars.mockRejectedValue({ kind: ErrorKind.Other });

        const component = (
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <Router>
              <StarButton {...defaultProps} />
            </Router>
          </AppCtx.Provider>
        );

        const { rerender, container } = render(component);

        rerender(component);

        await waitFor(() => {
          expect(API.getStars).toHaveBeenCalledTimes(1);
        });

        expect(screen.queryByRole('button', { name: 'Star package' })).toBeNull();
        expect(screen.queryByText('Star')).toBeNull();

        await waitFor(() => {
          expect(container).toBeEmptyDOMElement();
        });
      });
    });

    describe('on init', () => {
      it('does not call getStars if ctx.user is not initialized', async () => {
        mocked(API).getStars.mockResolvedValue({ stars: 4 });

        render(
          <AppCtx.Provider value={{ ctx: { ...mockCtx, user: undefined }, dispatch: jest.fn() }}>
            <Router>
              <StarButton {...defaultProps} />
            </Router>
          </AppCtx.Provider>
        );

        await waitFor(() => {
          expect(API.getStars).toHaveBeenCalledTimes(0);
        });
      });
    });

    describe('calls to sign out', () => {
      it('when user is not logged in to star/unstar pkg', async () => {
        mocked(API).getStars.mockResolvedValue({ stars: 4 });
        mocked(API).toggleStar.mockRejectedValue({ kind: ErrorKind.Unauthorized });

        render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
            <Router>
              <StarButton {...defaultProps} />
            </Router>
          </AppCtx.Provider>
        );

        await waitFor(() => {
          expect(API.getStars).toHaveBeenCalledTimes(1);
        });

        const btn = await screen.findByRole('button', { name: 'Unstar package' });
        expect(btn).toBeInTheDocument();
        await userEvent.click(btn);

        await waitFor(() => {
          expect(mockDispatch).toHaveBeenCalledTimes(1);
          expect(mockDispatch).toHaveBeenCalledWith({ type: 'signOut' });
        });
      });
    });

    describe('when user is not signed in', () => {
      it('btn is disabled', async () => {
        mocked(API).getStars.mockResolvedValue({ stars: 4 });
        render(
          <AppCtx.Provider value={{ ctx: { ...mockCtx, user: null }, dispatch: jest.fn() }}>
            <Router>
              <StarButton {...defaultProps} />
            </Router>
          </AppCtx.Provider>
        );

        expect(await screen.findByText('4'));

        const btn = screen.getByRole('button', { name: 'Star package' });
        expect(btn).toBeInTheDocument();
        expect(btn).toHaveClass('disabled');
      });
    });
  });
});
