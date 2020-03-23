import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import prepareQueryString from '../../utils/prepareQueryString';
import SearchBar from './SearchBar';

const mockHistoryPush = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({
    push: mockHistoryPush,
  }),
}));

let keyDownHandler: any;

describe('SearchBar', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders correctly', () => {
    const { asFragment } = render(<SearchBar text="test" size="big" isSearching={false} />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders loading when is searching', () => {
    const { getByTestId } = render(<SearchBar text="test" size="big" isSearching />);
    expect(getByTestId('searchBarSpinning')).toBeInTheDocument();
  });

  it('renders loading when is searching', () => {
    const { getByTestId, getByPlaceholderText } = render(<SearchBar text="test" size="big" isSearching />);

    const spinning = getByTestId('searchBarSpinning');
    const input = getByPlaceholderText('Search packages') as HTMLInputElement;

    expect(spinning).toBeInTheDocument();
    expect(input.disabled).toBeTruthy();
  });

  it('focuses input when clean button is clicked', () => {
    const { getByTestId, getByPlaceholderText } = render(<SearchBar text="test" size="big" isSearching={false} />);

    const cleanBtn = getByTestId('cleanBtn');
    const input = getByPlaceholderText('Search packages') as HTMLInputElement;

    expect(input.value).toBe('test');
    fireEvent.click(cleanBtn);
    expect(input).toBe(document.activeElement);
    expect(input.value).toBe('');
  });

  it('updates value on change input', () => {
    const { getByPlaceholderText } = render(<SearchBar text="test" size="big" isSearching={false} />);

    const input = getByPlaceholderText('Search packages') as HTMLInputElement;

    expect(input.value).toBe('test');
    fireEvent.change(input, { target: { value: 'new test' } });
    expect(input.value).toBe('new test');
  });

  describe('History push', () => {
    beforeEach(() => {
      const mockListener = jest.fn((e, handler) => {
        if (e === 'keydown') {
          keyDownHandler = handler;
        }
      });
      window.addEventListener = mockListener;
    });

    it('calls on Enter key press', () => {
      const { getByPlaceholderText } = render(<SearchBar text="test" size="big" isSearching={false} />);

      const input = getByPlaceholderText('Search packages') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'testing' } });
      keyDownHandler({ keyCode: 13, preventDefault: jest.fn() });
      expect(input).not.toBe(document.activeElement);
      expect(mockHistoryPush).toHaveBeenCalledTimes(1);
      expect(mockHistoryPush).toHaveBeenCalledWith({
        pathname: '/search',
        search: prepareQueryString({
          text: 'testing',
          pageNumber: 1,
          filters: {},
          deprecated: false,
        }),
      });
    });

    it('does not call history push on Enter key press when text is empty', () => {
      const { getByPlaceholderText } = render(<SearchBar size="big" isSearching={false} />);

      const input = getByPlaceholderText('Search packages') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '' } });
      keyDownHandler({ keyCode: 13, preventDefault: jest.fn() });
      expect(mockHistoryPush).not.toHaveBeenCalled();
    });
  });
});
