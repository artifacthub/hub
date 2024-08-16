import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mocked } from 'jest-mock';
import { BrowserRouter as Router } from 'react-router-dom';

import API from '../../../../api';
import { AppCtx } from '../../../../context/AppCtx';
import { ErrorKind } from '../../../../types';
import WebhooksSection from './index';
jest.mock('../../../../api');

const getMockWebhooks = (fixtureId: string) => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`./__fixtures__/index/${fixtureId}.json`);
};

const mockOnAuthError = jest.fn();

const defaultProps = {
  activePage: null,
  onAuthError: mockOnAuthError,
};

const mockUserCtx = {
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

const mockOrgCtx = {
  user: { alias: 'userAlias', email: 'jsmith@email.com', passwordSet: false },
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

    const { asFragment } = render(
      <AppCtx.Provider value={{ ctx: mockUserCtx, dispatch: jest.fn() }}>
        <Router>
          <WebhooksSection {...defaultProps} />
        </Router>
      </AppCtx.Provider>
    );

    await waitFor(() => {
      expect(API.getWebhooks).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findAllByRole('listitem')).toHaveLength(5);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', async () => {
      const mockWebhooks = getMockWebhooks('2');
      mocked(API).getWebhooks.mockResolvedValue(mockWebhooks);

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

      expect(await screen.findByText('Webhooks')).toBeInTheDocument();
      expect(screen.getByText('Webhooks notify external services when certain events happen.')).toBeInTheDocument();
      expect(await screen.findAllByRole('listitem')).toHaveLength(5);
      expect(screen.getByRole('button', { name: 'Open webhook form' })).toBeInTheDocument();
    });

    it('renders properly when webhooks list is empty', async () => {
      const mockWebhooks = getMockWebhooks('3');
      mocked(API).getWebhooks.mockResolvedValue(mockWebhooks);

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

      await waitFor(() => {
        expect(screen.queryAllByRole('listitem')).toHaveLength(0);
      });

      expect(
        await screen.findByText(
          'You have not created any webhook yet. You can create your first one by clicking on the button below.'
        )
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Open form for creating your first webhook' })).toBeInTheDocument();
    });

    it('renders form to click on Add webhook', async () => {
      const mockWebhooks = getMockWebhooks('4');
      mocked(API).getWebhooks.mockResolvedValue(mockWebhooks);

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

      const btn = await screen.findByRole('button', { name: 'Open webhook form' });
      await userEvent.click(btn);

      expect(await screen.findByTestId('webhookForm')).toBeInTheDocument();
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
        expect(API.getWebhooks).toHaveBeenCalledWith({ limit: 10, offset: 0 }, 'test');
      });

      expect(await screen.findAllByRole('listitem')).toHaveLength(5);
    });

    it('loads first page when not webhooks in a different one', async () => {
      const mockWebhooks = getMockWebhooks('6');

      mocked(API).getWebhooks.mockResolvedValue(mockWebhooks).mockResolvedValueOnce({
        items: [],
        paginationTotalCount: '5',
      });

      render(
        <AppCtx.Provider value={{ ctx: mockOrgCtx, dispatch: jest.fn() }}>
          <Router>
            <WebhooksSection {...defaultProps} activePage="2" />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getWebhooks).toHaveBeenCalledTimes(2);
        expect(API.getWebhooks).toHaveBeenCalledWith({ limit: 10, offset: 10 }, 'test');
        expect(API.getWebhooks).toHaveBeenLastCalledWith({ limit: 10, offset: 0 }, 'test');
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

      await waitFor(() => {
        expect(mockOnAuthError).toHaveBeenCalledTimes(1);
      });
    });

    it('default error', async () => {
      mocked(API).getWebhooks.mockRejectedValue({ kind: ErrorKind.Other });

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

      expect(
        await screen.findByText('An error occurred getting webhooks, please try again later.')
      ).toBeInTheDocument();
    });
  });
});
