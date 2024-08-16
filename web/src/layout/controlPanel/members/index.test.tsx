import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mocked } from 'jest-mock';
import { BrowserRouter as Router } from 'react-router-dom';

import API from '../../../api';
import { AppCtx } from '../../../context/AppCtx';
import { ErrorKind } from '../../../types';
import MembersSection from './index';
jest.mock('../../../api');

jest.mock('../../../utils/authorizer', () => ({
  check: () => {
    return true;
  },
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
  });

  it('creates snapshot', async () => {
    const mockMembers = getMembers('1');
    mocked(API).getOrganizationMembers.mockResolvedValue(mockMembers);

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
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', async () => {
      const mockMembers = getMembers('2');
      mocked(API).getOrganizationMembers.mockResolvedValue(mockMembers);

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
    });

    it('displays no data component when no members', async () => {
      const mockMembers = getMembers('4');
      mocked(API).getOrganizationMembers.mockResolvedValue(mockMembers);

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
      mocked(API).getOrganizationMembers.mockResolvedValue(mockMembers);

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <MembersSection {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      expect(await screen.findAllByTestId('memberCard')).toHaveLength(2);
    });

    it('renders organization form when add org button is clicked', async () => {
      const mockMembers = getMembers('6');
      mocked(API).getOrganizationMembers.mockResolvedValue(mockMembers);

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
      mocked(API).getOrganizationMembers.mockResolvedValue(mockMembers);

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

      mocked(API).getOrganizationMembers.mockResolvedValue(mockMembers).mockResolvedValueOnce({
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
      mocked(API).getOrganizationMembers.mockRejectedValue({
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
      mocked(API).getOrganizationMembers.mockRejectedValue({ kind: ErrorKind.Other });

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
