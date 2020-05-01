import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { mocked } from 'ts-jest/utils';

import { API } from '../../api';
import { AppCtx } from '../../context/AppCtx';
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
    search: { limit: 25 },
  },
};

describe('Package index', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const result = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <StarButton {...defaultProps} />
      </AppCtx.Provider>
    );

    await waitFor(() => {
      expect(result.asFragment()).toMatchSnapshot();
    });
  });

  describe('Render', () => {
    describe('when user is signed in', () => {
      it('renders unstarred package', async () => {
        mocked(API).getStars.mockResolvedValue({ stars: 4, starredByUser: false });
        mocked(API).toggleStar.mockResolvedValue('');

        const { getByText, getByTestId, getByRole, queryByRole } = render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <StarButton {...defaultProps} />
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
            <StarButton {...defaultProps} />
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
            <StarButton {...defaultProps} />
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
            message: 'An error occurred staring the package, please try again later',
          });
        });
      });

      it('when package is starred', async () => {
        mocked(API).getStars.mockResolvedValue({ stars: 4, starredByUser: true });
        mocked(API).toggleStar.mockRejectedValue('');

        const { getByTestId } = render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <StarButton {...defaultProps} />
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
            message: 'An error occurred unstaring the package, please try again later',
          });
        });
      });
    });

    describe('when user is not signed in', () => {
      it('displays tooltip', async () => {
        mocked(API).getStars.mockResolvedValue({ stars: 4, starredByUser: null });
        const { getByRole } = render(
          <AppCtx.Provider value={{ ctx: { ...mockCtx, user: null }, dispatch: jest.fn() }}>
            <StarButton {...defaultProps} />
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
      it('renders proper component', async () => {
        mocked(API).getStars.mockRejectedValue({});

        const { getByTestId, queryByText } = render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <StarButton {...defaultProps} />
          </AppCtx.Provider>
        );

        await waitFor(() => {
          expect(API.getStars).toHaveBeenCalledTimes(1);
        });

        const btn = getByTestId('toggleStarBtn');
        expect(btn).toBeDisabled();
        expect(queryByText('Star')).toBeNull();
      });
    });
  });
});
