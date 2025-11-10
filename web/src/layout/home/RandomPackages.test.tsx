import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import { vi } from 'vitest';

import API from '../../api';
import { Package } from '../../types';
import RandomPackages from './RandomPackages';
vi.mock('../../api');

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
    vi.mocked(API).getRandomPackages.mockResolvedValue(mockPackages);

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
      vi.mocked(API).getRandomPackages.mockResolvedValue(mockPackages);

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
      vi.mocked(API).getRandomPackages.mockResolvedValue(mockPackages);

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
