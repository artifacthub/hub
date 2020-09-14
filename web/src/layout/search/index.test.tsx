import { fireEvent, render, waitFor, within } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { mocked } from 'ts-jest/utils';

import { API } from '../../api';
import { ErrorKind, SearchResults } from '../../types';
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
  ...(jest.requireActual('react-router-dom') as {}),
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
  tsQueryWeb: 'test',
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

    it('displays correct search results text', async () => {
      const mockSearchResults = getMockSearchResults('4');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      const { getByTestId } = render(
        <Router>
          <SearchView {...defaultProps} />
        </Router>
      );

      const results = await waitFor(() => getByTestId('resultsText'));

      expect(results).toBeInTheDocument();
      expect(results).toHaveTextContent('1 - 7 of 7 results for "test"');
      await waitFor(() => {});
    });

    it('renders error message when searchPackages call fails', async () => {
      mocked(API).searchPackages.mockRejectedValue({ kind: ErrorKind.Other });

      const { getByTestId } = render(
        <Router>
          <SearchView {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(1);
      });

      const noData = getByTestId('noData');

      expect(noData).toBeInTheDocument();
      expect(noData).toHaveTextContent('An error occurred searching packages, please try again later.');
    });
  });

  describe('Packages', () => {
    it('renders 7 packages', async () => {
      const mockSearchResults = getMockSearchResults('5');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      const { getAllByRole } = render(
        <Router>
          <SearchView {...defaultProps} />
        </Router>
      );
      const packages = await waitFor(() => getAllByRole('listitem'));

      expect(packages).toHaveLength(7);
      await waitFor(() => {});
    });

    it('displays no data component when no packages', async () => {
      const mockSearchResults = getMockSearchResults('6');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      const { getByTestId, getAllByTestId } = render(
        <Router>
          <SearchView {...defaultProps} />
        </Router>
      );

      const noData = await waitFor(() => getByTestId('noData'));

      expect(noData).toBeInTheDocument();
      expect(noData).toHaveTextContent(
        `We're sorry! We can't seem to find any packages that match your search for "test"`
      );
      expect(getByTestId('resetLink')).toBeInTheDocument();
      expect(getAllByTestId('sampleFilterLink')).toHaveLength(5);

      await waitFor(() => {});
    });
  });

  describe('Filters', () => {
    it('renders 1 facets group', async () => {
      const mockSearchResults = getMockSearchResults('7');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      const { getAllByRole, getAllByTestId } = render(
        <Router>
          <SearchView {...defaultProps} />
        </Router>
      );

      const [facets, options] = await waitFor(() => [getAllByRole('menuitem'), getAllByTestId('checkbox')]);

      // Desktop + mobile (sidebar)
      expect(facets).toHaveLength(2 * 3);
      expect(options).toHaveLength(15 * 2);
      await waitFor(() => {});
    });

    it('calls history push on filters change', async () => {
      const mockSearchResults = getMockSearchResults('8');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      const { getByLabelText } = render(
        <Router>
          <SearchView {...defaultProps} />
        </Router>
      );

      const opt = await waitFor(() => getByLabelText(/Chart/g));
      fireEvent.click(opt);

      expect(mockHistoryPush).toHaveBeenCalledTimes(1);
      expect(mockHistoryPush).toHaveBeenCalledWith({
        pathname: '/packages/search',
        search: prepareQuerystring({
          tsQueryWeb: 'test',
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

      const { queryAllByTestId, queryByRole } = render(
        <Router>
          <SearchView {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(queryAllByTestId('facetBlock')).toHaveLength(0);
        expect(queryByRole('complementary')).toBeNull();
      });

      await waitFor(() => {});
    });
  });

  describe('Pagination', () => {
    it('does not render pagination', async () => {
      const mockSearchResults = getMockSearchResults('10');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      const { queryByRole, queryByLabelText } = render(
        <Router>
          <SearchView {...defaultProps} />
        </Router>
      );

      await waitFor(() => queryByRole('main'));

      const pagination = queryByLabelText('pagination');
      expect(pagination).toBeNull();

      await waitFor(() => {});
    });

    it('renders pagination', async () => {
      const mockSearchResults = getMockSearchResults('11');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      const { queryByRole, queryByLabelText } = render(
        <Router>
          <SearchView {...defaultProps} />
        </Router>
      );

      await waitFor(() => queryByRole('main'));

      const pagination = queryByLabelText('pagination');
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

      const { queryByRole, queryByLabelText } = render(
        <Router>
          <SearchView {...props} />
        </Router>
      );

      await waitFor(() => queryByRole('main'));

      const pagination = queryByLabelText('pagination');
      expect(pagination).toBeInTheDocument();

      const button = within(pagination!).getByText('2');
      fireEvent.click(button);
      expect(mockHistoryPush).toHaveBeenCalledTimes(1);
      expect(mockHistoryPush).toHaveBeenCalledWith({
        pathname: '/packages/search',
        search: prepareQuerystring({
          tsQueryWeb: 'test',
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

      const { getByLabelText } = render(
        <Router>
          <SearchView {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        const paginationLimit = getByLabelText('pagination-limit') as HTMLSelectElement;
        expect(paginationLimit.value).toBe('15');
      });
    });

    it('updates limit value', async () => {
      const mockSearchResults = getMockSearchResults('14');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      const props = {
        ...defaultProps,
        pageNumber: 2,
      };

      const { getByLabelText } = render(
        <Router>
          <SearchView {...props} />
        </Router>
      );

      const paginationLimit = await waitFor(() => getByLabelText('pagination-limit') as HTMLSelectElement);
      expect(paginationLimit.value).toBe('15');

      fireEvent.change(paginationLimit, { target: { value: '25' } });

      expect(mockHistoryReplace).toHaveBeenCalledTimes(1);
      expect(mockHistoryReplace).toHaveBeenCalledWith({
        pathname: '/packages/search',
        search: prepareQuerystring({
          tsQueryWeb: 'test',
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

      const { getByLabelText } = render(
        <Router>
          <SearchView {...defaultProps} filters={{ repo: ['stable'] }} />
        </Router>
      );

      const opt = await waitFor(() => getByLabelText(/Falco rules/g));
      fireEvent.click(opt);

      expect(mockHistoryPush).toHaveBeenCalledTimes(1);
      expect(mockHistoryPush).toHaveBeenCalledWith({
        pathname: '/packages/search',
        search: prepareQuerystring({
          tsQueryWeb: 'test',
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

      const { getByLabelText } = render(
        <Router>
          <SearchView {...defaultProps} filters={{ repo: ['stable'] }} />
        </Router>
      );

      const opt = await waitFor(() => getByLabelText(/Helm charts/g));
      fireEvent.click(opt);

      expect(mockHistoryPush).toHaveBeenCalledTimes(1);
      expect(mockHistoryPush).toHaveBeenCalledWith({
        pathname: '/packages/search',
        search: prepareQuerystring({
          tsQueryWeb: 'test',
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

      const { getByLabelText } = render(
        <Router>
          <SearchView {...defaultProps} filters={{ repo: ['stable'] }} />
        </Router>
      );

      const opt = await waitFor(() => getByLabelText(/Helm charts/g));
      fireEvent.click(opt);

      expect(mockHistoryPush).toHaveBeenCalledTimes(1);
      expect(mockHistoryPush).toHaveBeenCalledWith({
        pathname: '/packages/search',
        search: prepareQuerystring({
          tsQueryWeb: 'test',
          pageNumber: 1,
          filters: { repo: ['stable'], kind: ['0'] },
          deprecated: false,
        }),
      });

      await waitFor(() => {});
    });
  });

  describe('Facets', () => {
    it('keeps previous facets when new ones are empty', async () => {
      const mockSearchResults1 = getMockSearchResults('22a');
      const mockSearchResults2 = getMockSearchResults('22b');
      mocked(API).searchPackages.mockResolvedValueOnce(mockSearchResults1).mockResolvedValue(mockSearchResults2);

      const { rerender, getByRole, getAllByTestId, getByTestId } = render(
        <Router>
          <SearchView {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(1);
        expect(API.searchPackages).toHaveBeenCalledWith({
          deprecated: false,
          filters: {},
          limit: 15,
          offset: 0,
          tsQueryWeb: 'test',
        });
      });

      const main = await waitFor(() => getByRole('main'));

      expect(main).toBeInTheDocument();
      const checks = getAllByTestId('checkbox');
      expect(checks).toHaveLength(28);

      rerender(
        <Router>
          <SearchView {...defaultProps} tsQuery={['database']} />
        </Router>
      );

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(2);
        expect(API.searchPackages).toHaveBeenCalledWith({
          deprecated: false,
          filters: {},
          limit: 15,
          offset: 0,
          tsQueryWeb: 'test',
          tsQuery: ['database'],
        });
      });

      await waitFor(() => getByRole('main'));

      const noData = await waitFor(() => getByTestId('noData'));

      expect(noData).toBeInTheDocument();
      expect(noData).toHaveTextContent(
        `We're sorry! We can't seem to find any packages that match your search for "test"`
      );
      expect(checks).toHaveLength(28);

      await waitFor(() => {});
    });
  });
});
