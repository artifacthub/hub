import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { mocked } from 'ts-jest/utils';

import { API } from '../../api';
import { AppCtx } from '../../context/AppCtx';
import alertDispatcher from '../../utils/alertDispatcher';
import SubscriptionsButton from './SubscriptionsButton';
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

const mockNotSignedInCtx = {
  user: null,
  prefs: {
    controlPanel: {},
    search: { limit: 25 },
  },
};

const mockUndefinedUserCtx = {
  user: undefined,
  prefs: {
    controlPanel: {},
    search: { limit: 25 },
  },
};

describe('SubscriptionsButton', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    mocked(API).getPackageSubscriptions.mockResolvedValue([{ eventKind: 0 }]);

    const result = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <SubscriptionsButton {...defaultProps} />
      </AppCtx.Provider>
    );

    await waitFor(() => {
      expect(result.asFragment()).toMatchSnapshot();
    });
  });

  describe('Render', () => {
    describe('when user is signed in', () => {
      it('renders component with active New releases notification', async () => {
        mocked(API).getPackageSubscriptions.mockResolvedValue([{ eventKind: 0 }]);
        mocked(API).deleteSubscription.mockResolvedValue('');

        const { getByText, getByTestId, queryByRole } = render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <SubscriptionsButton {...defaultProps} />
          </AppCtx.Provider>
        );

        await waitFor(() => {
          expect(API.getPackageSubscriptions).toHaveBeenCalledTimes(1);
          expect(API.getPackageSubscriptions).toHaveBeenCalledWith(defaultProps.packageId);
        });

        await waitFor(() => {
          expect(queryByRole('status')).toBeNull();
        });

        expect(getByText('New releases')).toBeInTheDocument();
        expect(getByText('Receive a notification when a new version of this package is released.')).toBeInTheDocument();

        await waitFor(() => {
          expect(getByTestId('checkedSubsBtn')).toBeInTheDocument();
        });

        const btn = getByTestId('newReleaseBtn');
        expect(btn).toBeInTheDocument();
        fireEvent.click(btn);
        expect(getByTestId('uncheckedSubsBtn')).toBeInTheDocument();

        await waitFor(() => {
          expect(API.deleteSubscription).toHaveBeenCalledTimes(1);
          expect(API.deleteSubscription).toHaveBeenCalledWith(defaultProps.packageId, 0);
        });

        await waitFor(() => {
          expect(API.getPackageSubscriptions).toHaveBeenCalledTimes(2);
        });
      });

      it('renders component with inactive New releases notification', async () => {
        mocked(API).getPackageSubscriptions.mockResolvedValue([]);
        mocked(API).addSubscription.mockResolvedValue('');

        const { getByTestId, getByRole } = render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <SubscriptionsButton {...defaultProps} />
          </AppCtx.Provider>
        );

        await waitFor(() => {
          expect(API.getPackageSubscriptions).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {});

        expect(getByTestId('uncheckedSubsBtn')).toBeInTheDocument();
        const btn = getByTestId('newReleaseBtn');
        expect(btn).toBeInTheDocument();
        fireEvent.click(btn);
        expect(getByTestId('checkedSubsBtn')).toBeInTheDocument();

        await waitFor(() => {
          expect(API.addSubscription).toHaveBeenCalledTimes(1);
          expect(API.addSubscription).toHaveBeenCalledWith(defaultProps.packageId, 0);
          expect(getByRole('status')).toBeInTheDocument();
        });
      });
    });

    describe('does not render component', () => {
      it('when getPackageSubscriptions fails', async () => {
        mocked(API).getPackageSubscriptions.mockRejectedValue({ statusText: 'error' });

        const { container } = render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <SubscriptionsButton {...defaultProps} />
          </AppCtx.Provider>
        );

        await waitFor(() => {
          expect(API.getPackageSubscriptions).toHaveBeenCalledTimes(1);
          expect(API.getPackageSubscriptions).toHaveBeenCalledWith(defaultProps.packageId);
        });

        await waitFor(() => {
          expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
          expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
            type: 'danger',
            message: 'An error occurred getting your subscriptions, please try again later',
          });
        });

        expect(container).toBeEmpty();
      });

      it('when user is not signed in', async () => {
        const { container } = render(
          <AppCtx.Provider value={{ ctx: mockNotSignedInCtx, dispatch: jest.fn() }}>
            <SubscriptionsButton {...defaultProps} />
          </AppCtx.Provider>
        );

        await waitFor(() => {
          expect(API.getPackageSubscriptions).toHaveBeenCalledTimes(0);
        });

        expect(container).toBeEmpty();
      });

      it('when ctx.user is not initialized', async () => {
        const { container } = render(
          <AppCtx.Provider value={{ ctx: mockUndefinedUserCtx, dispatch: jest.fn() }}>
            <SubscriptionsButton {...defaultProps} />
          </AppCtx.Provider>
        );

        await waitFor(() => {
          expect(API.getPackageSubscriptions).toHaveBeenCalledTimes(0);
        });

        expect(container).toBeEmpty();
      });
    });

    describe('when change subscription fails', () => {
      it('to activate New release notification', async () => {
        mocked(API).getPackageSubscriptions.mockResolvedValue([]);
        mocked(API).addSubscription.mockRejectedValue({ statusText: 'error' });

        const { getByTestId, getByRole } = render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <SubscriptionsButton {...defaultProps} />
          </AppCtx.Provider>
        );

        await waitFor(() => {
          expect(API.getPackageSubscriptions).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {});

        expect(getByTestId('uncheckedSubsBtn')).toBeInTheDocument();
        const btn = getByTestId('newReleaseBtn');
        expect(btn).toBeInTheDocument();
        fireEvent.click(btn);
        expect(getByTestId('checkedSubsBtn')).toBeInTheDocument();

        await waitFor(() => {
          expect(API.addSubscription).toHaveBeenCalledTimes(1);
          expect(API.addSubscription).toHaveBeenCalledWith(defaultProps.packageId, 0);
          expect(getByRole('status')).toBeInTheDocument();
        });

        expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
        expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
          type: 'danger',
          message: 'An error occurred subscribing to New releases notification, please try again later',
        });

        await waitFor(() => {
          expect(API.getPackageSubscriptions).toHaveBeenCalledTimes(2);
          expect(getByTestId('uncheckedSubsBtn')).toBeInTheDocument();
        });
      });
    });

    it('to inactivate New release notification', async () => {
      mocked(API).getPackageSubscriptions.mockResolvedValue([{ eventKind: 0 }]);
      mocked(API).deleteSubscription.mockRejectedValue({ statusText: 'error' });

      const { getByText, getByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <SubscriptionsButton {...defaultProps} />
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getPackageSubscriptions).toHaveBeenCalledTimes(1);
        expect(API.getPackageSubscriptions).toHaveBeenCalledWith(defaultProps.packageId);
      });

      await waitFor(() => {});

      expect(getByText('New releases')).toBeInTheDocument();
      expect(getByText('Receive a notification when a new version of this package is released.')).toBeInTheDocument();

      await waitFor(() => {
        expect(getByTestId('checkedSubsBtn')).toBeInTheDocument();
      });

      const btn = getByTestId('newReleaseBtn');
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);
      expect(getByTestId('uncheckedSubsBtn')).toBeInTheDocument();

      await waitFor(() => {
        expect(API.deleteSubscription).toHaveBeenCalledTimes(1);
        expect(API.deleteSubscription).toHaveBeenCalledWith(defaultProps.packageId, 0);
      });

      expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
      expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
        type: 'danger',
        message: 'An error occurred unsubscribing from New releases notification, please try again later',
      });

      await waitFor(() => {
        expect(API.getPackageSubscriptions).toHaveBeenCalledTimes(2);
        expect(getByTestId('checkedSubsBtn')).toBeInTheDocument();
      });
    });
  });
});
