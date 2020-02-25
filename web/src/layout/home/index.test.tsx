import React from 'react';
import { render, screen, wait, waitForElement, waitForElementToBeRemoved } from '@testing-library/react';
import { mocked } from 'ts-jest/utils';
import { BrowserRouter as Router } from 'react-router-dom';
import { API } from '../../api';
import HomeView from './index';
import { Stats } from '../../types';
jest.mock('../../api');

jest.mock('./PackagesUpdates', () => () => <div />);

const getMockStats = (fixtureId: string): Stats => {
  return require(`./__fixtures__/index/${fixtureId}.json`) as Stats;
};

const defaultProps = {
  isSearching: true,
};

describe('Package index', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const mockStats = getMockStats('1');
    mocked(API).getStats.mockResolvedValue(mockStats);

    const result = render(
      <Router>
        <HomeView {...defaultProps} />
      </Router>
    );
    expect(result.asFragment()).toMatchSnapshot();
    await wait();
  });

  describe('Render', () => {
    it('renders component', async () => {
      const mockStats = getMockStats('2');
      mocked(API).getStats.mockResolvedValue(mockStats);

      render(
        <Router>
          <HomeView {...defaultProps} />
        </Router>
      );
      expect(API.getStats).toHaveBeenCalledTimes(1);
      await wait();
    });

    it('removes loading spinner after getting package', async () => {
      const mockStats = getMockStats('3');
      mocked(API).getStats.mockResolvedValue(mockStats);

      const props = {
        ...defaultProps,
        isSearching: true,
      };
      render(
        <Router>
          <HomeView {...props} />
        </Router>
      );

      const spinner = await waitForElementToBeRemoved(() =>
        screen.getAllByRole('status'),
      );

      expect(spinner).toBeTruthy();
      await wait();
    });

    it('renders dash symbol when results are 0', async () => {
      const mockStats = getMockStats('4');
      mocked(API).getStats.mockResolvedValue(mockStats);

      const props = {
        ...defaultProps,
        isSearching: true,
      };
      render(
        <Router>
          <HomeView {...props} />
        </Router>
      );

      const emptyStats = await waitForElement(() =>
        screen.getAllByText('-'),
      );

      expect(emptyStats).toHaveLength(2);
      await wait();
    });

    it('renders project definition', async () => {
      const mockStats = getMockStats('5');
      mocked(API).getStats.mockResolvedValue(mockStats);

      render(
        <Router>
          <HomeView {...defaultProps} />
        </Router>
      );

      const heading = await waitForElement(() =>
        screen.getByRole('heading'),
      );

      expect(heading).toBeInTheDocument();
      expect(heading.innerHTML).toBe('Find, install and publish<br>Kubernetes packages');
      await wait();
    });


    it('renders CNCF info', async () => {
      const mockStats = getMockStats('6');
      mocked(API).getStats.mockResolvedValue(mockStats);

      render(
        <Router>
          <HomeView {...defaultProps} />
        </Router>
      );

      const CNCFInfo = await waitForElement(() =>
        screen.getByTestId('CNCFInfo'),
      );

      expect(CNCFInfo).toBeInTheDocument();
      expect(CNCFInfo.textContent).toBe('CNCF Hub aspires to be a Cloud Native Computing Foundation sandbox project.');
      await wait();
    });
  });
});
