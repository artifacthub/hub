import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter as Router } from 'react-router-dom';
import { vi } from 'vitest';

import API from '../../../api';
import { AppCtx } from '../../../context/AppCtx';
import { ErrorKind } from '../../../types';
import MembersSection from './index';
vi.mock('../../../api');

const authorizerMock = vi.hoisted(() => ({
  check: vi.fn(() => true),
  init: vi.fn(),
  updateCtx: vi.fn(),
  getAllowedActionsList: vi.fn(),
}));

vi.mock('../../../utils/authorizer', () => ({
  __esModule: true,
  default: authorizerMock,
}));

const getMembers = (fixtureId: string) => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`./__fixtures__/index/${fixtureId}.json`);
};

const onAuthErrorMock = jest.fn();

const defaultProps = {
  onAuthError: onAuthErrorMock,
  activePage: null,
};

const mockCtx = {
  user: { alias: 'test', email: 'test@test.com', passwordSet: true },
  prefs: {
    controlPanel: {
      selectedOrg: 'orgTest',
    },
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

describe('Members section index', () => {
  afterEach(() => {
    jest.resetAllMocks();
    authorizerMock.check.mockClear();
  });

  it('creates snapshot', async () => {
    const mockMembers = getMembers('1');
    vi.mocked(API).getOrganizationMembers.mockResolvedValue(mockMembers);

    const { asFragment } = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <Router>
          <MembersSection {...defaultProps} />
        </Router>
      </AppCtx.Provider>
    );

    await waitFor(() => {
      expect(API.getOrganizationMembers).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText('Members')).toBeInTheDocument();
    expect(await screen.findByTestId('pagination-summary')).toHaveTextContent('1 - 2 of 2 results');
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', async () => {
      const mockMembers = getMembers('2');
      vi.mocked(API).getOrganizationMembers.mockResolvedValue(mockMembers);

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <MembersSection {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getOrganizationMembers).toHaveBeenCalledTimes(1);
      });

      expect(await screen.findByText('Members')).toBeInTheDocument();
      expect(await screen.findByTestId('pagination-summary')).toHaveTextContent('1 - 2 of 2 results');
    });

    it('displays no data component when no members', async () => {
      const mockMembers = getMembers('4');
      vi.mocked(API).getOrganizationMembers.mockResolvedValue(mockMembers);

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <MembersSection {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
      expect(screen.getByText('Do you want to add a member?')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Open modal' })).toBeInTheDocument();
    });

    it('renders 2 members card', async () => {
      const mockMembers = getMembers('5');
      vi.mocked(API).getOrganizationMembers.mockResolvedValue(mockMembers);

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <MembersSection {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      const cards = await screen.findAllByTestId('memberCard');
      expect(cards).toHaveLength(2);
      expect(await screen.findByTestId('pagination-summary')).toHaveTextContent('1 - 2 of 2 results');
    });

    it('renders organization form when add org button is clicked', async () => {
      const mockMembers = getMembers('6');
      vi.mocked(API).getOrganizationMembers.mockResolvedValue(mockMembers);

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <MembersSection {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      const addBtn = await screen.findByRole('button', { name: 'Open invite member modal' });
      expect(addBtn).toBeInTheDocument();

      expect(screen.queryByText('Username')).toBeNull();

      await userEvent.click(addBtn);

      expect(await screen.findByText('Username')).toBeInTheDocument();
    });

    it('renders organization form when add org button is clicked', async () => {
      const mockMembers = getMembers('7');
      vi.mocked(API).getOrganizationMembers.mockResolvedValue(mockMembers);

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <MembersSection {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      const firstBtn = await screen.findByRole('button', { name: 'Open modal' });
      expect(screen.queryByText('Username')).toBeNull();
      expect(firstBtn).toBeInTheDocument();

      await userEvent.click(firstBtn);

      expect(await screen.findByText('Username')).toBeInTheDocument();
    });

    it('loads first page when not members in a different one', async () => {
      const mockMembers = getMembers('8');

      vi.mocked(API).getOrganizationMembers.mockResolvedValue(mockMembers).mockResolvedValueOnce({
        items: [],
        paginationTotalCount: '2',
      });

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <MembersSection {...defaultProps} activePage="2" />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getOrganizationMembers).toHaveBeenCalledTimes(2);
        expect(API.getOrganizationMembers).toHaveBeenCalledWith({ limit: 10, offset: 10 }, 'orgTest');
        expect(API.getOrganizationMembers).toHaveBeenLastCalledWith({ limit: 10, offset: 0 }, 'orgTest');
      });
    });
  });

  describe('on getOrganizationMembers error', () => {
    it('UnauthorizedError error', async () => {
      vi.mocked(API).getOrganizationMembers.mockRejectedValue({
        kind: ErrorKind.Unauthorized,
      });

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <MembersSection {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => expect(API.getOrganizationMembers).toHaveBeenCalledTimes(1));

      await waitFor(() => expect(onAuthErrorMock).toHaveBeenCalledTimes(1));
    });

    it('rest API errors', async () => {
      vi.mocked(API).getOrganizationMembers.mockRejectedValue({ kind: ErrorKind.Other });

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <MembersSection {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => expect(API.getOrganizationMembers).toHaveBeenCalledTimes(1));

      expect(await screen.findByRole('alert')).toBeInTheDocument();
      expect(
        screen.getByText(/An error occurred getting the organization members, please try again later./i)
      ).toBeInTheDocument();
    });
  });
});
