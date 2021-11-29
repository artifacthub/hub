import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import { mocked } from 'ts-jest/utils';

import API from '../../api';
import { ErrorKind } from '../../types';
import StarredPackagesView from './index';
jest.mock('../../api');

const mockHistoryPush = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as {}),
  useHistory: () => ({
    push: mockHistoryPush,
    replace: jest.fn(),
  }),
}));

const getMockStarredPackages = (fixtureId: string) => {
  return require(`./__fixtures__/index/${fixtureId}.json`);
};

describe('StarredPackagesView', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const mockPackages = getMockStarredPackages('1');
    mocked(API).getStarredByUser.mockResolvedValue(mockPackages);

    const { asFragment } = render(
      <Router>
        <StarredPackagesView />
      </Router>
    );

    await waitFor(() => {
      expect(API.getStarredByUser).toHaveBeenCalledTimes(1);
      expect(asFragment()).toMatchSnapshot();
    });
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

      await waitFor(() => {
        expect(API.getStarredByUser).toHaveBeenCalledTimes(1);
      });
      expect(screen.getByText('Your starred packages')).toBeInTheDocument();
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

      const packages = await screen.findAllByRole('listitem');
      expect(packages).toHaveLength(5);
    });

    it('displays no data component when no packages', async () => {
      const mockPackages = getMockStarredPackages('5');
      mocked(API).getStarredByUser.mockResolvedValue(mockPackages);

      render(
        <Router>
          <StarredPackagesView />
        </Router>
      );

      const noData = await screen.findByRole('alert');
      expect(noData).toBeInTheDocument();
      expect(noData).toHaveTextContent('You have not starred any package yet');
    });

    it('loads first page when not packages in a different one', async () => {
      const mockPackages = getMockStarredPackages('5');

      mocked(API).getStarredByUser.mockResolvedValue(mockPackages).mockResolvedValueOnce({
        items: [],
        paginationTotalCount: '5',
      });

      render(
        <Router>
          <StarredPackagesView activePage="2" />
        </Router>
      );

      await waitFor(() => {
        expect(API.getStarredByUser).toHaveBeenCalledTimes(2);
        expect(API.getStarredByUser).toHaveBeenCalledWith({ limit: 10, offset: 10 });
        expect(API.getStarredByUser).toHaveBeenLastCalledWith({ limit: 10, offset: 0 });
      });
    });

    it('renders error message when getStarredByUser call fails with not unauthorized error', async () => {
      mocked(API).getStarredByUser.mockRejectedValue({ kind: ErrorKind.Other });

      render(
        <Router>
          <StarredPackagesView />
        </Router>
      );

      const noData = await screen.findByRole('alert');
      expect(noData).toBeInTheDocument();
      expect(noData).toHaveTextContent(/An error occurred getting your starred packages, please try again later./i);
    });

    it('calls history push to load login modal when user is not signed in', async () => {
      mocked(API).getStarredByUser.mockRejectedValue({
        kind: ErrorKind.Unauthorized,
      });

      render(
        <Router>
          <StarredPackagesView />
        </Router>
      );

      await waitFor(() => {
        expect(mockHistoryPush).toHaveBeenCalledTimes(1);
        expect(mockHistoryPush).toHaveBeenCalledWith('/?modal=login&redirect=/packages/starred');
      });
    });
  });
});
