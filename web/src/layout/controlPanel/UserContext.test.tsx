import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { mocked } from 'ts-jest/utils';

import { API } from '../../api';
import { AppCtx } from '../../context/AppCtx';
import { Organization } from '../../types';
import UserContext from './UserContext';
jest.mock('../../api');

const getMockOrgs = (fixtureId: string): Organization[] => {
  return require(`./__fixtures__/UserContext/${fixtureId}.json`) as Organization[];
};

const mockCtx = {
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
    controlPanel: {
      selectedOrg: 'test',
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

const mockOrgCtx1 = {
  user: { alias: 'userAlias', email: 'jsmith@email.com' },
  prefs: {
    controlPanel: {
      selectedOrg: 'org',
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

const mockDispatch = jest.fn();

describe('UserContext', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const mockOrgs = getMockOrgs('1');
    mocked(API).getUserOrganizations.mockResolvedValue(mockOrgs);

    const result = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
        <Router>
          <UserContext />
        </Router>
      </AppCtx.Provider>
    );

    await waitFor(() => {
      expect(API.getUserOrganizations).toHaveBeenCalledTimes(1);
      expect(result.asFragment()).toMatchSnapshot();
    });
  });

  describe('Render', () => {
    it('renders component', async () => {
      const mockOrgs = getMockOrgs('2');
      mocked(API).getUserOrganizations.mockResolvedValue(mockOrgs);

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
          <Router>
            <UserContext />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getUserOrganizations).toHaveBeenCalledTimes(1);
      });
    });

    it('displays spinner to get organizations', async () => {
      const mockOrgs = getMockOrgs('3');
      mocked(API).getUserOrganizations.mockResolvedValue(mockOrgs);

      const { getByRole } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
          <Router>
            <UserContext />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(getByRole('status')).toBeTruthy();
      });
    });

    it('displays dropdown with ctx', async () => {
      const mockOrgs = getMockOrgs('4');
      mocked(API).getUserOrganizations.mockResolvedValue(mockOrgs);

      const { getByTestId, getAllByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
          <Router>
            <UserContext />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getUserOrganizations).toHaveBeenCalledTimes(1);
      });

      const ctxBtn = getByTestId('ctxBtn');
      const ctxDropdown = getByTestId('ctxDropdown');

      expect(ctxBtn).toBeInTheDocument();
      expect(ctxDropdown).toBeInTheDocument();
      expect(ctxDropdown).not.toHaveClass('show');

      fireEvent.click(ctxBtn);

      expect(ctxDropdown).toHaveClass('show');

      await waitFor(() => {
        expect(API.getUserOrganizations).toHaveBeenCalledTimes(2);
      });

      expect(getByTestId('userCtxBtn')).toBeInTheDocument();
      expect(getAllByTestId('orgCtxBtn')).toHaveLength(mockOrgs.length);
    });

    it('renders only user ctx when no orgs', async () => {
      const mockOrgs = getMockOrgs('5');
      mocked(API).getUserOrganizations.mockResolvedValue(mockOrgs);

      const { getByTestId, queryAllByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
          <Router>
            <UserContext />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getUserOrganizations).toHaveBeenCalledTimes(1);
        expect(getByTestId('userCtxBtn')).toBeInTheDocument();
        expect(queryAllByTestId('orgCtxBtn')).toHaveLength(0);
      });
    });

    it('calls updateOrg when org ctx button is clicked', async () => {
      const mockOrgs = getMockOrgs('4');
      mocked(API).getUserOrganizations.mockResolvedValue(mockOrgs);

      const { getByTestId, getAllByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
          <Router>
            <UserContext />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getUserOrganizations).toHaveBeenCalledTimes(1);
      });

      const ctxBtn = getByTestId('ctxBtn');
      const ctxDropdown = getByTestId('ctxDropdown');

      expect(ctxBtn).toBeInTheDocument();
      expect(ctxDropdown).toBeInTheDocument();
      expect(ctxDropdown).not.toHaveClass('show');

      fireEvent.click(ctxBtn);

      expect(ctxDropdown).toHaveClass('show');

      expect(API.getUserOrganizations).toHaveBeenCalledTimes(2);

      expect(getByTestId('userCtxBtn')).toBeInTheDocument();

      const orgBtns = getAllByTestId('orgCtxBtn');
      expect(orgBtns).toHaveLength(mockOrgs.length);

      fireEvent.click(orgBtns[0]);

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledTimes(1);
        expect(mockDispatch).toHaveBeenCalledWith({ name: 'test', type: 'updateOrg' });
      });

      expect(ctxDropdown).not.toHaveClass('show');
    });

    it('calls unselectOrg when user ctx button is clicked', async () => {
      const mockOrgs = getMockOrgs('4');
      mocked(API).getUserOrganizations.mockResolvedValue(mockOrgs);

      const { getByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockOrgCtx, dispatch: mockDispatch }}>
          <Router>
            <UserContext />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getUserOrganizations).toHaveBeenCalledTimes(1);
      });

      const ctxBtn = getByTestId('ctxBtn');
      fireEvent.click(ctxBtn);

      expect(API.getUserOrganizations).toHaveBeenCalledTimes(2);

      const userCtxBtn = getByTestId('userCtxBtn');
      fireEvent.click(userCtxBtn);

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledTimes(1);
        expect(mockDispatch).toHaveBeenCalledWith({ type: 'unselectOrg' });
      });
    });

    it('calls unselectOrg when selectedOrg is not in the list', async () => {
      const mockOrgs = getMockOrgs('4');
      mocked(API).getUserOrganizations.mockResolvedValue(mockOrgs);

      render(
        <AppCtx.Provider value={{ ctx: mockOrgCtx1, dispatch: mockDispatch }}>
          <Router>
            <UserContext />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getUserOrganizations).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledTimes(1);
        expect(mockDispatch).toHaveBeenCalledWith({ type: 'unselectOrg' });
      });
    });
  });
});
