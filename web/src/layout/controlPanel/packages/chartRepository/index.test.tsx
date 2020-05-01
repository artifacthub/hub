import { fireEvent, render, screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { mocked } from 'ts-jest/utils';

import { API } from '../../../../api';
import { ChartRepository as ChartRepo } from '../../../../types';
import ChartRepository from './index';
jest.mock('../../../../api');

const getMockChartRepository = (fixtureId: string): ChartRepo[] => {
  return require(`./__fixtures__/index/${fixtureId}.json`) as ChartRepo[];
};

const onAuthErrorMock = jest.fn();

const defaultProps = {
  onAuthError: onAuthErrorMock,
};

describe('Chart repository index', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const mockChartRepository = getMockChartRepository('1');
    mocked(API).getChartRepositories.mockResolvedValue(mockChartRepository);

    const result = render(
      <Router>
        <ChartRepository {...defaultProps} />
      </Router>
    );

    await waitFor(() => {
      expect(result.asFragment()).toMatchSnapshot();
    });
  });

  describe('Render', () => {
    it('renders component', async () => {
      const mockChartRepository = getMockChartRepository('2');
      mocked(API).getChartRepositories.mockResolvedValue(mockChartRepository);

      render(
        <Router>
          <ChartRepository {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getChartRepositories).toHaveBeenCalledTimes(1);
      });
    });

    it('removes loading spinner after getting chart repositories', async () => {
      const mockChartRepository = getMockChartRepository('3');
      mocked(API).getChartRepositories.mockResolvedValue(mockChartRepository);

      render(
        <Router>
          <ChartRepository {...defaultProps} />
        </Router>
      );

      const spinner = await waitForElementToBeRemoved(() => screen.getByRole('status'));

      expect(spinner).toBeTruthy();
      await waitFor(() => {});
    });

    it('displays no data component when no chart repositories', async () => {
      const mockChartRepository = getMockChartRepository('4');
      mocked(API).getChartRepositories.mockResolvedValue(mockChartRepository);

      render(
        <Router>
          <ChartRepository {...defaultProps} />
        </Router>
      );

      const noData = await waitFor(() => screen.getByTestId('noData'));

      expect(noData).toBeInTheDocument();
      expect(screen.getByText('Add your first chart repository!')).toBeInTheDocument();
      expect(screen.getByTestId('addFirstRepoBtn')).toBeInTheDocument();

      await waitFor(() => {});
    });

    it('renders list with 3 chart repositories', async () => {
      const mockChartRepository = getMockChartRepository('5');
      mocked(API).getChartRepositories.mockResolvedValue(mockChartRepository);

      render(
        <Router>
          <ChartRepository {...defaultProps} />
        </Router>
      );

      const list = await waitFor(() => screen.getByTestId('chartRepoList'));

      expect(list).toBeInTheDocument();
      expect(screen.getAllByTestId('chartRepoCard')).toHaveLength(3);

      await waitFor(() => {});
    });

    it('calls getChartRepositories to click Refresh button', async () => {
      const mockChartRepository = getMockChartRepository('6');
      mocked(API).getChartRepositories.mockResolvedValue(mockChartRepository);

      render(
        <Router>
          <ChartRepository {...defaultProps} />
        </Router>
      );

      const refreshBtn = await waitFor(() => screen.getByTestId('refreshRepoBtn'));
      expect(refreshBtn).toBeInTheDocument();
      fireEvent.click(refreshBtn);
      expect(API.getChartRepositories).toHaveBeenCalledTimes(2);

      await waitFor(() => {});
    });
  });

  describe('when getChartRepositories fails', () => {
    it('on 401 error', async () => {
      mocked(API).getChartRepositories.mockRejectedValue({ statusText: 'ErrLoginRedirect' });

      render(
        <Router>
          <ChartRepository {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getChartRepositories).toHaveBeenCalledTimes(1);
      });

      expect(onAuthErrorMock).toHaveBeenCalledTimes(1);
    });

    it('on error different to 401', async () => {
      mocked(API).getChartRepositories.mockRejectedValue({ status: 500 });

      render(
        <Router>
          <ChartRepository {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getChartRepositories).toHaveBeenCalledTimes(1);
      });

      const noData = screen.getByTestId('noData');
      expect(noData).toBeInTheDocument();
      expect(noData).toHaveTextContent(/An error occurred getting the chart repositories, please try again later/i);
    });
  });
});
