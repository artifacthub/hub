import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { mocked } from 'ts-jest/utils';

import { API } from '../../api';
import { AppCtx } from '../../context/AppCtx';
import { AHStats, ErrorKind } from '../../types';
import StatsView from './index';
jest.mock('../../api');
jest.mock('react-apexcharts', () => () => <div>Chart</div>);

const getMockStats = (fixtureId: string): AHStats => {
  return require(`./__fixtures__/index/${fixtureId}.json`) as AHStats;
};

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

describe('StatsView', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const mockStats = getMockStats('1');
    mocked(API).getAHStats.mockResolvedValue(mockStats);

    const result = render(
      <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
        <StatsView />
      </AppCtx.Provider>
    );

    await waitFor(() => {
      expect(API.getAHStats).toHaveBeenCalledTimes(1);
      expect(result.asFragment()).toMatchSnapshot();
    });
  });

  describe('Render', () => {
    it('renders component', async () => {
      const mockStats = getMockStats('2');
      mocked(API).getAHStats.mockResolvedValue(mockStats);

      const { getByText, getAllByText } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <StatsView />
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getAHStats).toHaveBeenCalledTimes(1);
      });
      expect(getByText('Artifact Hub Stats')).toBeInTheDocument();
      expect(getByText('Report generated at:')).toBeInTheDocument();
      expect(getByText('Packages and releases')).toBeInTheDocument();
      expect(getByText('Repositories')).toBeInTheDocument();
      expect(getByText('Organizations and users')).toBeInTheDocument();
      expect(getAllByText('Chart')).toHaveLength(7);
    });

    it('renders only 2 sections', async () => {
      const mockStats = getMockStats('3');
      mocked(API).getAHStats.mockResolvedValue(mockStats);

      const { getByText, getAllByText, queryByText } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <StatsView />
        </AppCtx.Provider>
      );

      await waitFor(() => {
        expect(API.getAHStats).toHaveBeenCalledTimes(1);
      });
      expect(getByText('Packages and releases')).toBeInTheDocument();
      expect(getByText('Repositories')).toBeInTheDocument();
      expect(queryByText('Organizations and users')).toBeNull();
      expect(getAllByText('Chart')).toHaveLength(5);
    });
  });

  describe('when getAHStats call fails', () => {
    it('renders default error message', async () => {
      mocked(API).getAHStats.mockRejectedValue({ kind: ErrorKind.Other });

      const { getByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <StatsView />
        </AppCtx.Provider>
      );

      const noData = await waitFor(() => getByTestId('noData'));
      expect(noData).toBeInTheDocument();
      expect(noData).toHaveTextContent(/An error occurred getting Artifact Hub stats, please try again later./i);
    });

    it('renders custom error message', async () => {
      mocked(API).getAHStats.mockRejectedValue({ kind: ErrorKind.Other, message: 'custom error' });

      const { getByTestId } = render(
        <AppCtx.Provider value={{ ctx: mockCtx, dispatch: jest.fn() }}>
          <StatsView />
        </AppCtx.Provider>
      );

      const noData = await waitFor(() => getByTestId('noData'));
      expect(noData).toBeInTheDocument();
      expect(noData).toHaveTextContent(
        /An error occurred getting Artifact Hub stats: custom errorIf this error persists, please create an issue here/i
      );
    });
  });
});
