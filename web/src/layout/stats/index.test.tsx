import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReactRouter, { BrowserRouter as Router } from 'react-router-dom';
import { vi } from 'vitest';

import API from '../../api';
import { AppCtx } from '../../context/AppCtx';
import { AHStats, ErrorKind } from '../../types';
import StatsView from './index';
vi.mock('../../api');
vi.mock('./BrushChart', () => ({
  __esModule: true,
  default: () => <div>Chart</div>,
}));
vi.mock('react-apexcharts', () => ({
  __esModule: true,
  default: () => <div>Chart</div>,
}));

const { useLocationMock } = vi.hoisted(() => ({
  useLocationMock: vi.fn(),
}));

vi.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom') as typeof ReactRouter;
  return {
    __esModule: true,
    ...actual,
    default: actual,
    useLocation: useLocationMock,
  };
});

const getMockStats = (fixtureId: string): AHStats => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`./__fixtures__/index/${fixtureId}.json`) as AHStats;
};

const scrollIntoViewMock = jest.fn();
window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

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

describe('StatsView', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let dateNowSpy: any;

  beforeEach(() => {
    dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => 1639468828000);

    useLocationMock.mockReturnValue({
      pathname: '',
      search: '',
      hash: '',
      state: null,
      key: 'key',
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    dateNowSpy.mockRestore();
  });

  it('creates snapshot', async () => {
    const mockStats = getMockStats('1');
    vi.mocked(API).getAHStats.mockResolvedValue(mockStats);

    const { asFragment } = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <Router>
          <StatsView />
        </Router>
      </AppCtx.Provider>
    );

    await waitFor(() => {
      expect(API.getAHStats).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getAllByText('Chart')).toHaveLength(9);
    });
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', async () => {
      const mockStats = getMockStats('2');
      vi.mocked(API).getAHStats.mockResolvedValue(mockStats);

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <StatsView />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getAHStats).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(screen.getAllByText('Chart')).toHaveLength(9);
      });

      expect(screen.getByText('Report generated at:')).toBeInTheDocument();
      expect(screen.getByText('Usage')).toBeInTheDocument();
      expect(screen.getByText('Packages and releases')).toBeInTheDocument();
      expect(screen.getByText('Repositories')).toBeInTheDocument();
      expect(screen.getByText('Organizations and users')).toBeInTheDocument();
    });

    it('renders only 3 sections', async () => {
      const mockStats = getMockStats('3');
      vi.mocked(API).getAHStats.mockResolvedValue(mockStats);

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <StatsView />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getAHStats).toHaveBeenCalledTimes(1);
      });
      expect(await screen.findByText('Usage')).toBeInTheDocument();
      expect(screen.getByText('Packages and releases')).toBeInTheDocument();
      expect(screen.getByText('Repositories')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText('Organizations and users')).toBeNull();
      });
      expect(screen.getAllByText('Chart')).toHaveLength(7);
    });
  });

  describe('when getAHStats call fails', () => {
    it('renders default error message', async () => {
      vi.mocked(API).getAHStats.mockRejectedValue({ kind: ErrorKind.Other });

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <StatsView />
          </Router>
        </AppCtx.Provider>
      );

      const noData = await screen.findByRole('alert');
      expect(noData).toBeInTheDocument();
      expect(noData).toHaveTextContent(/An error occurred getting/i);
    });

    it('renders custom error message', async () => {
      vi.mocked(API).getAHStats.mockRejectedValue({ kind: ErrorKind.Other, message: 'custom error' });

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <StatsView />
          </Router>
        </AppCtx.Provider>
      );

      const noData = await screen.findByRole('alert');
      expect(noData).toBeInTheDocument();
      expect(noData).toHaveTextContent(/stats: custom errorIf this error persists, please create an issue here/i);
    });
  });

  describe('Anchors', () => {
    it('calls scrollIntoView when click on anchor section', async () => {
      const mockStats = getMockStats('4');
      vi.mocked(API).getAHStats.mockResolvedValue(mockStats);

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <StatsView />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getAHStats).toHaveBeenCalledTimes(1);
      });

      const anchors = await screen.findAllByRole('button');
      await userEvent.click(anchors[0]);

      expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
    });

    it('calls scrollIntoView when hash is defined to load component', async () => {
      useLocationMock.mockReturnValue({
        pathname: '',
        search: '',
        hash: '#repositories',
        state: null,
        key: 'key',
      });

      const mockStats = getMockStats('4');
      vi.mocked(API).getAHStats.mockResolvedValue(mockStats);

      render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <Router>
            <StatsView />
          </Router>
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getAHStats).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
      });

      const anchors = await screen.findAllByRole('button');
      await userEvent.click(anchors[0]);

      await waitFor(() => {
        expect(scrollIntoViewMock).toHaveBeenCalledTimes(2);
      });
    });
  });
});
