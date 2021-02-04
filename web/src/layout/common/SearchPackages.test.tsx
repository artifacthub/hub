import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { mocked } from 'ts-jest/utils';

import { API } from '../../api';
import { SearchResults } from '../../types';
import alertDispatcher from '../../utils/alertDispatcher';
import SearchPackages from './SearchPackages';
jest.mock('../../api');
jest.mock('../../utils/alertDispatcher');

const getMockSearch = (fixtureId: string): SearchResults => {
  return require(`./__fixtures__/SearchPackages/${fixtureId}.json`) as SearchResults;
};

const mockOnSelection = jest.fn();

const defaultProps = {
  disabledPackages: [],
  onSelection: mockOnSelection,
};

describe('SearchPackages', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(<SearchPackages {...defaultProps} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', async () => {
      const mockSearch = getMockSearch('1');
      mocked(API).searchPackages.mockResolvedValue(mockSearch);

      const { getByTestId, getAllByRole } = render(<SearchPackages {...defaultProps} />);

      expect(getByTestId('searchIconBtn')).toBeInTheDocument();

      const input = getByTestId('searchPackagesInput');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('');

      fireEvent.change(input, { target: { value: 'testing' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 13, charCode: 13 });

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(1);
      });

      expect(getAllByRole('button')).toHaveLength(3);
    });

    it('selects package', async () => {
      const mockSearch = getMockSearch('1');
      mocked(API).searchPackages.mockResolvedValue(mockSearch);

      const { getByTestId, getAllByTestId } = render(<SearchPackages {...defaultProps} />);

      const input = getByTestId('searchPackagesInput');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('');

      fireEvent.change(input, { target: { value: 'testing' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 13, charCode: 13 });

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(1);
      });

      const packages = getAllByTestId('packageItem');
      fireEvent.click(packages[0]);

      expect(mockOnSelection).toHaveBeenCalledTimes(1);
      expect(mockOnSelection).toHaveBeenCalledWith(mockSearch.data!.packages![0]);
    });

    it('when searchPackage fails', async () => {
      mocked(API).searchPackages.mockRejectedValue('');

      const { getByTestId } = render(<SearchPackages {...defaultProps} />);

      const input = getByTestId('searchPackagesInput');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('');

      fireEvent.change(input, { target: { value: 'testing' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 13, charCode: 13 });

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(1);
      });

      expect(alertDispatcher.postAlert).toHaveBeenCalledTimes(1);
      expect(alertDispatcher.postAlert).toHaveBeenCalledWith({
        type: 'danger',
        message: 'An error occurred searching packages, please try again later.',
      });
    });

    it('renders disabled package', async () => {
      const mockSearch = getMockSearch('2');
      mocked(API).searchPackages.mockResolvedValue(mockSearch);

      const { getByTestId, getAllByTestId } = render(
        <SearchPackages {...defaultProps} disabledPackages={[mockSearch.data!.packages![0].packageId]} />
      );

      const input = getByTestId('searchPackagesInput');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('');

      fireEvent.change(input, { target: { value: 'testing' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 13, charCode: 13 });

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(1);
      });

      const firstPackage = getAllByTestId('packageItem')[0];
      expect(firstPackage).toHaveClass('disabledCell');
      fireEvent.click(firstPackage);

      expect(mockOnSelection).toHaveBeenCalledTimes(0);
    });

    it('cleans packages list after changing filled input', async () => {
      const mockSearch = getMockSearch('3');
      mocked(API).searchPackages.mockResolvedValue(mockSearch);

      const { getByTestId, getAllByTestId } = render(<SearchPackages {...defaultProps} />);

      const input = getByTestId('searchPackagesInput');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('');

      fireEvent.change(input, { target: { value: 'testing' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 13, charCode: 13 });

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(1);
      });

      expect(getAllByTestId('packageItem')).toHaveLength(2);

      fireEvent.change(input, { target: { value: 'testing1' } });

      waitFor(() => {
        expect(getAllByTestId('packageItem')).toHaveLength(0);
      });
    });
  });

  describe('searchIconBtn', () => {
    it('is disabled when input if empty', () => {
      const { getByTestId } = render(<SearchPackages {...defaultProps} />);

      const btn = getByTestId('searchIconBtn');
      expect(btn).toBeDisabled();
    });

    it('works when input is not empty', async () => {
      const mockSearch = getMockSearch('4');
      mocked(API).searchPackages.mockResolvedValue(mockSearch);

      const { getByTestId } = render(<SearchPackages {...defaultProps} />);

      const btn = getByTestId('searchIconBtn');
      expect(btn).toBeDisabled();

      const input = getByTestId('searchPackagesInput');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('');

      fireEvent.change(input, { target: { value: 'testing' } });

      expect(btn).not.toBeDisabled();

      fireEvent.click(btn);

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(1);
        expect(btn).toBeDisabled();
      });

      expect(btn).not.toBeDisabled();
    });
  });
});
