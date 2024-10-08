import { render, screen, waitFor } from '@testing-library/react';
import { mocked } from 'jest-mock';
import { BrowserRouter as Router } from 'react-router-dom';

import API from '../../api';
import { Package } from '../../types';
import RandomPackages from './RandomPackages';
jest.mock('../../api');

const getMockRandomPackages = (fixtureId: string): Package[] => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`./__fixtures__/RandomPackages/${fixtureId}.json`) as Package[];
};

describe('RandomPackages', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const mockPackages = getMockRandomPackages('1');
    mocked(API).getRandomPackages.mockResolvedValue(mockPackages);

    const { asFragment } = render(
      <Router>
        <RandomPackages />
      </Router>
    );

    await waitFor(() => {
      expect(API.getRandomPackages).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText('Explore and discover packages')).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
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

      expect(await screen.findByText('Explore and discover packages')).toBeInTheDocument();
    });

    it('renders default message when list is empty', async () => {
      const mockPackages = getMockRandomPackages('3');
      mocked(API).getRandomPackages.mockResolvedValue(mockPackages);

      render(
        <Router>
          <RandomPackages />
        </Router>
      );

      await waitFor(() => {
        expect(API.getRandomPackages).toHaveBeenCalledTimes(1);
      });

      expect(
        await screen.findByText(
          "It looks like you haven't added any content yet. You can add repositories from the control panel once you log in."
        )
      ).toBeInTheDocument();
    });
  });
});
