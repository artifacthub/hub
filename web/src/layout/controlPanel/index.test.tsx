import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { mocked } from 'ts-jest/utils';

import { API } from '../../api';
import { AppCtx } from '../../context/AppCtx';
import ControlPanelView from './index';
jest.mock('../../api');
jest.mock('./repositories', () => () => <div />);

const mockHistoryPush = jest.fn();
const mockHistoryReplace = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as {}),
  useHistory: () => ({
    push: mockHistoryPush,
    replace: mockHistoryReplace,
  }),
}));

const mockCtx = {
  user: { alias: 'test', email: 'test@test.com' },
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

const mockCtxOrgSelected = {
  user: { alias: 'test', email: 'test@test.com' },
  prefs: {
    controlPanel: { selectedOrg: 'orgTest' },
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

describe('ControlPanelView', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders correctly', async () => {
    mocked(API).getRepositories.mockResolvedValue([]);
    const result = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
        <Router>
          <ControlPanelView />
        </Router>
      </AppCtx.Provider>
    );
    await waitFor(() => expect(result.asFragment()).toMatchSnapshot());
  });

  it('calls history replace when section is undefined', async () => {
    mocked(API).getRepositories.mockResolvedValue([]);
    render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
        <Router>
          <ControlPanelView />
        </Router>
      </AppCtx.Provider>
    );

    await waitFor(() => {
      expect(mockHistoryReplace).toHaveBeenCalledTimes(1);
      expect(mockHistoryReplace).toHaveBeenCalledWith('/control-panel/repositories');
    });
  });

  it('renders 3 sections on user context', async () => {
    mocked(API).getRepositories.mockResolvedValue([]);
    const { getByRole, getAllByRole } = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
        <Router>
          <ControlPanelView section="repositories" />
        </Router>
      </AppCtx.Provider>
    );

    await waitFor(() => {
      const tabs = getAllByRole('tab');
      expect(getByRole('tablist')).toBeInTheDocument();
      expect(tabs).toHaveLength(3);
      expect(tabs[0]).toHaveTextContent('Repositories');
      expect(tabs[1]).toHaveTextContent('Organizations');
      expect(tabs[2]).toHaveTextContent('Settings');
    });
  });

  it('renders 3 sections on org context', async () => {
    mocked(API).getRepositories.mockResolvedValue([]);
    const { getByRole, getAllByRole } = render(
      <AppCtx.Provider value={{ ctx: mockCtxOrgSelected, dispatch: mockDispatch }}>
        <Router>
          <ControlPanelView section="repositories" />
        </Router>
      </AppCtx.Provider>
    );

    await waitFor(() => {
      const tabs = getAllByRole('tab');
      expect(getByRole('tablist')).toBeInTheDocument();
      expect(tabs).toHaveLength(3);
      expect(tabs[0]).toHaveTextContent('Repositories');
      expect(tabs[1]).toHaveTextContent('Members');
      expect(tabs[2]).toHaveTextContent('Settings');
    });
  });

  it('calls updateOrg from ctx when organization name is defined', async () => {
    mocked(API).getRepositories.mockResolvedValue([]);
    render(
      <AppCtx.Provider value={{ ctx: mockCtxOrgSelected, dispatch: mockDispatch }}>
        <Router>
          <ControlPanelView section="repositories" organizationName="org" repoName="repo" />
        </Router>
      </AppCtx.Provider>
    );

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'updateOrg', name: 'org' });
    });
  });

  it('calls updateOrg from ctx when organization userAlias is empty', async () => {
    mocked(API).getRepositories.mockResolvedValue([]);
    render(
      <AppCtx.Provider value={{ ctx: mockCtxOrgSelected, dispatch: mockDispatch }}>
        <Router>
          <ControlPanelView section="repositories" organizationName="org" userAlias="" repoName="repo" />
        </Router>
      </AppCtx.Provider>
    );

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'updateOrg', name: 'org' });
    });
  });

  it('calls unselectOrg from ctx when user alias is defined', async () => {
    mocked(API).getRepositories.mockResolvedValue([]);
    render(
      <AppCtx.Provider value={{ ctx: mockCtxOrgSelected, dispatch: mockDispatch }}>
        <Router>
          <ControlPanelView section="repositories" userAlias="test" repoName="repo" />
        </Router>
      </AppCtx.Provider>
    );

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'unselectOrg' });
    });
  });

  it('calls unselectOrg from ctx when user alias is defined and org name is empty', async () => {
    mocked(API).getRepositories.mockResolvedValue([]);
    render(
      <AppCtx.Provider value={{ ctx: mockCtxOrgSelected, dispatch: mockDispatch }}>
        <Router>
          <ControlPanelView section="repositories" userAlias="test" organizationName="" repoName="repo" />
        </Router>
      </AppCtx.Provider>
    );

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'unselectOrg' });
    });
  });

  it('calls history replace when org name is defined, but not repo name', async () => {
    mocked(API).getRepositories.mockResolvedValue([]);
    render(
      <AppCtx.Provider value={{ ctx: mockCtxOrgSelected, dispatch: mockDispatch }}>
        <Router>
          <ControlPanelView section="repositories" organizationName="org" />
        </Router>
      </AppCtx.Provider>
    );

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'updateOrg', name: 'org' });

      expect(mockHistoryReplace).toHaveBeenCalledTimes(1);
      expect(mockHistoryReplace).toHaveBeenCalledWith({ search: '' });
    });
  });
});
