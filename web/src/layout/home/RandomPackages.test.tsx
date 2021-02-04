import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { mocked } from 'ts-jest/utils';

import { API } from '../../api';
import { Package } from '../../types';
import RandomPackages from './RandomPackages';
jest.mock('../../api');

const getMockRandomPackages = (fixtureId: string): Package[] => {
  return require(`./__fixtures__/RandomPackages/${fixtureId}.json`) as Package[];
};

describe('RandomPackages', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const mockPackages = getMockRandomPackages('1');
    mocked(API).getRandomPackages.mockResolvedValue(mockPackages);

    const result = render(
      <Router>
        <RandomPackages />
      </Router>
    );

    await waitFor(() => {
      expect(API.getRandomPackages).toHaveBeenCalledTimes(1);
      expect(result.asFragment()).toMatchSnapshot();
    });
  });

  describe('Render', () => {
    it('renders component', async () => {
      const mockPackages = getMockRandomPackages('2');
      mocked(API).getRandomPackages.mockResolvedValue(mockPackages);

      render(
        <Router>
          <RandomPackages />
        </Router>
      );

      await waitFor(() => {
        expect(API.getRandomPackages).toHaveBeenCalledTimes(1);
      });
    });

    it('does not render component when packages list is empty', async () => {
      const mockPackages = getMockRandomPackages('3');
      mocked(API).getRandomPackages.mockResolvedValue(mockPackages);

      const { queryByTestId, container } = render(
        <Router>
          <RandomPackages />
        </Router>
      );

      await waitFor(() => {
        expect(API.getRandomPackages).toHaveBeenCalledTimes(1);
      });

      expect(queryByTestId('randomPackagesList')).toBeNull();
      expect(container).toBeEmptyDOMElement();
    });
  });
});
