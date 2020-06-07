import { render, waitFor } from '@testing-library/react';
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

    await waitFor(() => {
      expect(result.asFragment()).toMatchSnapshot();
    });
  });

  describe('Render', () => {
    it('renders component', async () => {
      const mockPackages = getMockStarredPackages('2');
      mocked(API).getStarredByUser.mockResolvedValue(mockPackages);

      const { getByText } = render(
        <Router>
          <StarredPackagesView />
        </Router>
      );

      await waitFor(() => {
        expect(API.getStarredByUser).toHaveBeenCalledTimes(1);
      });
      expect(getByText('Your starred packages')).toBeInTheDocument();
    });
  });

  describe('Packages', () => {
    it('renders 5 packages', async () => {
      const mockPackages = getMockStarredPackages('4');
      mocked(API).getStarredByUser.mockResolvedValue(mockPackages);

      const { getAllByRole } = render(
        <Router>
          <StarredPackagesView />
        </Router>
      );
      const packages = await waitFor(() => getAllByRole('listitem'));

      expect(packages).toHaveLength(5);
      await waitFor(() => {});
    });

    it('displays no data component when no packages', async () => {
      const mockPackages = getMockStarredPackages('5');
      mocked(API).getStarredByUser.mockResolvedValue(mockPackages);

      const { getByTestId } = render(
        <Router>
          <StarredPackagesView />
        </Router>
      );

      const noData = await waitFor(() => getByTestId('noData'));

      expect(noData).toBeInTheDocument();
      expect(noData).toHaveTextContent('You have not starred any package yet');

      await waitFor(() => {});
    });

    it('renders error message when getStarredByUser call fails with not 401', async () => {
      mocked(API).getStarredByUser.mockRejectedValue({ statusText: 'another error' });

      const { getByTestId } = render(
        <Router>
          <StarredPackagesView />
        </Router>
      );

      const noData = await waitFor(() => getByTestId('noData'));

      expect(noData).toBeInTheDocument();
      expect(noData).toHaveTextContent(/An error occurred getting your starred packages, please try again later/i);

      await waitFor(() => {});
    });

    it('calls history push to load login modal when user is not signed in', async () => {
      mocked(API).getStarredByUser.mockRejectedValue({ statusText: 'ErrLoginRedirect' });

      const { getByRole } = render(
        <Router>
          <StarredPackagesView />
        </Router>
      );

      await waitFor(() => getByRole('main'));

      expect(mockHistoryPush).toHaveBeenCalledTimes(1);
      expect(mockHistoryPush).toHaveBeenCalledWith('/login?redirect=/packages/starred');
      await waitFor(() => {});
    });
  });
});
