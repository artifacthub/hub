import { render, screen, wait, waitForElement, waitForElementToBeRemoved } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { mocked } from 'ts-jest/utils';

import { API } from '../../api';
import { Package } from '../../types';
import StarredPackagesView from './index';
jest.mock('../../api');

const mockHistoryPush = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({
    push: mockHistoryPush,
  }),
}));

const getMockStarredPackages = (fixtureId: string): Package[] => {
  return require(`./__fixtures__/index/${fixtureId}.json`) as Package[];
};

describe('StarredPackagesView', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders correctly', async () => {
    const mockPackages = getMockStarredPackages('1');
    mocked(API).getStarredByUser.mockResolvedValue(mockPackages);

    const result = render(
      <Router>
        <StarredPackagesView />
      </Router>
    );
    expect(result.asFragment()).toMatchSnapshot();
    await wait();
  });

  describe('Render', () => {
    it('renders component', async () => {
      const mockPackages = getMockStarredPackages('2');
      mocked(API).getStarredByUser.mockResolvedValue(mockPackages);

      render(
        <Router>
          <StarredPackagesView />
        </Router>
      );
      expect(API.getStarredByUser).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Your starred packages')).toBeInTheDocument();
      await wait();
    });

    it('removes loading spinner after getting package', async () => {
      const mockPackages = getMockStarredPackages('3');
      mocked(API).getStarredByUser.mockResolvedValue(mockPackages);

      render(
        <Router>
          <StarredPackagesView />
        </Router>
      );

      const spinner = await waitForElementToBeRemoved(() => screen.getAllByRole('status'));

      expect(spinner).toBeTruthy();
      await wait();
    });
  });

  describe('Packages', () => {
    it('renders 5 packages', async () => {
      const mockPackages = getMockStarredPackages('4');
      mocked(API).getStarredByUser.mockResolvedValue(mockPackages);

      render(
        <Router>
          <StarredPackagesView />
        </Router>
      );
      const packages = await waitForElement(() => screen.getAllByRole('listitem'));

      expect(packages).toHaveLength(5);
      await wait();
    });

    it('displays no data component when no packages', async () => {
      const mockPackages = getMockStarredPackages('5');
      mocked(API).getStarredByUser.mockResolvedValue(mockPackages);

      render(
        <Router>
          <StarredPackagesView />
        </Router>
      );

      const noData = await waitForElement(() => screen.getByTestId('noData'));

      expect(noData).toBeInTheDocument();
      expect(noData).toHaveTextContent('You have not starred any package yet');

      await wait();
    });

    it('calls history push to load login modal when user is not signed in', async () => {
      mocked(API).getStarredByUser.mockRejectedValue({ statusText: 'ErrLoginRedirect' });

      render(
        <Router>
          <StarredPackagesView />
        </Router>
      );

      await waitForElement(() => screen.getByRole('main'));

      expect(mockHistoryPush).toHaveBeenCalledTimes(1);
      expect(mockHistoryPush).toHaveBeenCalledWith('/login?redirect=/user/packages/starred');
      await wait();
    });
  });
});
