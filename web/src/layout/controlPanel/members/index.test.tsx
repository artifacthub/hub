import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { mocked } from 'ts-jest/utils';

import { API } from '../../../api';
import { AppCtx } from '../../../context/AppCtx';
import { User } from '../../../types';
import MembersSection from './index';
jest.mock('../../../api');

const getMembers = (fixtureId: string): User[] => {
  return require(`./__fixtures__/index/${fixtureId}.json`) as User[];
};

const defaultProps = {
  onAuthError: jest.fn(),
};

const mockCtx = {
  user: { alias: 'test', email: 'test@test.com' },
  prefs: {
    controlPanel: {
      selectedOrg: 'orgTest',
    },
    search: { limit: 25 },
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

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <MembersSection {...defaultProps} />
          </Router>
        </AppCtx.Provider>
      );

      const noData = await waitFor(() => screen.getByTestId('noData'));

      expect(noData).toBeInTheDocument();
      expect(screen.getByText('Do you want to add a member?')).toBeInTheDocument();
      expect(screen.getByTestId('addFirstMemberBtn')).toBeInTheDocument();

      await waitFor(() => {});
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

      const cards = await waitFor(() => screen.getAllByTestId('memberCard'));
      expect(cards).toHaveLength(2);

      await waitFor(() => {});
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

      const addBtn = await waitFor(() => screen.getByTestId('addMemberBtn'));
      expect(addBtn).toBeInTheDocument();

      expect(screen.queryByText('Username')).not.toBeInTheDocument();

      fireEvent.click(addBtn);
      expect(screen.queryByText('Username')).toBeInTheDocument();

      await waitFor(() => {});
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

      const firstBtn = await waitFor(() => screen.getByTestId('addFirstMemberBtn'));
      expect(screen.queryByText('Username')).not.toBeInTheDocument();
      expect(firstBtn).toBeInTheDocument();

      fireEvent.click(firstBtn);
      expect(screen.queryByText('Username')).toBeInTheDocument();

      await waitFor(() => {});
    });
  });
});
