import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mocked } from 'jest-mock';

import API from '../../api';
import { SearchResults } from '../../types';
import alertDispatcher from '../../utils/alertDispatcher';
import SearchPackages from './SearchPackages';
jest.mock('../../api');
jest.mock('../../utils/alertDispatcher');

const getMockSearch = (fixtureId: string): SearchResults => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`./__fixtures__/SearchPackages/${fixtureId}.json`) as SearchResults;
};

Object.defineProperty(HTMLElement.prototype, 'scroll', { configurable: true, value: jest.fn() });

const mockOnSelection = jest.fn();

const defaultProps = {
  label: 'test',
  disabledPackages: [],
  onSelection: mockOnSelection,
};

describe('SearchPackages', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<SearchPackages {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', async () => {
      const mockSearch = getMockSearch('1');
      mocked(API).searchPackages.mockResolvedValue(mockSearch);

      render(<SearchPackages {...defaultProps} />);

      const input = screen.getByRole('textbox', { name: 'Search packages' });
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('');

      await userEvent.type(input, 'ing');

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(1);
      });

      expect(await screen.findAllByRole('button')).toHaveLength(2);
    });

    it('selects package', async () => {
      const mockSearch = getMockSearch('1');
      mocked(API).searchPackages.mockResolvedValue(mockSearch);

      render(<SearchPackages {...defaultProps} />);

      const input = screen.getByRole('textbox', { name: 'Search packages' });
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('');

      await userEvent.type(input, 'ing');

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(1);
      });

      const packages = await screen.findAllByTestId('packageItem');
      await userEvent.click(packages[0]);

      await waitFor(() => {
        expect(mockOnSelection).toHaveBeenCalledTimes(1);
        expect(mockOnSelection).toHaveBeenCalledWith(mockSearch.packages![0]);
      });
    });

    it('when searchPackage fails', async () => {
      mocked(API).searchPackages.mockRejectedValue('');

      render(<SearchPackages {...defaultProps} />);

      const input = screen.getByRole('textbox', { name: 'Search packages' });
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('');

      await userEvent.type(input, 'ing');

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
        expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
          type: 'danger',
          message: 'An error occurred searching packages, please try again later.',
        });
      });
    });

    it('renders disabled package', async () => {
      const mockSearch = getMockSearch('2');
      mocked(API).searchPackages.mockResolvedValue(mockSearch);

      render(<SearchPackages {...defaultProps} disabledPackages={[mockSearch.packages![0].packageId]} />);

      const input = screen.getByRole('textbox', { name: 'Search packages' });
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('');

      await userEvent.type(input, 'ing');

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(1);
      });

      const firstPackage = await screen.findAllByTestId('packageItem');
      expect(firstPackage[0]).toHaveClass('disabledCell');
      await userEvent.click(firstPackage[0]);

      await waitFor(() => {
        expect(mockOnSelection).toHaveBeenCalledTimes(0);
      });
    });

    it('calls again searchPackages', async () => {
      const mockSearch = getMockSearch('3');
      mocked(API)
        .searchPackages.mockResolvedValue({ packages: [], facets: [], paginationTotalCount: '0' })
        .mockResolvedValueOnce(mockSearch);

      render(<SearchPackages {...defaultProps} />);

      const input = screen.getByRole('textbox', { name: 'Search packages' });
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('');

      await userEvent.type(input, 'ing');

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(1);
      });

      expect(await screen.findAllByTestId('packageItem')).toHaveLength(2);

      await userEvent.type(input, '1{enter}');

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(2);
      });

      expect(
        await screen.findByText(/We can't seem to find any packages that match your search for/)
      ).toBeInTheDocument();
    });
  });
});
