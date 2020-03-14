import React from 'react';
import { render, screen, wait, waitForElement, fireEvent, within } from '@testing-library/react';
import { mocked } from 'ts-jest/utils';
import { BrowserRouter as Router } from 'react-router-dom';
import { API } from '../../api';
import SearchView from './index';
import prepareQuerystring from '../../utils/prepareQueryString';
import { SearchResults } from '../../types';
jest.mock('../../api');

const getMockSearchResults = (fixtureId: string): SearchResults => {
  return require(`./__fixtures__/index/${fixtureId}.json`) as SearchResults;
};

const mockIsSearching = jest.fn();
const mockHistoryPush = jest.fn();
const mockHistoryReplace = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({
    push: mockHistoryPush,
    replace: mockHistoryReplace,
    action: 'POP',
  }),
}));

const defaultProps = {
  isSearching: false,
  setIsSearching: mockIsSearching,
  scrollPosition: 0,
  setScrollPosition: jest.fn(),
  pathname: '/search',
  text: 'test',
  pageNumber: 1,
  filters: {},
  fromDetail: false,
  deprecated: false,
};

describe('Search index', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const mockSearchResults = getMockSearchResults('1');
    mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

    const result = render(
      <Router>
        <SearchView {...defaultProps} />
      </Router>
    );
    expect(result.asFragment()).toMatchSnapshot();
    await wait();
  });

  describe('Render', () => {
    it('renders component', async () => {
      const mockSearchResults = getMockSearchResults('2');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      render(
        <Router>
          <SearchView {...defaultProps} />
        </Router>
      );
      expect(API.searchPackages).toHaveBeenCalledTimes(1);
      await wait();
    });

    it('displays loading spinner', async () => {
      const mockSearchResults = getMockSearchResults('3');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      const props = {
        ...defaultProps,
        isSearching: true,
      };
      render(
        <Router>
          <SearchView {...props} />
        </Router>
      );

      const spinner = await waitForElement(() =>
        screen.getByRole('status'),
      );

      expect(spinner).toBeInTheDocument();
      await wait();
    });

    it('displays correct search results text', async () => {
      const mockSearchResults = getMockSearchResults('4');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      render(
        <Router>
          <SearchView {...defaultProps} />
        </Router>
      );

      const results = await waitForElement(() =>
        screen.getByTestId('resultsText'),
      );

      expect(results).toBeInTheDocument();
      expect(results.textContent).toBe('1 - 7 of 7 results for "test"');
      await wait();
    });
  });

  describe('Packages', () => {
    it('renders 7 packages', async () => {
      const mockSearchResults = getMockSearchResults('5');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      render(
        <Router>
          <SearchView {...defaultProps} />
        </Router>
      );
      const packages = await waitForElement(() =>
        screen.getAllByRole('listitem'),
      );

      expect(packages).toHaveLength(7);
      await wait();
    });

    it('displays no data component when no packages', async () => {
      const mockSearchResults = getMockSearchResults('6');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      render(
        <Router>
          <SearchView {...defaultProps} />
        </Router>
      );

      const noData = await waitForElement(() =>
        screen.getByTestId('noData'),
      );

      expect(noData).toBeInTheDocument();
      expect(noData.textContent).toBe(`We're sorry! We can't seem to find any packages that match your search for \"test\"`);

      await wait();
    });
  });

  describe('Filters', () => {
    it('renders 2 facets groups + deprecated', async () => {
      const mockSearchResults = getMockSearchResults('7');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      render(
        <Router>
          <SearchView {...defaultProps} />
        </Router>
      );

      const [facets, options, deprecated] = await waitForElement(() => [
        screen.getAllByRole('menuitem'),
        screen.getAllByTestId('checkbox'),
        screen.getAllByTestId('deprecatedCheckbox'),
      ]);

      // Desktop + mobile (sidebar)
      expect(facets).toHaveLength(2 * 2 + 2);
      expect(options).toHaveLength(4 * 2);
      expect(deprecated).toHaveLength(1 * 2);
      await wait();
    });

    it('calls history push on filters change', async () => {
      const mockSearchResults = getMockSearchResults('8');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      render(
        <Router>
          <SearchView {...defaultProps} />
        </Router>
      );

      const options = await waitForElement(() =>
        screen.getAllByTestId('checkbox'),
      );
      // Check first facet: kind 0
      fireEvent.click(options[0]);
      expect(mockHistoryPush).toHaveBeenCalledTimes(1);
      expect(mockHistoryPush).toHaveBeenCalledWith({
        pathname: '/search',
        search: prepareQuerystring({
          text: 'test',
          pageNumber: 1,
          filters: {kind: ['0']},
          deprecated: false,
        }),
      });

      await wait();
    });

    it('does not render filters', async () => {
      const mockSearchResults = getMockSearchResults('9');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      render(
        <Router>
          <SearchView {...defaultProps} />
        </Router>
      );

      const [facets, sidebar] = await waitForElement(() => [
        screen.queryAllByTestId('facetBlock'),
        screen.queryByRole('complementary'),
      ]);

      expect(facets).toHaveLength(0);
      expect(sidebar).toBeNull();
      await wait();
    });
  });

  describe('Pagination', () => {
    it('does not render pagination', async () => {
      const mockSearchResults = getMockSearchResults('10');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      render(
        <Router>
          <SearchView {...defaultProps} />
        </Router>
      );
      await waitForElement(() =>
        screen.queryByRole('main'),
      );
      const pagination = screen.queryByLabelText('pagination');
      expect(pagination).toBeNull();

      await wait();
    });

    it('renders pagination', async () => {
      localStorage.setItem('limit', '15');
      const mockSearchResults = getMockSearchResults('11');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      render(
        <Router>
          <SearchView {...defaultProps} />
        </Router>
      );

      await waitForElement(() =>
        screen.queryByRole('main'),
      );
      const pagination = screen.queryByLabelText('pagination');

      expect(pagination).toBeInTheDocument();

      await wait();
    });

    it('calls history push on page change keeping current active filters', async () => {
      localStorage.setItem('limit', '15');
      const mockSearchResults = getMockSearchResults('12');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      const props = {
        ...defaultProps,
        filters: {kind: ['0']},
      }
      render(
        <Router>
          <SearchView {...props} />
        </Router>
      );

      await waitForElement(() =>
        screen.queryByRole('main'),
      );
      const pagination = screen.queryByLabelText('pagination');

      expect(pagination).toBeInTheDocument();

      const button = within(pagination!).getByText('2');
      fireEvent.click(button);
      expect(mockHistoryPush).toHaveBeenCalledTimes(1);
      expect(mockHistoryPush).toHaveBeenCalledWith({
        pathname: '/search',
        search: prepareQuerystring({
          text: 'test',
          pageNumber: 2,
          filters: {kind: ['0']},
          deprecated: false,
        }),
      });

      await wait();
    });
  });

  describe('Pagination limit', () => {
    it('renders default limit value', async () => {
      const mockSearchResults = getMockSearchResults('13');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      render(
        <Router>
          <SearchView {...defaultProps} />
        </Router>
      );

      const paginationLimit = await waitForElement(() =>
        screen.getByLabelText('pagination-limit') as HTMLSelectElement,
      );
      expect(paginationLimit.value).toBe('15');
    });

    it('updates limit value', async () => {
      const mockSearchResults = getMockSearchResults('14');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      const props = {
        ...defaultProps,
        pageNumber: 2,
      };
      render(
        <Router>
          <SearchView {...props} />
        </Router>
      );

      const paginationLimit = await waitForElement(() =>
        screen.getByLabelText('pagination-limit') as HTMLSelectElement
      );
      expect(paginationLimit.value).toBe('15');

      fireEvent.change(paginationLimit, { target: { value: '25' } });
      expect(paginationLimit.value).toBe('25');
      expect(mockHistoryReplace).toHaveBeenCalledTimes(1);
      expect(mockHistoryReplace).toHaveBeenCalledWith({
        pathname: '/search',
        search: prepareQuerystring({
          text: 'test',
          pageNumber: 1,
          filters: {},
          deprecated: false,
        }),
      });

      await wait();
    });
  });
});
