import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { mocked } from 'ts-jest/utils';

import { API } from '../../api';
import { PackagesUpdatesList } from '../../types';
import PackagesUpdates from './PackagesUpdates';
jest.mock('../../api');

const getMockPackagesUpdates = (fixtureId: string): PackagesUpdatesList => {
  return require(`./__fixtures__/packagesUpdates/${fixtureId}.json`) as PackagesUpdatesList;
};

describe('Package index', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const mockPackagesUpdates = getMockPackagesUpdates('1');
    mocked(API).getPackagesUpdates.mockResolvedValue(mockPackagesUpdates);

    const result = render(
      <Router>
        <PackagesUpdates />
      </Router>
    );

    await waitFor(() => {
      expect(result.asFragment()).toMatchSnapshot();
    });
  });

  describe('Render', () => {
    it('renders component', async () => {
      const mockPackagesUpdates = getMockPackagesUpdates('2');
      mocked(API).getPackagesUpdates.mockResolvedValue(mockPackagesUpdates);

      render(
        <Router>
          <PackagesUpdates />
        </Router>
      );

      await waitFor(() => {
        expect(API.getPackagesUpdates).toHaveBeenCalledTimes(1);
      });
    });

    it('renders only latest packages list when recently updated packages list is empty', async () => {
      const mockPackagesUpdates = getMockPackagesUpdates('4');
      mocked(API).getPackagesUpdates.mockResolvedValue(mockPackagesUpdates);

      render(
        <Router>
          <PackagesUpdates />
        </Router>
      );

      const latest = await waitFor(() => screen.getByTestId('latestPackagesList'));

      expect(latest).toBeInTheDocument();
      expect(screen.queryByTestId('recentlyUpdatedPackagesList')).toBeNull();
      await waitFor(() => {});
    });

    it('renders only recently updated packages list when latest packages list is empty', async () => {
      const mockPackagesUpdates = getMockPackagesUpdates('5');
      mocked(API).getPackagesUpdates.mockResolvedValue(mockPackagesUpdates);

      render(
        <Router>
          <PackagesUpdates />
        </Router>
      );

      const recentlyUpdated = await waitFor(() => screen.getByTestId('recentlyUpdatedPackagesList'));

      expect(screen.queryByTestId('latestPackagesList')).toBeNull();
      expect(recentlyUpdated).toBeInTheDocument();
      await waitFor(() => {});
    });
  });

  it('does not render component when packages updates lists are empty', async () => {
    const mockPackagesUpdates = getMockPackagesUpdates('6');
    mocked(API).getPackagesUpdates.mockResolvedValue(mockPackagesUpdates);

    const { queryByTestId, container } = render(
      <Router>
        <PackagesUpdates />
      </Router>
    );

    await waitFor(() => {
      expect(API.getPackagesUpdates).toHaveBeenCalledTimes(1);
    });

    expect(queryByTestId('latestPackagesList')).toBeNull();
    expect(queryByTestId('recentlyUpdatedPackagesList')).toBeNull();
    expect(container).toBeEmpty();
  });
});
