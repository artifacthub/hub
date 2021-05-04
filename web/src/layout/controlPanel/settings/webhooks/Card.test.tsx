import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { mocked } from 'ts-jest/utils';

import { API } from '../../../../api';
import { AppCtx } from '../../../../context/AppCtx';
import { ErrorKind, Webhook } from '../../../../types';
import alertDispatcher from '../../../../utils/alertDispatcher';
import WebhookCard from './Card';
jest.mock('../../../../api');
jest.mock('../../../../utils/alertDispatcher');

const getmockWebhook = (fixtureId: string): Webhook => {
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

const mockOrgCtx = {
  user: { alias: 'userAlias', email: 'jsmith@email.com' },
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
    expect(asFragment).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders active component', () => {
      const mockWebhook = getmockWebhook('2');

      const { getByText, getByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockUserCtx, dispatch: jest.fn() }}>
          <Router>
            <WebhookCard {...defaultProps} webhook={mockWebhook} />
          </Router>
        </AppCtx.Provider>
      );

      expect(getByText(mockWebhook.name)).toBeInTheDocument();
      expect(getByText(mockWebhook.url)).toBeInTheDocument();
      expect(getByText(mockWebhook.description!)).toBeInTheDocument();
      expect(getByText('Active')).toBeInTheDocument();
      expect(getByText('Edit')).toBeInTheDocument();
      expect(getByText('Delete')).toBeInTheDocument();
      expect(getByTestId('deleteWebhookModalBtn')).toBeInTheDocument();
    });

    it('renders inactive component', () => {
      const mockWebhook = getmockWebhook('3');

      const { getByText, queryByText } = render(
        <AppCtx.Provider value={{ ctx: mockUserCtx, dispatch: jest.fn() }}>
          <Router>
            <WebhookCard {...defaultProps} webhook={mockWebhook} />
          </Router>
        </AppCtx.Provider>
      );

      expect(getByText('Inactive')).toBeInTheDocument();
      expect(queryByText('Active')).toBeNull();
    });

    it('opens Edit form', () => {
      const mockWebhook = getmockWebhook('4');

      const { getByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockUserCtx, dispatch: jest.fn() }}>
          <Router>
            <WebhookCard {...defaultProps} webhook={mockWebhook} />
          </Router>
        </AppCtx.Provider>
      );

      const btn = getByTestId('editWebhookBtn');
      expect(btn).toHaveTextContent('Edit');
      fireEvent.click(btn);
      expect(mockOnEdition).toHaveBeenCalledTimes(1);
    });
  });

  describe('on webhook deletion', () => {
    it('when is successful', async () => {
      mocked(API).deleteWebhook.mockResolvedValue(null);

      const mockWebhook = getmockWebhook('5');

      const { getByTestId, queryByRole, getByRole, getByText } = render(
        <AppCtx.Provider value={{ ctx: mockUserCtx, dispatch: jest.fn() }}>
          <Router>
            <WebhookCard {...defaultProps} webhook={mockWebhook} />
          </Router>
        </AppCtx.Provider>
      );

      const modal = queryByRole('dialog');
      expect(modal).toBeNull();

      const btn = getByTestId('deleteWebhookModalBtn');
      fireEvent.click(btn);

      expect(getByRole('dialog')).toHaveClass('active');
      expect(getByText('Are you sure you want to delete this webhook?')).toBeInTheDocument();

      const deleteBtn = getByTestId('deleteWebhookBtn');
      expect(deleteBtn).toBeInTheDocument();
      fireEvent.click(deleteBtn);

      await waitFor(() => {
        expect(API.deleteWebhook).toHaveBeenCalledTimes(1);
        expect(API.deleteWebhook).toHaveBeenCalledWith(mockWebhook.webhookId, undefined);
      });

      expect(mockOnDeletion).toHaveBeenCalledTimes(1);
    });

    it('when context is org', async () => {
      mocked(API).deleteWebhook.mockResolvedValue(null);

      const mockWebhook = getmockWebhook('6');

      const { getByTestId, queryByRole, getByRole } = render(
        <AppCtx.Provider value={{ ctx: mockOrgCtx, dispatch: jest.fn() }}>
          <Router>
            <WebhookCard {...defaultProps} webhook={mockWebhook} />
          </Router>
        </AppCtx.Provider>
      );

      const modal = queryByRole('dialog');
      expect(modal).toBeNull();

      const btn = getByTestId('deleteWebhookModalBtn');
      fireEvent.click(btn);

      expect(getByRole('dialog')).toHaveClass('active');

      const deleteBtn = getByTestId('deleteWebhookBtn');
      fireEvent.click(deleteBtn);

      await waitFor(() => {
        expect(API.deleteWebhook).toHaveBeenCalledTimes(1);
        expect(API.deleteWebhook).toHaveBeenCalledWith(mockWebhook.webhookId, 'test');
      });

      expect(mockOnDeletion).toHaveBeenCalledTimes(1);
    });

    describe('when fails', () => {
      it('on UnauthorizedError', async () => {
        mocked(API).deleteWebhook.mockRejectedValue({
          kind: ErrorKind.Unauthorized,
        });

        const mockWebhook = getmockWebhook('7');

        const { getByTestId } = render(
          <AppCtx.Provider value={{ ctx: mockUserCtx, dispatch: jest.fn() }}>
            <Router>
              <WebhookCard {...defaultProps} webhook={mockWebhook} />
            </Router>
          </AppCtx.Provider>
        );

        const btn = getByTestId('deleteWebhookModalBtn');
        fireEvent.click(btn);

        const deleteBtn = getByTestId('deleteWebhookBtn');
        fireEvent.click(deleteBtn);

        await waitFor(() => {
          expect(API.deleteWebhook).toHaveBeenCalledTimes(1);
          expect(API.deleteWebhook).toHaveBeenCalledWith(mockWebhook.webhookId, undefined);
        });

        expect(mockOnAuthError).toHaveBeenCalledTimes(1);
      });

      it('default error', async () => {
        mocked(API).deleteWebhook.mockRejectedValue({ kind: ErrorKind.Other });

        const mockWebhook = getmockWebhook('8');

        const { getByTestId } = render(
          <AppCtx.Provider value={{ ctx: mockUserCtx, dispatch: jest.fn() }}>
            <Router>
              <WebhookCard {...defaultProps} webhook={mockWebhook} />
            </Router>
          </AppCtx.Provider>
        );

        const btn = getByTestId('deleteWebhookModalBtn');
        fireEvent.click(btn);

        const deleteBtn = getByTestId('deleteWebhookBtn');
        fireEvent.click(deleteBtn);

        await waitFor(() => {
          expect(API.deleteWebhook).toHaveBeenCalledTimes(1);
          expect(API.deleteWebhook).toHaveBeenCalledWith(mockWebhook.webhookId, undefined);
        });

        expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
        expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
          type: 'danger',
          message: 'An error occurred deleting the webhook, please try again later.',
        });
      });
    });
  });

  describe('last notifications', () => {
    it('renders button', () => {
      const mockWebhook = getmockWebhook('9');

      const { getByText, queryByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockUserCtx, dispatch: jest.fn() }}>
          <Router>
            <WebhookCard {...defaultProps} webhook={mockWebhook} />
          </Router>
        </AppCtx.Provider>
      );

      expect(getByText('Show last notifications')).toBeInTheDocument();
      expect(queryByTestId('lastNotifAlert')).toBeNull();
    });

    it('renders button with exclamation icon', () => {
      const mockWebhook = getmockWebhook('10');

      const { getByText, getByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockUserCtx, dispatch: jest.fn() }}>
          <Router>
            <WebhookCard {...defaultProps} webhook={mockWebhook} />
          </Router>
        </AppCtx.Provider>
      );

      expect(getByText('Show last notifications')).toBeInTheDocument();
      expect(getByTestId('lastNotifAlert')).toBeInTheDocument();
    });

    it('does not render button', () => {
      const mockWebhook = getmockWebhook('11');

      const { queryByText, queryByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockUserCtx, dispatch: jest.fn() }}>
          <Router>
            <WebhookCard {...defaultProps} webhook={mockWebhook} />
          </Router>
        </AppCtx.Provider>
      );

      expect(queryByText('Show last notifications')).toBeNull();
      expect(queryByTestId('lastNotifAlert')).toBeNull();
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
      userEvent.hover(badge);

      expect(await screen.findByRole('tooltip')).toBeInTheDocument();
      expect(screen.getByText('This webhook is not associated to any packages.')).toBeInTheDocument();
    });
  });
});
