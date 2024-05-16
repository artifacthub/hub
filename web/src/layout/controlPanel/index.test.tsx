import { render, screen, waitFor } from '@testing-library/react';
import { mocked } from 'jest-mock';
import ReactRouter, { BrowserRouter as Router } from 'react-router-dom';

import API from '../../api';
import { AppCtx } from '../../context/AppCtx';
import ControlPanelView from './index';
jest.mock('../../api');
jest.mock('./repositories', () => () => <div />);

const mockUseNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as object),
  useSearchParams: () => jest.fn(),
  useParams: jest.fn(),
  useNavigate: () => mockUseNavigate,
}));

const mockCtx = {
  user: { alias: 'test', email: 'test@test.com', passwordSet: true },
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
  user: { alias: 'test', email: 'test@test.com', passwordSet: true },
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
  beforeEach(() => {
    jest.spyOn(ReactRouter, 'useParams').mockReturnValue({ section: 'repositories' });
    jest.spyOn(ReactRouter, 'useSearchParams').mockReturnValue([
      {
        get: (): null => {
          return null;
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders correctly', async () => {
    mocked(API).searchRepositories.mockResolvedValue({ items: [], paginationTotalCount: '0' });
    const { asFragment } = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
        <Router>
          <ControlPanelView />
        </Router>
      </AppCtx.Provider>
    );
    await waitFor(() => expect(asFragment()).toMatchSnapshot());
  });

  it('calls navigate when section is undefined', async () => {
    jest.spyOn(ReactRouter, 'useParams').mockReturnValue({ section: 'non-exist' });

    mocked(API).searchRepositories.mockResolvedValue({ items: [], paginationTotalCount: '0' });
    render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
        <Router>
          <ControlPanelView />
        </Router>
      </AppCtx.Provider>
    );

    await waitFor(() => {
      expect(mockUseNavigate).toHaveBeenCalledTimes(1);
      expect(mockUseNavigate).toHaveBeenCalledWith('/control-panel/repositories', { replace: true });
    });
  });

  it('renders 3 sections on user context', async () => {
    mocked(API).searchRepositories.mockResolvedValue({ items: [], paginationTotalCount: '0' });
    render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: mockDispatch }}>
        <Router>
          <ControlPanelView />
        </Router>
      </AppCtx.Provider>
    );

    const tabs = await screen.findAllByRole('tab');
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveTextContent('Repositories');
    expect(tabs[1]).toHaveTextContent('Organizations');
    expect(tabs[2]).toHaveTextContent('Settings');
  });

  it('renders 3 sections on org context', async () => {
    mocked(API).searchRepositories.mockResolvedValue({ items: [], paginationTotalCount: '0' });
    render(
      <AppCtx.Provider value={{ ctx: mockCtxOrgSelected, dispatch: mockDispatch }}>
        <Router>
          <ControlPanelView />
        </Router>
      </AppCtx.Provider>
    );

    const tabs = await screen.findAllByRole('tab');
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveTextContent('Repositories');
    expect(tabs[1]).toHaveTextContent('Members');
    expect(tabs[2]).toHaveTextContent('Settings');
  });

  it('calls updateOrg from ctx when organization name is defined', async () => {
    jest.spyOn(ReactRouter, 'useSearchParams').mockReturnValue([
      {
        get: (name: string): string | null => {
          switch (name) {
            case 'org-name':
              return 'org';
            case 'repo-name':
              return 'repo';
            default:
              return null;
          }
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any);

    mocked(API).searchRepositories.mockResolvedValue({ items: [], paginationTotalCount: '0' });
    render(
      <AppCtx.Provider value={{ ctx: mockCtxOrgSelected, dispatch: mockDispatch }}>
        <Router>
          <ControlPanelView />
        </Router>
      </AppCtx.Provider>
    );

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'updateOrg', name: 'org' });
    });
  });

  it('calls updateOrg from ctx when organization userAlias is empty', async () => {
    jest.spyOn(ReactRouter, 'useSearchParams').mockReturnValue([
      {
        get: (name: string): string | null => {
          switch (name) {
            case 'org-name':
              return 'org';
            case 'repo-name':
              return 'repo';
            default:
              return null;
          }
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any);
    mocked(API).searchRepositories.mockResolvedValue({ items: [], paginationTotalCount: '0' });
    render(
      <AppCtx.Provider value={{ ctx: mockCtxOrgSelected, dispatch: mockDispatch }}>
        <Router>
          <ControlPanelView />
        </Router>
      </AppCtx.Provider>
    );

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'updateOrg', name: 'org' });
    });
  });

  it('calls unselectOrg from ctx when user alias is defined', async () => {
    jest.spyOn(ReactRouter, 'useSearchParams').mockReturnValue([
      {
        get: (name: string): string | null => {
          switch (name) {
            case 'user-alias':
              return 'test';
            case 'repo-name':
              return 'repo';
            default:
              return null;
          }
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any);
    mocked(API).searchRepositories.mockResolvedValue({ items: [], paginationTotalCount: '0' });
    render(
      <AppCtx.Provider value={{ ctx: mockCtxOrgSelected, dispatch: mockDispatch }}>
        <Router>
          <ControlPanelView />
        </Router>
      </AppCtx.Provider>
    );

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'unselectOrg' });
    });
  });

  it('calls unselectOrg from ctx when user alias is defined and org name is empty', async () => {
    jest.spyOn(ReactRouter, 'useSearchParams').mockReturnValue([
      {
        get: (name: string): string | null => {
          switch (name) {
            case 'user-alias':
              return 'test';
            case 'org-name':
              return '';
            case 'repo-name':
              return 'repo';
            default:
              return null;
          }
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any);
    mocked(API).searchRepositories.mockResolvedValue({ items: [], paginationTotalCount: '0' });
    render(
      <AppCtx.Provider value={{ ctx: mockCtxOrgSelected, dispatch: mockDispatch }}>
        <Router>
          <ControlPanelView />
        </Router>
      </AppCtx.Provider>
    );

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'unselectOrg' });
    });
  });

  it('calls navigate when org name is defined, but not repo name', async () => {
    jest.spyOn(ReactRouter, 'useSearchParams').mockReturnValue([
      {
        get: (name: string): string | null => {
          switch (name) {
            case 'org-name':
              return 'org';
            default:
              return null;
          }
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any);
    mocked(API).searchRepositories.mockResolvedValue({ items: [], paginationTotalCount: '0' });
    render(
      <AppCtx.Provider value={{ ctx: mockCtxOrgSelected, dispatch: mockDispatch }}>
        <Router>
          <ControlPanelView />
        </Router>
      </AppCtx.Provider>
    );

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'updateOrg', name: 'org' });

      expect(mockUseNavigate).toHaveBeenCalledTimes(1);
      expect(mockUseNavigate).toHaveBeenCalledWith({ search: '' }, { replace: true });
    });
  });
});
