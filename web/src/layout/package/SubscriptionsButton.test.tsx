import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mocked } from 'jest-mock';
import { BrowserRouter as Router } from 'react-router-dom';

import API from '../../api';
import { AppCtx } from '../../context/AppCtx';
import { ErrorKind } from '../../types';
import alertDispatcher from '../../utils/alertDispatcher';
import SubscriptionsButton from './SubscriptionsButton';
jest.mock('../../api');
jest.mock('../../utils/alertDispatcher');

const defaultProps = {
  packageId: 'id',
};

const mockCtx = {
  user: { alias: 'userAlias', email: 'jsmith@email.com', passwordSet: true },
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

const mockNotSignedInCtx = {
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

const mockUndefinedUserCtx = {
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

describe('SubscriptionsButton', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    mocked(API).getPackageSubscriptions.mockResolvedValue([{ eventKind: 0 }]);

    const { asFragment } = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <Router>
          <SubscriptionsButton {...defaultProps} />
        </Router>
      </AppCtx.Provider>
    );

    await waitFor(() => {
      expect(API.getPackageSubscriptions).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByRole('menu')).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    describe('when user is signed in', () => {
      it('renders component with active New releases notification', async () => {
        mocked(API).getPackageSubscriptions.mockResolvedValue([{ eventKind: 0 }]);
        mocked(API).deleteSubscription.mockResolvedValue('');

        render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <Router>
              <SubscriptionsButton {...defaultProps} />
            </Router>
          </AppCtx.Provider>
        );

        await waitFor(() => {
          expect(API.getPackageSubscriptions).toHaveBeenCalledTimes(1);
          expect(API.getPackageSubscriptions).toHaveBeenCalledWith(defaultProps.packageId);
        });

        await waitFor(() => {
          expect(screen.queryByRole('status')).toBeNull();
        });

        expect(await screen.findByRole('menu')).toBeInTheDocument();
        expect(screen.getByText('New releases')).toBeInTheDocument();
        expect(
          screen.getByText('Receive a notification when a new version of this package is released.')
        ).toBeInTheDocument();

        expect(await screen.findByTestId('checkedSubsBtn')).toBeInTheDocument();

        const btn = await screen.findByRole('button', { name: /Change new releases subscription/i });
        expect(btn).toBeInTheDocument();
        await userEvent.click(btn);
        expect(await screen.findAllByTestId('uncheckedSubsBtn')).toHaveLength(2);

        await waitFor(() => {
          expect(API.deleteSubscription).toHaveBeenCalledTimes(1);
          expect(API.deleteSubscription).toHaveBeenCalledWith(defaultProps.packageId, 0);
        });

        expect(await screen.findByRole('menu')).not.toHaveClass('show');
      });

      it('renders component with inactive event notifications', async () => {
        mocked(API).getPackageSubscriptions.mockResolvedValue([]);
        mocked(API).addSubscription.mockResolvedValue('');

        render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <Router>
              <SubscriptionsButton {...defaultProps} />
            </Router>
          </AppCtx.Provider>
        );

        await waitFor(() => {
          expect(API.getPackageSubscriptions).toHaveBeenCalledTimes(1);
        });

        expect(await screen.findAllByTestId('uncheckedSubsBtn')).toHaveLength(2);
        const btn = screen.getByRole('button', { name: /Change new releases subscription/i });
        expect(btn).toBeInTheDocument();
        await userEvent.click(btn);
        expect(screen.getByTestId('checkedSubsBtn')).toBeInTheDocument();

        await waitFor(() => {
          expect(API.addSubscription).toHaveBeenCalledTimes(1);
          expect(API.addSubscription).toHaveBeenCalledWith(defaultProps.packageId, 0);
        });
      });

      it('calls to addSubscription with securityAlert event', async () => {
        mocked(API).getPackageSubscriptions.mockResolvedValue([]);
        mocked(API).addSubscription.mockResolvedValue('');

        render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <Router>
              <SubscriptionsButton {...defaultProps} />
            </Router>
          </AppCtx.Provider>
        );

        await waitFor(() => {
          expect(API.getPackageSubscriptions).toHaveBeenCalledTimes(1);
        });

        expect(await screen.findAllByTestId('uncheckedSubsBtn')).toHaveLength(2);
        const btn = screen.getByRole('button', { name: /Change security alerts subscription/i });
        expect(btn).toBeInTheDocument();
        await userEvent.click(btn);
        expect(screen.getByTestId('checkedSubsBtn')).toBeInTheDocument();

        await waitFor(() => {
          expect(API.addSubscription).toHaveBeenCalledTimes(1);
          expect(API.addSubscription).toHaveBeenCalledWith(defaultProps.packageId, 1);
        });
      });

      it('calls getPackageSubscriptions when a new package is rendered', async () => {
        mocked(API).getPackageSubscriptions.mockResolvedValue([]);

        const { rerender } = render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <Router>
              <SubscriptionsButton {...defaultProps} />
            </Router>
          </AppCtx.Provider>
        );

        await waitFor(() => {
          expect(API.getPackageSubscriptions).toHaveBeenCalledTimes(1);
          expect(API.getPackageSubscriptions).toHaveBeenCalledWith('id');
        });

        expect(await screen.findByRole('menu')).toBeInTheDocument();

        act(() => {
          rerender(
            <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
              <Router>
                <SubscriptionsButton packageId="id2" />
              </Router>
            </AppCtx.Provider>
          );
        });

        await waitFor(() => {
          expect(API.getPackageSubscriptions).toHaveBeenCalledTimes(2);
          expect(API.getPackageSubscriptions).toHaveBeenLastCalledWith('id2');
        });

        expect(await screen.findByRole('menu')).toBeInTheDocument();
      });
    });

    describe('displays disabled button', () => {
      it('when user is not signed in', async () => {
        render(
          <AppCtx.Provider value={{ ctx: mockNotSignedInCtx, dispatch: jest.fn() }}>
            <Router>
              <SubscriptionsButton {...defaultProps} />
            </Router>
          </AppCtx.Provider>
        );

        await waitFor(() => {
          expect(API.getPackageSubscriptions).toHaveBeenCalledTimes(0);
        });

        const btn = await screen.findByRole('button', { name: /Open subscriptions menu/ });
        expect(btn).toBeInTheDocument();
        expect(btn).toHaveClass('disabled');
      });

      it('when getPackageSubscriptions fails', async () => {
        mocked(API).getPackageSubscriptions.mockRejectedValue({ kind: ErrorKind.Other });

        render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <Router>
              <SubscriptionsButton {...defaultProps} />
            </Router>
          </AppCtx.Provider>
        );

        await waitFor(() => {
          expect(API.getPackageSubscriptions).toHaveBeenCalledTimes(1);
          expect(API.getPackageSubscriptions).toHaveBeenCalledWith(defaultProps.packageId);
        });

        await waitFor(() => {
          expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(0);
        });

        const btn = await screen.findByRole('button', { name: /Open subscriptions menu/ });
        expect(btn).toBeInTheDocument();
        expect(btn).toHaveClass('disabled');
      });
    });

    describe('does not render component', () => {
      it('when ctx.user is not initialized', async () => {
        const { container } = render(
          <AppCtx.Provider value={{ ctx: mockUndefinedUserCtx, dispatch: jest.fn() }}>
            <Router>
              <SubscriptionsButton {...defaultProps} />
            </Router>
          </AppCtx.Provider>
        );

        await waitFor(() => {
          expect(API.getPackageSubscriptions).toHaveBeenCalledTimes(0);
        });

        expect(container).toBeEmptyDOMElement();
      });
    });

    describe('when change subscription fails, returns to previous state', () => {
      xit('with active event', async () => {
        mocked(API).getPackageSubscriptions.mockResolvedValue([]);
        mocked(API).addSubscription.mockRejectedValue({ kind: ErrorKind.Other });

        render(
          <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
            <Router>
              <SubscriptionsButton {...defaultProps} />
            </Router>
          </AppCtx.Provider>
        );

        await waitFor(() => {
          expect(API.getPackageSubscriptions).toHaveBeenCalledTimes(1);
        });

        expect(await screen.findByRole('menu')).toBeInTheDocument();

        await waitFor(() => {
          expect(screen.getAllByTestId('uncheckedSubsBtn')).toHaveLength(2);
        });

        const btn = await screen.findByRole('button', { name: /Change new releases subscription/i });
        expect(btn).toBeInTheDocument();
        await userEvent.click(btn);

        await waitFor(() => {
          expect(API.addSubscription).toHaveBeenCalledTimes(1);
          expect(API.addSubscription).toHaveBeenCalledWith(defaultProps.packageId, 0);
        });

        await waitFor(() => {
          expect(screen.getByTestId('checkedSubsBtn')).toBeInTheDocument();
        });

        await waitFor(() => {
          expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
          expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
            type: 'danger',
            message: 'An error occurred subscribing to New releases notification, please try again later.',
          });
        });

        await waitFor(() => {
          expect(API.getPackageSubscriptions).toHaveBeenCalledTimes(2);
        });

        await waitFor(() => {
          expect(screen.getAllByTestId('uncheckedSubsBtn')).toHaveLength(2);
        });
      });
    });

    xit('with inactive event', async () => {
      mocked(API).getPackageSubscriptions.mockResolvedValue([{ eventKind: 0 }]);
      mocked(API).deleteSubscription.mockRejectedValue({ kind: ErrorKind.Other });

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <SubscriptionsButton {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getPackageSubscriptions).toHaveBeenCalledTimes(1);
        expect(API.getPackageSubscriptions).toHaveBeenCalledWith(defaultProps.packageId);
      });

      expect(await screen.findByText('New releases')).toBeInTheDocument();
      expect(
        screen.getByText('Receive a notification when a new version of this package is released.')
      ).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByTestId('checkedSubsBtn')).toBeInTheDocument();
      });

      const btn = await screen.findByRole('button', { name: /Change new releases subscription/i });
      expect(btn).toBeInTheDocument();
      await userEvent.click(btn);

      await waitFor(() => {
        expect(screen.getAllByTestId('uncheckedSubsBtn')).toHaveLength(2);
      });

      await waitFor(() => {
        expect(API.deleteSubscription).toHaveBeenCalledTimes(1);
        expect(API.deleteSubscription).toHaveBeenCalledWith(defaultProps.packageId, 0);
      });

      await waitFor(() => {
        expect(screen.getByRole('menu')).not.toHaveClass('show');
      });

      await waitFor(() => {
        expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
        expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
          type: 'danger',
          message: 'An error occurred unsubscribing from New releases notification, please try again later.',
        });
      });

      await waitFor(() => {
        expect(API.getPackageSubscriptions).toHaveBeenCalledTimes(2);
      });
      expect(await screen.findByTestId('checkedSubsBtn')).toBeInTheDocument();
    });
  });
});
