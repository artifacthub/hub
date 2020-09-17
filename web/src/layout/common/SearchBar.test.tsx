import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import prepareQueryString from '../../utils/prepareQueryString';
import SearchBar from './SearchBar';

const mockHistoryPush = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as {}),
  useHistory: () => ({
    push: mockHistoryPush,
  }),
}));

describe('SearchBar', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<SearchBar tsQueryWeb="test" size="big" isSearching={false} />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders loading when is searching', () => {
    const { getByTestId } = render(<SearchBar tsQueryWeb="test" size="big" isSearching />);
    expect(getByTestId('searchBarSpinning')).toBeInTheDocument();
  });

  it('renders loading when is searching', () => {
    const { getByTestId, getByPlaceholderText } = render(<SearchBar tsQueryWeb="test" size="big" isSearching />);

    const spinning = getByTestId('searchBarSpinning');
    const input = getByPlaceholderText('Search packages') as HTMLInputElement;

    expect(spinning).toBeInTheDocument();
    expect(input.disabled).toBeTruthy();
  });

  it('focuses input when clean button is clicked', () => {
    const { getByTestId, getByPlaceholderText } = render(
      <SearchBar tsQueryWeb="test" size="big" isSearching={false} />
    );

    const cleanBtn = getByTestId('cleanBtn');
    const input = getByPlaceholderText('Search packages') as HTMLInputElement;

    expect(input.value).toBe('test');
    fireEvent.click(cleanBtn);
    expect(input).toBe(document.activeElement);
    expect(input.value).toBe('');
  });

  it('updates value on change input', () => {
    const { getByPlaceholderText } = render(<SearchBar tsQueryWeb="test" size="big" isSearching={false} />);

    const input = getByPlaceholderText('Search packages') as HTMLInputElement;

    expect(input.value).toBe('test');
    fireEvent.change(input, { target: { value: 'new test' } });
    expect(input.value).toBe('new test');
  });

  describe('History push', () => {
    it('calls on Enter key press', () => {
      const { getByPlaceholderText } = render(<SearchBar tsQueryWeb="test" size="big" isSearching={false} />);

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
          filters: {},
        }),
      });
    });

    it('calls history push on Enter key press when text is empty with undefined text', () => {
      const { getByPlaceholderText } = render(<SearchBar size="big" isSearching={false} />);

      const input = getByPlaceholderText('Search packages') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 13 });
      expect(mockHistoryPush).toHaveBeenCalledTimes(1);
      expect(mockHistoryPush).toHaveBeenCalledWith({
        pathname: '/packages/search',
        search: prepareQueryString({
          tsQueryWeb: undefined,
          pageNumber: 1,
          filters: {},
        }),
      });
    });

    it('forces focus to click search bar icon', () => {
      const { getByTestId, getByPlaceholderText } = render(<SearchBar size="big" isSearching={false} />);

      const icon = getByTestId('searchBarIcon');
      fireEvent.click(icon);

      waitFor(() => {
        expect(getByPlaceholderText('Search packages')).toHaveFocus();
      });
    });
  });
});
