import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { mocked } from 'ts-jest/utils';

import { API } from '../../../../api';
import { AppCtx } from '../../../../context/AppCtx';
import { ErrorKind, Webhook } from '../../../../types';
import WebhooksSection from './index';
jest.mock('../../../../api');

const getMockWebhooks = (fixtureId: string): Webhook[] => {
  return require(`./__fixtures__/index/${fixtureId}.json`) as Webhook[];
};

const mockOnAuthError = jest.fn();

const defaultProps = {
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

describe('WebhooksSection', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const mockWebhooks = getMockWebhooks('1');
    mocked(API).getWebhooks.mockResolvedValue(mockWebhooks);

    const result = render(
      <AppCtx.Provider value={{ ctx: mockUserCtx, dispatch: jest.fn() }}>
        <Router>
          <WebhooksSection {...defaultProps} />
        </Router>
      </AppCtx.Provider>
    );

    await waitFor(() => {
      expect(API.getWebhooks).toHaveBeenCalledTimes(1);
      expect(result.asFragment()).toMatchSnapshot();
    });
  });

  describe('Render', () => {
    it('renders component', async () => {
      const mockWebhooks = getMockWebhooks('2');
      mocked(API).getWebhooks.mockResolvedValue(mockWebhooks);

      const { getByText, getByTestId, getAllByRole } = render(
        <AppCtx.Provider value={{ ctx: mockUserCtx, dispatch: jest.fn() }}>
          <Router>
            <WebhooksSection {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getWebhooks).toHaveBeenCalledTimes(1);
      });

      expect(getByText('Webhooks')).toBeInTheDocument();
      expect(getByText('Webhooks notify external services when certain events happen.')).toBeInTheDocument();
      expect(getAllByRole('listitem')).toHaveLength(5);
      expect(getByTestId('addWebhookBtn'));
    });

    it('renders properly when webhooks list is empty', async () => {
      const mockWebhooks = getMockWebhooks('3');
      mocked(API).getWebhooks.mockResolvedValue(mockWebhooks);

      const { getByText, getByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockUserCtx, dispatch: jest.fn() }}>
          <Router>
            <WebhooksSection {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getWebhooks).toHaveBeenCalledTimes(1);
      });

      expect(
        getByText(
          'You have not created any webhook yet. You can create your first one by clicking on the button below.'
        )
      ).toBeInTheDocument();
      expect(getByTestId('addFirstWebhookBtn')).toBeInTheDocument();
    });

    it('renders form to click on Add webhook', async () => {
      const mockWebhooks = getMockWebhooks('4');
      mocked(API).getWebhooks.mockResolvedValue(mockWebhooks);

      const { getByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockUserCtx, dispatch: jest.fn() }}>
          <Router>
            <WebhooksSection {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getWebhooks).toHaveBeenCalledTimes(1);
      });

      const btn = getByTestId('addWebhookBtn');
      fireEvent.click(btn);

      expect(getByTestId('webhookForm')).toBeInTheDocument();
    });

    it('calls getWebhooks with selected org', async () => {
      const mockWebhooks = getMockWebhooks('5');
      mocked(API).getWebhooks.mockResolvedValue(mockWebhooks);

      render(
        <AppCtx.Provider value={{ ctx: mockOrgCtx, dispatch: jest.fn() }}>
          <Router>
            <WebhooksSection {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getWebhooks).toHaveBeenCalledTimes(1);
        expect(API.getWebhooks).toHaveBeenCalledWith('test');
      });
    });
  });

  describe('when getWebhooks fails', () => {
    it('on UnauthorizedError', async () => {
      mocked(API).getWebhooks.mockRejectedValue({
        kind: ErrorKind.Unauthorized,
      });

      render(
        <AppCtx.Provider value={{ ctx: mockUserCtx, dispatch: jest.fn() }}>
          <Router>
            <WebhooksSection {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getWebhooks).toHaveBeenCalledTimes(1);
      });

      expect(mockOnAuthError).toHaveBeenCalledTimes(1);
    });

    it('default error', async () => {
      mocked(API).getWebhooks.mockRejectedValue({ kind: ErrorKind.Other });

      const { getByText } = render(
        <AppCtx.Provider value={{ ctx: mockUserCtx, dispatch: jest.fn() }}>
          <Router>
            <WebhooksSection {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getWebhooks).toHaveBeenCalledTimes(1);
      });

      expect(getByText('An error occurred getting webhooks, please try again later.')).toBeInTheDocument();
    });
  });
});
