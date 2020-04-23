import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { mocked } from 'ts-jest/utils';

import { API } from '../../api';
import { AppCtx } from '../../context/AppCtx';
import ControlPanelView from './index';
jest.mock('../../api');
jest.mock('./packages', () => () => <div />);

const mockHistoryPush = jest.fn();
const mockHistoryReplace = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({
    push: mockHistoryPush,
    replace: mockHistoryReplace,
  }),
}));

const mockCtx = {
  user: { alias: 'test', email: 'test@test.com' },
  prefs: {
    controlPanel: {},
    search: { limit: 25 },
  },
};

const mockCtxOrgSelected = {
  user: { alias: 'test', email: 'test@test.com' },
  prefs: {
    controlPanel: { selectedOrg: 'orgTest' },
    search: { limit: 25 },
  },
};

describe('ControlPanelView', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders correctly', async () => {
    mocked(API).getChartRepositories.mockResolvedValue([]);
    const result = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <Router>
          <ControlPanelView />
        </Router>
      </AppCtx.Provider>
    );
    expect(result.asFragment()).toMatchSnapshot();
    await waitFor(() => {});
  });

  it('calls history replace when section is undefined', async () => {
    mocked(API).getChartRepositories.mockResolvedValue([]);
    render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <Router>
          <ControlPanelView />
        </Router>
      </AppCtx.Provider>
    );

    await waitFor(() => screen.getAllByRole('main'));
    expect(mockHistoryReplace).toHaveBeenCalledTimes(1);
    expect(mockHistoryReplace).toHaveBeenCalledWith('/control-panel/packages');

    await waitFor(() => {});
  });

  it('renders 3 sections on user context', async () => {
    mocked(API).getChartRepositories.mockResolvedValue([]);
    render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <Router>
          <ControlPanelView section="packages" />
        </Router>
      </AppCtx.Provider>
    );

    await waitFor(() => screen.getAllByRole('main'));
    const tabs = screen.getAllByRole('tab');
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveTextContent('Packages');
    expect(tabs[1]).toHaveTextContent('Organizations');
    expect(tabs[2]).toHaveTextContent('Settings');
    await waitFor(() => {});
  });

  it('renders 3 sections on org context', async () => {
    mocked(API).getChartRepositories.mockResolvedValue([]);
    render(
      <AppCtx.Provider value={{ ctx: mockCtxOrgSelected, dispatch: jest.fn() }}>
        <Router>
          <ControlPanelView section="packages" />
        </Router>
      </AppCtx.Provider>
    );

    await waitFor(() => screen.getAllByRole('main'));
    const tabs = screen.getAllByRole('tab');
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveTextContent('Packages');
    expect(tabs[1]).toHaveTextContent('Members');
    expect(tabs[2]).toHaveTextContent('Settings');
    await waitFor(() => {});
  });
});
