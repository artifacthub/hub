import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mocked } from 'jest-mock';
import ReactRouter, { BrowserRouter as Router } from 'react-router-dom';

import API from '../../api';
import { AppCtx } from '../../context/AppCtx';
import { AHStats, ErrorKind } from '../../types';
import StatsView from './index';
jest.mock('../../api');
jest.mock('./BrushChart', () => () => <div>Chart</div>);
jest.mock('react-apexcharts', () => () => <div>Chart</div>);

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as object),
  useLocation: jest.fn(),
}));

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

    jest.spyOn(ReactRouter, 'useLocation').mockReturnValue({
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
    mocked(API).getAHStats.mockResolvedValue(mockStats);

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
      mocked(API).getAHStats.mockResolvedValue(mockStats);

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
      mocked(API).getAHStats.mockResolvedValue(mockStats);

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
      mocked(API).getAHStats.mockRejectedValue({ kind: ErrorKind.Other });

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
      mocked(API).getAHStats.mockRejectedValue({ kind: ErrorKind.Other, message: 'custom error' });

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
      mocked(API).getAHStats.mockResolvedValue(mockStats);

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
      jest.spyOn(ReactRouter, 'useLocation').mockReturnValue({
        pathname: '',
        search: '',
        hash: '#repositories',
        state: null,
        key: 'key',
      });

      const mockStats = getMockStats('4');
      mocked(API).getAHStats.mockResolvedValue(mockStats);

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
