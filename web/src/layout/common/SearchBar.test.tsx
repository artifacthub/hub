import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mocked } from 'jest-mock';
import { BrowserRouter as Router } from 'react-router-dom';

import API from '../../api';
import { SearchResults } from '../../types';
import { prepareQueryString } from '../../utils/prepareQueryString';
import SearchBar from './SearchBar';
jest.mock('../../api');

const mockUseNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as object),
  useNavigate: () => mockUseNavigate,
}));

const getMockSearch = (fixtureId: string): SearchResults => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
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
    const { asFragment } = render(
      <Router>
        <SearchBar {...defaultProps} isSearching={false} />
      </Router>
    );
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders loading when is searching', () => {
    render(
      <Router>
        <SearchBar {...defaultProps} isSearching />
      </Router>
    );
    expect(screen.getByTestId('searchBarSpinning')).toBeInTheDocument();
  });

  it('renders loading when is searching', () => {
    render(
      <Router>
        <SearchBar {...defaultProps} isSearching />
      </Router>
    );

    const spinning = screen.getByTestId('searchBarSpinning');
    const input = screen.getByPlaceholderText('Search packages') as HTMLInputElement;

    expect(spinning).toBeInTheDocument();
    expect(input.disabled).toBeTruthy();
  });

  it('focuses input when clean button is clicked', async () => {
    render(
      <Router>
        <SearchBar {...defaultProps} isSearching={false} />
      </Router>
    );

    const cleanBtn = screen.getByRole('button', { name: 'Close' });
    const input = screen.getByPlaceholderText('Search packages') as HTMLInputElement;

    expect(input.value).toBe('test');
    await userEvent.click(cleanBtn);
    expect(input).toBe(document.activeElement);
    expect(input.value).toBe('');
  });

  it('updates value on change input', async () => {
    render(
      <Router>
        <SearchBar {...defaultProps} isSearching={false} />
      </Router>
    );

    const input = screen.getByPlaceholderText('Search packages') as HTMLInputElement;

    expect(input.value).toBe('test');
    await userEvent.type(input, 'ing');
    expect(input.value).toBe('testing');

    await waitFor(() => {
      expect(API.searchPackages).toHaveBeenCalledTimes(1);
    });
  });

  describe('search packages', () => {
    it('display search results', async () => {
      const mockSearch = getMockSearch('1');
      mocked(API).searchPackages.mockResolvedValue(mockSearch);

      render(
        <Router>
          <SearchBar {...defaultProps} isSearching={false} />
        </Router>
      );

      const input = screen.getByPlaceholderText('Search packages') as HTMLInputElement;

      expect(input.value).toBe('test');
      input.focus();
      await userEvent.type(input, 'ing');

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(1);
      });

      expect(await screen.findByRole('listbox')).toBeInTheDocument();
      expect(screen.getAllByRole('option')).toHaveLength(3);
    });

    it("doesn't display results when input is not focused", async () => {
      const mockSearch = getMockSearch('2');
      mocked(API).searchPackages.mockResolvedValue(mockSearch);

      render(
        <Router>
          <SearchBar {...defaultProps} isSearching={false} />
        </Router>
      );

      const input = screen.getByPlaceholderText('Search packages') as HTMLInputElement;

      expect(input.value).toBe('test');
      input.focus();
      await userEvent.type(input, 'ing');
      input.blur();

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(1);
        input.blur();
      });

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).toBeNull();
      });
    });
  });

  describe('History push', () => {
    it('calls on Enter key press', async () => {
      render(
        <Router>
          <SearchBar {...defaultProps} isSearching={false} />
        </Router>
      );

      const input = screen.getByPlaceholderText('Search packages') as HTMLInputElement;
      await userEvent.type(input, 'ing{enter}');
      expect(input).not.toBe(document.activeElement);
      expect(mockUseNavigate).toHaveBeenCalledTimes(1);
      expect(mockUseNavigate).toHaveBeenCalledWith({
        pathname: '/packages/search',
        search: prepareQueryString({
          tsQueryWeb: 'testing',
          pageNumber: 1,
        }),
      });
    });

    it('calls navigate on Enter key press when text is empty with undefined text', async () => {
      render(
        <Router>
          <SearchBar {...defaultProps} tsQueryWeb={undefined} isSearching={false} />
        </Router>
      );

      const input = screen.getByPlaceholderText('Search packages') as HTMLInputElement;
      await userEvent.type(input, '{enter}');
      expect(mockUseNavigate).toHaveBeenCalledTimes(1);
      expect(mockUseNavigate).toHaveBeenCalledWith({
        pathname: '/packages/search',
        search: prepareQueryString({
          tsQueryWeb: undefined,
          pageNumber: 1,
        }),
      });
    });

    it('forces focus to click search bar icon', async () => {
      render(
        <Router>
          <SearchBar {...defaultProps} tsQueryWeb={undefined} isSearching={false} />
        </Router>
      );

      const icon = screen.getByTestId('searchBarIcon');
      await userEvent.click(icon);

      expect(screen.getByPlaceholderText('Search packages')).toHaveFocus();
    });
  });
});
