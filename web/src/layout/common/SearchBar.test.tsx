import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { mocked } from 'ts-jest/utils';

import API from '../../api';
import { SearchResults } from '../../types';
import { prepareQueryString } from '../../utils/prepareQueryString';
import SearchBar from './SearchBar';
jest.mock('../../api');

const mockHistoryPush = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as {}),
  useHistory: () => ({
    push: mockHistoryPush,
  }),
}));

const getMockSearch = (fixtureId: string): SearchResults => {
  return require(`./__fixtures__/SearchBar/${fixtureId}.json`) as SearchResults;
};

const defaultProps = {
  tsQueryWeb: 'test',
  size: 'big' as 'big' | 'normal',
  openTips: false,
  setOpenTips: jest.fn(),
};

describe('SearchBar', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<SearchBar {...defaultProps} isSearching={false} />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders loading when is searching', () => {
    const { getByTestId } = render(<SearchBar {...defaultProps} isSearching />);
    expect(getByTestId('searchBarSpinning')).toBeInTheDocument();
  });

  it('renders loading when is searching', () => {
    const { getByTestId, getByPlaceholderText } = render(<SearchBar {...defaultProps} isSearching />);

    const spinning = getByTestId('searchBarSpinning');
    const input = getByPlaceholderText('Search packages') as HTMLInputElement;

    expect(spinning).toBeInTheDocument();
    expect(input.disabled).toBeTruthy();
  });

  it('focuses input when clean button is clicked', () => {
    const { getByTestId, getByPlaceholderText } = render(<SearchBar {...defaultProps} isSearching={false} />);

    const cleanBtn = getByTestId('cleanBtn');
    const input = getByPlaceholderText('Search packages') as HTMLInputElement;

    expect(input.value).toBe('test');
    fireEvent.click(cleanBtn);
    expect(input).toBe(document.activeElement);
    expect(input.value).toBe('');
  });

  it('updates value on change input', () => {
    const { getByPlaceholderText } = render(<SearchBar {...defaultProps} isSearching={false} />);

    const input = getByPlaceholderText('Search packages') as HTMLInputElement;

    expect(input.value).toBe('test');
    fireEvent.change(input, { target: { value: 'new test' } });
    expect(input.value).toBe('new test');
  });

  describe('search packages', () => {
    it('display search results', async () => {
      const mockSearch = getMockSearch('1');
      mocked(API).searchPackages.mockResolvedValue(mockSearch);

      const { getByPlaceholderText, getByRole, getAllByRole } = render(
        <SearchBar {...defaultProps} isSearching={false} />
      );

      const input = getByPlaceholderText('Search packages') as HTMLInputElement;

      expect(input.value).toBe('test');
      input.focus();
      fireEvent.change(input, { target: { value: 'new test' } });

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(1);
      });

      expect(getByRole('listbox')).toBeInTheDocument();
      expect(getAllByRole('option')).toHaveLength(3);
    });

    it("doesn't display results when input is not focused", async () => {
      const mockSearch = getMockSearch('2');
      mocked(API).searchPackages.mockResolvedValue(mockSearch);

      const { getByPlaceholderText, queryByRole } = render(<SearchBar {...defaultProps} isSearching={false} />);

      const input = getByPlaceholderText('Search packages') as HTMLInputElement;

      expect(input.value).toBe('test');
      input.focus();
      fireEvent.change(input, { target: { value: 'new test' } });
      input.blur();

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(1);
        input.blur();
      });

      expect(queryByRole('listbox')).toBeNull();
    });
  });

  describe('History push', () => {
    it('calls on Enter key press', () => {
      const { getByPlaceholderText } = render(<SearchBar {...defaultProps} isSearching={false} />);

      const input = getByPlaceholderText('Search packages') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'testing' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 13 });
      expect(input).not.toBe(document.activeElement);
      expect(mockHistoryPush).toHaveBeenCalledTimes(1);
      expect(mockHistoryPush).toHaveBeenCalledWith({
        pathname: '/packages/search',
        search: prepareQueryString({
          tsQueryWeb: 'testing',
          pageNumber: 1,
        }),
      });
    });

    it('calls history push on Enter key press when text is empty with undefined text', () => {
      const { getByPlaceholderText } = render(
        <SearchBar {...defaultProps} tsQueryWeb={undefined} isSearching={false} />
      );

      const input = getByPlaceholderText('Search packages') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 13 });
      expect(mockHistoryPush).toHaveBeenCalledTimes(1);
      expect(mockHistoryPush).toHaveBeenCalledWith({
        pathname: '/packages/search',
        search: prepareQueryString({
          tsQueryWeb: undefined,
          pageNumber: 1,
        }),
      });
    });

    it('forces focus to click search bar icon', () => {
      const { getByTestId, getByPlaceholderText } = render(
        <SearchBar {...defaultProps} tsQueryWeb={undefined} isSearching={false} />
      );

      const icon = getByTestId('searchBarIcon');
      fireEvent.click(icon);

      waitFor(() => {
        expect(getByPlaceholderText('Search packages')).toHaveFocus();
      });
    });
  });
});
