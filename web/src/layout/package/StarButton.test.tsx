import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { mocked } from 'ts-jest/utils';

import { API } from '../../api';
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
  user: { alias: 'userAlias', email: 'jsmith@email.com' },
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

const mockHistoryPush = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as {}),
  useHistory: () => ({
    push: mockHistoryPush,
  }),
}));

describe('StarButton', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    mocked(API).getStars.mockResolvedValue({ stars: 4, starredByUser: false });

    const result = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <Router>
          <StarButton {...defaultProps} />
        </Router>
      </AppCtx.Provider>
    );

    await waitFor(() => {
      expect(API.getStars).toHaveBeenCalledTimes(1);
      expect(result.asFragment()).toMatchSnapshot();
    });
  });

  describe('Render', () => {
    describe('when user is signed in', () => {
      it('renders unstarred package', async () => {
        mocked(API).getStars.mockResolvedValue({ stars: 4, starredByUser: false });
        mocked(API).toggleStar.mockResolvedValue('');

        const { getByText, getByTestId, getByRole, queryByRole, getAllByText } = render(
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

        waitFor(() => {
          expect(getByRole('status')).toBeInTheDocument();
        });

        expect(getByText('Star')).toBeInTheDocument();
        expect(getAllByText('4')).toHaveLength(1);
        expect(queryByRole('status')).toBeNull();

        const btn = getByTestId('toggleStarBtn');
        expect(btn).toBeInTheDocument();
        fireEvent.click(btn);

        await waitFor(() => {
          expect(API.toggleStar).toHaveBeenCalledTimes(1);
          expect(API.toggleStar).toHaveBeenCalledWith(defaultProps.packageId);
          expect(getByRole('status')).toBeInTheDocument();
        });
      });

      it('renders starred package', async () => {
        mocked(API).getStars.mockResolvedValue({ stars: 4, starredByUser: true });
        mocked(API).toggleStar.mockResolvedValue('');

        const { getByText, getByTestId, getByRole } = render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <Router>
              <StarButton {...defaultProps} />
            </Router>
          </AppCtx.Provider>
        );

        await waitFor(() => {
          expect(API.getStars).toHaveBeenCalledTimes(1);
        });

        expect(getByText('Unstar')).toBeInTheDocument();
        const btn = getByTestId('toggleStarBtn');
        expect(btn).toBeInTheDocument();
        fireEvent.click(btn);

        await waitFor(() => {
          expect(API.toggleStar).toHaveBeenCalledTimes(1);
          expect(API.toggleStar).toHaveBeenCalledWith(defaultProps.packageId);
          expect(getByRole('status')).toBeInTheDocument();
        });
      });
    });

    describe('calls alertDispatcher on error', () => {
      it('when package is not starred', async () => {
        mocked(API).getStars.mockResolvedValue({ stars: 4, starredByUser: false });
        mocked(API).toggleStar.mockRejectedValue('');

        const { getByTestId } = render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <Router>
              <StarButton {...defaultProps} />
            </Router>
          </AppCtx.Provider>
        );

        await waitFor(() => {
          expect(API.getStars).toHaveBeenCalledTimes(1);
        });

        const btn = getByTestId('toggleStarBtn');
        expect(btn).toBeInTheDocument();
        fireEvent.click(btn);

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

        const { getByTestId } = render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <Router>
              <StarButton {...defaultProps} />
            </Router>
          </AppCtx.Provider>
        );

        await waitFor(() => {
          expect(API.getStars).toHaveBeenCalledTimes(1);
        });

        const btn = getByTestId('toggleStarBtn');
        expect(btn).toBeInTheDocument();
        fireEvent.click(btn);

        await waitFor(() => {
          expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
          expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
            type: 'danger',
            message: 'An error occurred unstarring the package, please try again later.',
          });
        });
      });
    });

    describe('when user is not signed in', () => {
      it('displays tooltip', async () => {
        mocked(API).getStars.mockResolvedValue({ stars: 4 });
        const { getByRole } = render(
          <AppCtx.Provider value={{ ctx: { ...mockCtx, user: null }, dispatch: jest.fn() }}>
            <Router>
              <StarButton {...defaultProps} />
            </Router>
          </AppCtx.Provider>
        );

        await waitFor(() => {
          expect(API.getStars).toHaveBeenCalledTimes(1);
        });

        const tooltip = getByRole('tooltip');
        expect(tooltip).toBeInTheDocument();
        expect(tooltip).toHaveTextContent('You must be signed in to star a package');
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

        const { queryByTestId, queryByText, rerender } = render(component);

        rerender(component);

        await waitFor(() => {
          expect(API.getStars).toHaveBeenCalledTimes(1);
        });

        expect(queryByTestId('toggleStarBtn')).toBeNull();
        expect(queryByText('Star')).toBeNull();
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

        const { getByTestId } = render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
            <Router>
              <StarButton {...defaultProps} />
            </Router>
          </AppCtx.Provider>
        );

        await waitFor(() => {
          expect(API.getStars).toHaveBeenCalledTimes(1);
        });

        const btn = getByTestId('toggleStarBtn');
        expect(btn).toBeInTheDocument();
        fireEvent.click(btn);

        await waitFor(() => {
          expect(mockDispatch).toHaveBeenCalledTimes(1);
          expect(mockDispatch).toHaveBeenCalledWith({ type: 'signOut' });
        });
      });
    });
  });
});
