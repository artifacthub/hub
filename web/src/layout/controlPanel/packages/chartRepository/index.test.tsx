import { fireEvent, render, screen, wait, waitForElement, waitForElementToBeRemoved } from '@testing-library/react';
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

const defaultProps = {
  onAuthError: jest.fn(),
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

    expect(result.asFragment()).toMatchSnapshot();
    await wait();
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
      expect(API.getChartRepositories).toHaveBeenCalledTimes(1);
      await wait();
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
      await wait();
    });

    it('displays no data component when no chart repositories', async () => {
      const mockChartRepository = getMockChartRepository('4');
      mocked(API).getChartRepositories.mockResolvedValue(mockChartRepository);

      render(
        <Router>
          <ChartRepository {...defaultProps} />
        </Router>
      );

      const noData = await waitForElement(() => screen.getByTestId('noData'));

      expect(noData).toBeInTheDocument();
      expect(screen.getByText('Add your first chart repository!')).toBeInTheDocument();
      expect(screen.getByTestId('addFirstRepoBtn')).toBeInTheDocument();

      await wait();
    });

    it('renders list with 3 chart repositories', async () => {
      const mockChartRepository = getMockChartRepository('5');
      mocked(API).getChartRepositories.mockResolvedValue(mockChartRepository);

      render(
        <Router>
          <ChartRepository {...defaultProps} />
        </Router>
      );

      const list = await waitForElement(() => screen.getByTestId('chartRepoList'));

      expect(list).toBeInTheDocument();
      expect(screen.getAllByTestId('chartRepoCard')).toHaveLength(3);

      await wait();
    });

    it('calls getChartRepositories to click Refresh button', async () => {
      const mockChartRepository = getMockChartRepository('6');
      mocked(API).getChartRepositories.mockResolvedValue(mockChartRepository);

      render(
        <Router>
          <ChartRepository {...defaultProps} />
        </Router>
      );

      const refreshBtn = await waitForElement(() => screen.getByTestId('refreshRepoBtn'));
      expect(refreshBtn).toBeInTheDocument();
      fireEvent.click(refreshBtn);
      expect(API.getChartRepositories).toHaveBeenCalledTimes(2);

      await wait();
    });
  });
});
