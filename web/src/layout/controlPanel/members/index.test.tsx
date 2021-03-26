import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { mocked } from 'ts-jest/utils';

import { API } from '../../../api';
import { AppCtx } from '../../../context/AppCtx';
import { ErrorKind, User } from '../../../types';
import MembersSection from './index';
jest.mock('../../../api');

jest.mock('../../../utils/authorizer', () => ({
  check: () => {
    return true;
  },
}));

const getMembers = (fixtureId: string): User[] => {
  return require(`./__fixtures__/index/${fixtureId}.json`) as User[];
};

const onAuthErrorMock = jest.fn();

const defaultProps = {
  onAuthError: onAuthErrorMock,
};

const mockCtx = {
  user: { alias: 'test', email: 'test@test.com' },
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

    const result = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <Router>
          <MembersSection {...defaultProps} />
        </Router>
      </AppCtx.Provider>
    );

    await waitFor(() => {
      expect(API.getOrganizationMembers).toHaveBeenCalledTimes(1);
      expect(result.asFragment()).toMatchSnapshot();
    });
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
    });

    it('displays no data component when no members', async () => {
      const mockMembers = getMembers('4');
      mocked(API).getOrganizationMembers.mockResolvedValue(mockMembers);

      const { getByTestId, getByText } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <MembersSection {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(getByTestId('noData')).toBeInTheDocument();
      });
      expect(getByText('Do you want to add a member?')).toBeInTheDocument();
      expect(getByTestId('addFirstMemberBtn')).toBeInTheDocument();
    });

    it('renders 2 members card', async () => {
      const mockMembers = getMembers('5');
      mocked(API).getOrganizationMembers.mockResolvedValue(mockMembers);

      const { getAllByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <MembersSection {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(getAllByTestId('memberCard')).toHaveLength(2);
      });
    });

    it('renders organization form when add org button is clicked', async () => {
      const mockMembers = getMembers('6');
      mocked(API).getOrganizationMembers.mockResolvedValue(mockMembers);

      const { getByTestId, queryByText } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <MembersSection {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      const addBtn = await waitFor(() => getByTestId('addMemberBtn'));
      expect(addBtn).toBeInTheDocument();

      expect(queryByText('Username')).toBeNull();

      fireEvent.click(addBtn);

      await waitFor(() => {
        expect(queryByText('Username')).toBeInTheDocument();
      });
    });

    it('renders organization form when add org button is clicked', async () => {
      const mockMembers = getMembers('7');
      mocked(API).getOrganizationMembers.mockResolvedValue(mockMembers);

      const { getByTestId, queryByText } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <MembersSection {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      const firstBtn = await waitFor(() => getByTestId('addFirstMemberBtn'));
      expect(queryByText('Username')).toBeNull();
      expect(firstBtn).toBeInTheDocument();

      fireEvent.click(firstBtn);

      await waitFor(() => {
        expect(queryByText('Username')).toBeInTheDocument();
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

      expect(onAuthErrorMock).toHaveBeenCalledTimes(1);
    });

    it('rest API errors', async () => {
      mocked(API).getOrganizationMembers.mockRejectedValue({ kind: ErrorKind.Other });

      const { getByTestId, getByText } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <MembersSection {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => expect(API.getOrganizationMembers).toHaveBeenCalledTimes(1));

      await waitFor(() => {
        expect(getByTestId('noData')).toBeInTheDocument();
        expect(
          getByText(/An error occurred getting the organization members, please try again later./i)
        ).toBeInTheDocument();
      });
    });
  });
});
