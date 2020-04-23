import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { mocked } from 'ts-jest/utils';

import { API } from '../../api';
import { SearchResults } from '../../types';
import prepareQuerystring from '../../utils/prepareQueryString';
import SearchView from './index';
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
  pathname: '/packages/search',
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

    await waitFor(() => {
      expect(result.asFragment()).toMatchSnapshot();
    });
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

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(1);
      });
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

      const spinner = await waitFor(() => screen.getByRole('status'));

      expect(spinner).toBeInTheDocument();
      await waitFor(() => {});
    });

    it('displays correct search results text', async () => {
      const mockSearchResults = getMockSearchResults('4');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      render(
        <Router>
          <SearchView {...defaultProps} />
        </Router>
      );

      const results = await waitFor(() => screen.getByTestId('resultsText'));

      expect(results).toBeInTheDocument();
      expect(results).toHaveTextContent('1 - 7 of 7 results for "test"');
      await waitFor(() => {});
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
      const packages = await waitFor(() => screen.getAllByRole('listitem'));

      expect(packages).toHaveLength(7);
      await waitFor(() => {});
    });

    it('displays no data component when no packages', async () => {
      const mockSearchResults = getMockSearchResults('6');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      render(
        <Router>
          <SearchView {...defaultProps} />
        </Router>
      );

      const noData = await waitFor(() => screen.getByTestId('noData'));

      expect(noData).toBeInTheDocument();
      expect(noData).toHaveTextContent(
        `We're sorry! We can't seem to find any packages that match your search for "test"`
      );

      await waitFor(() => {});
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

      const [facets, options, deprecated] = await waitFor(() => [
        screen.getAllByRole('menuitem'),
        screen.getAllByTestId('checkbox'),
        screen.getAllByTestId('deprecatedCheckbox'),
      ]);

      // Desktop + mobile (sidebar)
      expect(facets).toHaveLength(2 * 2 + 2);
      expect(options).toHaveLength(4 * 2);
      expect(deprecated).toHaveLength(1 * 2);
      await waitFor(() => {});
    });

    it('calls history push on filters change', async () => {
      const mockSearchResults = getMockSearchResults('8');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      render(
        <Router>
          <SearchView {...defaultProps} />
        </Router>
      );

      const opt = await waitFor(() => screen.getByLabelText(/Chart/g));
      fireEvent.click(opt);
      expect(mockHistoryPush).toHaveBeenCalledTimes(1);
      expect(mockHistoryPush).toHaveBeenCalledWith({
        pathname: '/packages/search',
        search: prepareQuerystring({
          text: 'test',
          pageNumber: 1,
          filters: { kind: ['0'] },
          deprecated: false,
        }),
      });

      await waitFor(() => {});
    });

    it('does not render filters', async () => {
      const mockSearchResults = getMockSearchResults('9');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      render(
        <Router>
          <SearchView {...defaultProps} />
        </Router>
      );

      const [facets, sidebar] = await waitFor(() => [
        screen.queryAllByTestId('facetBlock'),
        screen.queryByRole('complementary'),
      ]);

      expect(facets).toHaveLength(0);
      expect(sidebar).toBeNull();
      await waitFor(() => {});
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
      await waitFor(() => screen.queryByRole('main'));
      const pagination = screen.queryByLabelText('pagination');
      expect(pagination).toBeNull();

      await waitFor(() => {});
    });

    it('renders pagination', async () => {
      const mockSearchResults = getMockSearchResults('11');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      render(
        <Router>
          <SearchView {...defaultProps} />
        </Router>
      );

      await waitFor(() => screen.queryByRole('main'));
      const pagination = screen.queryByLabelText('pagination');

      expect(pagination).toBeInTheDocument();

      await waitFor(() => {});
    });

    it('calls history push on page change keeping current active filters', async () => {
      const mockSearchResults = getMockSearchResults('12');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      const props = {
        ...defaultProps,
        filters: { kind: ['0'] },
      };
      render(
        <Router>
          <SearchView {...props} />
        </Router>
      );

      await waitFor(() => screen.queryByRole('main'));
      const pagination = screen.queryByLabelText('pagination');

      expect(pagination).toBeInTheDocument();

      const button = within(pagination!).getByText('2');
      fireEvent.click(button);
      expect(mockHistoryPush).toHaveBeenCalledTimes(1);
      expect(mockHistoryPush).toHaveBeenCalledWith({
        pathname: '/packages/search',
        search: prepareQuerystring({
          text: 'test',
          pageNumber: 2,
          filters: { kind: ['0'] },
          deprecated: false,
        }),
      });

      await waitFor(() => {});
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

      const paginationLimit = await waitFor(() => screen.getByLabelText('pagination-limit') as HTMLSelectElement);
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

      const paginationLimit = await waitFor(() => screen.getByLabelText('pagination-limit') as HTMLSelectElement);
      expect(paginationLimit.value).toBe('15');

      fireEvent.change(paginationLimit, { target: { value: '25' } });

      expect(mockHistoryReplace).toHaveBeenCalledTimes(1);
      expect(mockHistoryReplace).toHaveBeenCalledWith({
        pathname: '/packages/search',
        search: prepareQuerystring({
          text: 'test',
          pageNumber: 1,
          filters: {},
          deprecated: false,
        }),
      });

      await waitFor(() => {});
    });
  });

  describe('Filtering logic', () => {
    it('calls history push with proper filters when package kind filter different to Chart is checked', async () => {
      const mockSearchResults = getMockSearchResults('15');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      render(
        <Router>
          <SearchView {...defaultProps} filters={{ repo: ['stable'] }} />
        </Router>
      );

      const opt = await waitFor(() => screen.getByLabelText(/Falco rules/g));
      fireEvent.click(opt);

      expect(mockHistoryPush).toHaveBeenCalledTimes(1);
      expect(mockHistoryPush).toHaveBeenCalledWith({
        pathname: '/packages/search',
        search: prepareQuerystring({
          text: 'test',
          pageNumber: 1,
          filters: { kind: ['1'] },
          deprecated: false,
        }),
      });

      await waitFor(() => {});
    });

    it('calls history push with proper filters when package kind Chart is checked', async () => {
      const mockSearchResults = getMockSearchResults('16');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      render(
        <Router>
          <SearchView {...defaultProps} filters={{ repo: ['stable'] }} />
        </Router>
      );

      const opt = await waitFor(() => screen.getByLabelText(/Helm charts/g));
      fireEvent.click(opt);

      expect(mockHistoryPush).toHaveBeenCalledTimes(1);
      expect(mockHistoryPush).toHaveBeenCalledWith({
        pathname: '/packages/search',
        search: prepareQuerystring({
          text: 'test',
          pageNumber: 1,
          filters: { repo: ['stable'], kind: ['0'] },
          deprecated: false,
        }),
      });

      await waitFor(() => {});
    });

    it('calls history push with proper filters when package kind filter different to Chart is checked', async () => {
      const mockSearchResults = getMockSearchResults('16');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      render(
        <Router>
          <SearchView {...defaultProps} filters={{ repo: ['stable'] }} />
        </Router>
      );

      const opt = await waitFor(() => screen.getByLabelText(/Helm charts/g));
      fireEvent.click(opt);

      expect(mockHistoryPush).toHaveBeenCalledTimes(1);
      expect(mockHistoryPush).toHaveBeenCalledWith({
        pathname: '/packages/search',
        search: prepareQuerystring({
          text: 'test',
          pageNumber: 1,
          filters: { repo: ['stable'], kind: ['0'] },
          deprecated: false,
        }),
      });

      await waitFor(() => {});
    });

    it('calls history push with proper filters when a org is checked', async () => {
      const mockSearchResults = getMockSearchResults('17');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      render(
        <Router>
          <SearchView {...defaultProps} filters={{ user: ['testUser'] }} />
        </Router>
      );

      const opt = await waitFor(() => screen.getByLabelText(/Helm org/g));
      fireEvent.click(opt);

      expect(mockHistoryPush).toHaveBeenCalledTimes(1);
      expect(mockHistoryPush).toHaveBeenCalledWith({
        pathname: '/packages/search',
        search: prepareQuerystring({
          text: 'test',
          pageNumber: 1,
          filters: { org: ['helmOrg'] },
          deprecated: false,
        }),
      });

      await waitFor(() => {});
    });

    it('calls history push with proper filters when a user is checked', async () => {
      const mockSearchResults = getMockSearchResults('17');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      render(
        <Router>
          <SearchView {...defaultProps} filters={{ org: ['helmOrg'] }} />
        </Router>
      );

      const opt = await waitFor(() => screen.getByLabelText(/testUser/g));
      fireEvent.click(opt);

      expect(mockHistoryPush).toHaveBeenCalledTimes(1);
      expect(mockHistoryPush).toHaveBeenCalledWith({
        pathname: '/packages/search',
        search: prepareQuerystring({
          text: 'test',
          pageNumber: 1,
          filters: { user: ['testUser'] },
          deprecated: false,
        }),
      });

      await waitFor(() => {});
    });

    it('renders Chart repositories facets when Helm Chart package kind is selected or when no package kind filter is being applied', async () => {
      const mockSearchResults = getMockSearchResults('18');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      render(
        <Router>
          <SearchView {...defaultProps} />
        </Router>
      );

      await waitFor(() => screen.queryByRole('main'));

      expect(screen.getAllByRole('menuitem')).toHaveLength(2 * 4);
      expect(screen.getByLabelText(/Stable/g)).toBeInTheDocument();
      expect(screen.getByLabelText(/Incubator/g)).toBeInTheDocument();

      await waitFor(() => {});
    });

    it('does not render Chart repositories facets when package kind filter different to Chart is active', async () => {
      const mockSearchResults = getMockSearchResults('19');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      render(
        <Router>
          <SearchView {...defaultProps} filters={{ kind: ['1'] }} />
        </Router>
      );

      await waitFor(() => screen.queryByRole('main'));

      expect(screen.getAllByRole('menuitem')).toHaveLength(2 * 3);
      expect(screen.queryByLabelText(/Stable/g)).toBeNull();
      expect(screen.queryByLabelText(/Incubator/g)).toBeNull();

      await waitFor(() => {});
    });
  });
});
