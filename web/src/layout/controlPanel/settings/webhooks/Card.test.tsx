import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mocked } from 'jest-mock';
import { BrowserRouter as Router } from 'react-router-dom';

import API from '../../../../api';
import { AppCtx } from '../../../../context/AppCtx';
import { ErrorKind, Webhook } from '../../../../types';
import alertDispatcher from '../../../../utils/alertDispatcher';
import WebhookCard from './Card';
jest.mock('../../../../api');
jest.mock('../../../../utils/alertDispatcher');

const getmockWebhook = (fixtureId: string): Webhook => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`./__fixtures__/Card/${fixtureId}.json`) as Webhook;
};

const mockOnEdition = jest.fn();
const mockOnDeletion = jest.fn();
const mockOnAuthError = jest.fn();

const defaultProps = {
  onEdition: mockOnEdition,
  onDeletion: mockOnDeletion,
  onAuthError: mockOnAuthError,
};

const mockUserCtx = {
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

const mockOrgCtx = {
  user: { alias: 'userAlias', email: 'jsmith@email.com', passwordSet: true },
  prefs: {
    controlPanel: { selectedOrg: 'test' },
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

describe('WebhookCard', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const mockWebhook = getmockWebhook('1');
    const { asFragment } = render(
      <AppCtx.Provider value={{ ctx: mockUserCtx, dispatch: jest.fn() }}>
        <Router>
          <WebhookCard {...defaultProps} webhook={mockWebhook} />
        </Router>
      </AppCtx.Provider>
    );
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders active component', () => {
      const mockWebhook = getmockWebhook('2');

      render(
        <AppCtx.Provider value={{ ctx: mockUserCtx, dispatch: jest.fn() }}>
          <Router>
            <WebhookCard {...defaultProps} webhook={mockWebhook} />
          </Router>
        </AppCtx.Provider>
      );

      expect(screen.getByText(mockWebhook.name)).toBeInTheDocument();
      expect(screen.getByText(mockWebhook.url)).toBeInTheDocument();
      expect(screen.getByText(mockWebhook.description!)).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Open deletion webhook modal' })).toBeInTheDocument();
    });

    it('renders inactive component', () => {
      const mockWebhook = getmockWebhook('3');

      render(
        <AppCtx.Provider value={{ ctx: mockUserCtx, dispatch: jest.fn() }}>
          <Router>
            <WebhookCard {...defaultProps} webhook={mockWebhook} />
          </Router>
        </AppCtx.Provider>
      );

      expect(screen.getByText('Inactive')).toBeInTheDocument();
      expect(screen.queryByText('Active')).toBeNull();
    });

    it('opens Edit form', async () => {
      const mockWebhook = getmockWebhook('4');

      render(
        <AppCtx.Provider value={{ ctx: mockUserCtx, dispatch: jest.fn() }}>
          <Router>
            <WebhookCard {...defaultProps} webhook={mockWebhook} />
          </Router>
        </AppCtx.Provider>
      );

      const btn = screen.getByRole('button', { name: 'Edit webhook' });
      expect(btn).toHaveTextContent('Edit');
      await userEvent.click(btn);

      await waitFor(() => {
        expect(mockOnEdition).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('on webhook deletion', () => {
    it('when is successful', async () => {
      mocked(API).deleteWebhook.mockResolvedValue(null);

      const mockWebhook = getmockWebhook('5');

      render(
        <AppCtx.Provider value={{ ctx: mockUserCtx, dispatch: jest.fn() }}>
          <Router>
            <WebhookCard {...defaultProps} webhook={mockWebhook} />
          </Router>
        </AppCtx.Provider>
      );

      const modal = screen.queryByRole('dialog');
      expect(modal).toBeNull();

      const btn = screen.getByRole('button', { name: 'Open deletion webhook modal' });
      await userEvent.click(btn);

      expect(await screen.findByRole('dialog')).toHaveClass('active');
      expect(screen.getByText('Are you sure you want to delete this webhook?')).toBeInTheDocument();

      const deleteBtn = screen.getByRole('button', { name: 'Delete webhook' });
      expect(deleteBtn).toBeInTheDocument();
      await userEvent.click(deleteBtn);

      await waitFor(() => {
        expect(API.deleteWebhook).toHaveBeenCalledTimes(1);
        expect(API.deleteWebhook).toHaveBeenCalledWith(mockWebhook.webhookId, undefined);
      });

      await waitFor(() => {
        expect(mockOnDeletion).toHaveBeenCalledTimes(1);
      });
    });

    it('when context is org', async () => {
      mocked(API).deleteWebhook.mockResolvedValue(null);

      const mockWebhook = getmockWebhook('6');

      render(
        <AppCtx.Provider value={{ ctx: mockOrgCtx, dispatch: jest.fn() }}>
          <Router>
            <WebhookCard {...defaultProps} webhook={mockWebhook} />
          </Router>
        </AppCtx.Provider>
      );

      const modal = screen.queryByRole('dialog');
      expect(modal).toBeNull();

      const btn = screen.getByRole('button', { name: 'Open deletion webhook modal' });
      await userEvent.click(btn);

      expect(screen.getByRole('dialog')).toHaveClass('active');

      const deleteBtn = screen.getByRole('button', { name: 'Delete webhook' });
      await userEvent.click(deleteBtn);

      await waitFor(() => {
        expect(API.deleteWebhook).toHaveBeenCalledTimes(1);
        expect(API.deleteWebhook).toHaveBeenCalledWith(mockWebhook.webhookId, 'test');
      });

      await waitFor(() => {
        expect(mockOnDeletion).toHaveBeenCalledTimes(1);
      });
    });

    describe('when fails', () => {
      it('on UnauthorizedError', async () => {
        mocked(API).deleteWebhook.mockRejectedValue({
          kind: ErrorKind.Unauthorized,
        });

        const mockWebhook = getmockWebhook('7');

        render(
          <AppCtx.Provider value={{ ctx: mockUserCtx, dispatch: jest.fn() }}>
            <Router>
              <WebhookCard {...defaultProps} webhook={mockWebhook} />
            </Router>
          </AppCtx.Provider>
        );

        const btn = screen.getByRole('button', { name: 'Open deletion webhook modal' });
        await userEvent.click(btn);

        const deleteBtn = screen.getByRole('button', { name: 'Delete webhook' });
        await userEvent.click(deleteBtn);

        await waitFor(() => {
          expect(API.deleteWebhook).toHaveBeenCalledTimes(1);
          expect(API.deleteWebhook).toHaveBeenCalledWith(mockWebhook.webhookId, undefined);
        });

        await waitFor(() => {
          expect(mockOnAuthError).toHaveBeenCalledTimes(1);
        });
      });

      it('default error', async () => {
        mocked(API).deleteWebhook.mockRejectedValue({ kind: ErrorKind.Other });

        const mockWebhook = getmockWebhook('8');

        render(
          <AppCtx.Provider value={{ ctx: mockUserCtx, dispatch: jest.fn() }}>
            <Router>
              <WebhookCard {...defaultProps} webhook={mockWebhook} />
            </Router>
          </AppCtx.Provider>
        );

        const btn = screen.getByRole('button', { name: 'Open deletion webhook modal' });
        await userEvent.click(btn);

        const deleteBtn = screen.getByRole('button', { name: 'Delete webhook' });
        await userEvent.click(deleteBtn);

        await waitFor(() => {
          expect(API.deleteWebhook).toHaveBeenCalledTimes(1);
          expect(API.deleteWebhook).toHaveBeenCalledWith(mockWebhook.webhookId, undefined);
        });

        await waitFor(() => {
          expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
          expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
            type: 'danger',
            message: 'An error occurred deleting the webhook, please try again later.',
          });
        });
      });
    });
  });

  describe('last notifications', () => {
    it('renders button', () => {
      const mockWebhook = getmockWebhook('9');

      render(
        <AppCtx.Provider value={{ ctx: mockUserCtx, dispatch: jest.fn() }}>
          <Router>
            <WebhookCard {...defaultProps} webhook={mockWebhook} />
          </Router>
        </AppCtx.Provider>
      );

      expect(screen.getByText('Show last notifications')).toBeInTheDocument();
      expect(screen.queryByTestId('lastNotifAlert')).toBeNull();
    });

    it('renders button with exclamation icon', () => {
      const mockWebhook = getmockWebhook('10');

      render(
        <AppCtx.Provider value={{ ctx: mockUserCtx, dispatch: jest.fn() }}>
          <Router>
            <WebhookCard {...defaultProps} webhook={mockWebhook} />
          </Router>
        </AppCtx.Provider>
      );

      expect(screen.getByText('Show last notifications')).toBeInTheDocument();
      expect(screen.getByTestId('lastNotifAlert')).toBeInTheDocument();
    });

    it('does not render button', () => {
      const mockWebhook = getmockWebhook('11');

      render(
        <AppCtx.Provider value={{ ctx: mockUserCtx, dispatch: jest.fn() }}>
          <Router>
            <WebhookCard {...defaultProps} webhook={mockWebhook} />
          </Router>
        </AppCtx.Provider>
      );

      expect(screen.queryByText('Show last notifications')).toBeNull();
      expect(screen.queryByTestId('lastNotifAlert')).toBeNull();
    });
  });

  describe('no packages', () => {
    it('renders label', async () => {
      const mockWebhook = getmockWebhook('12');

      render(
        <AppCtx.Provider value={{ ctx: mockUserCtx, dispatch: jest.fn() }}>
          <Router>
            <WebhookCard {...defaultProps} webhook={mockWebhook} />
          </Router>
        </AppCtx.Provider>
      );

      expect(screen.getByText('No packages')).toBeInTheDocument();

      const badge = screen.getByTestId('elementWithTooltip');
      expect(badge).toBeInTheDocument();
      await userEvent.hover(badge);

      expect(await screen.findByRole('tooltip')).toBeInTheDocument();
      expect(screen.getByText('This webhook is not associated to any packages.')).toBeInTheDocument();
    });
  });
});
