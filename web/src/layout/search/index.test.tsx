import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mocked } from 'jest-mock';
import { BrowserRouter as Router } from 'react-router-dom';

import API from '../../api';
import { ErrorKind, SearchResults } from '../../types';
import { prepareQueryString } from '../../utils/prepareQueryString';
import SearchView from './index';
jest.mock('../common/SampleQueries', () => () => <div />);
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
  setViewedPackage: jest.fn(),
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

    const { asFragment } = render(
      <Router>
        <SearchView {...defaultProps} />
      </Router>
    );

    await waitFor(() => {
      expect(API.searchPackages).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByRole('status')).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
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

      expect(await screen.findByRole('status')).toBeInTheDocument();
    });

    it('displays correct search results text', async () => {
      const mockSearchResults = getMockSearchResults('4');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      render(
        <Router>
          <SearchView {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent('1 - 7 of 7 results for "test"');
      });
    });

    it('renders correct legend with some filters applied', async () => {
      const mockSearchResults = getMockSearchResults('4');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      render(
        <Router>
          <SearchView {...defaultProps} filters={{ kind: ['0'] }} />
        </Router>
      );

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(1);
      });

      expect(await screen.findByText(/(some filters applied)/i)).toBeInTheDocument();

      expect(screen.getByRole('button', { name: 'Remove filter: Kind - Helm charts' })).toBeInTheDocument();
    });

    it('renders error message when searchPackages call fails', async () => {
      mocked(API).searchPackages.mockRejectedValue({ kind: ErrorKind.Other });

      render(
        <Router>
          <SearchView {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(1);
      });

      const noData = await screen.findByRole('alert');
      expect(noData).toBeInTheDocument();
      expect(noData).toHaveTextContent('An error occurred searching packages, please try again later.');
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

      const packages = await screen.findAllByRole('listitem');
      expect(packages).toHaveLength(7);
    });

    it('displays no data component when no packages', async () => {
      const mockSearchResults = getMockSearchResults('6');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      render(
        <Router>
          <SearchView {...defaultProps} />
        </Router>
      );

      const noData = await screen.findByRole('alert');
      expect(noData).toBeInTheDocument();
      expect(noData).toHaveTextContent(
        `We're sorry! We can't seem to find any packages that match your search for "test"`
      );
      expect(screen.getByRole('button', { name: /Browse all packages/ })).toBeInTheDocument();
    });
  });

  describe('Filters', () => {
    it('renders 1 facets group', async () => {
      const mockSearchResults = getMockSearchResults('7');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      render(
        <Router>
          <SearchView {...defaultProps} />
        </Router>
      );

      const facets = await screen.findAllByRole('menuitem');
      const options = await screen.findAllByRole('checkbox');

      // Desktop + mobile (sidebar)
      expect(facets).toHaveLength(2 * 3);
      expect(options).toHaveLength(15 * 2);
    });

    it('calls history push on filters change', async () => {
      const mockSearchResults = getMockSearchResults('8');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      render(
        <Router>
          <SearchView {...defaultProps} />
        </Router>
      );

      const opts = await screen.findAllByLabelText(/Helm charts/);
      await userEvent.click(opts[0]);

      await waitFor(() => {
        expect(mockHistoryPush).toHaveBeenCalledTimes(1);
        expect(mockHistoryPush).toHaveBeenCalledWith({
          pathname: '/packages/search',
          search: prepareQueryString({
            tsQueryWeb: 'test',
            pageNumber: 1,
            filters: { kind: ['0'] },
            deprecated: false,
          }),
        });
      });
    });

    it('does not render filters', async () => {
      const mockSearchResults = getMockSearchResults('9');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      render(
        <Router>
          <SearchView {...defaultProps} />
        </Router>
      );

      const packages = await screen.findAllByRole('listitem');
      expect(packages).toHaveLength(7);

      expect(screen.queryAllByRole('menuitem')).toHaveLength(0);
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

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        const pagination = screen.queryByLabelText('pagination');
        expect(pagination).toBeNull();
      });
    });

    it('renders pagination', async () => {
      const mockSearchResults = getMockSearchResults('11');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      render(
        <Router>
          <SearchView {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(1);
      });
      expect(await screen.findByLabelText('pagination')).toBeInTheDocument();
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

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(1);
      });

      expect(await screen.findByLabelText('pagination')).toBeInTheDocument();

      const button = screen.getByText('2');
      await userEvent.click(button);

      await waitFor(() => {
        expect(mockHistoryPush).toHaveBeenCalledTimes(1);
        expect(mockHistoryPush).toHaveBeenCalledWith({
          pathname: '/packages/search',
          search: prepareQueryString({
            tsQueryWeb: 'test',
            pageNumber: 2,
            filters: { kind: ['0'] },
            deprecated: false,
          }),
        });
      });
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

      expect(await screen.findByLabelText('pagination')).toBeInTheDocument();

      const paginationLimit = (await screen.findByLabelText('pagination-limit')) as HTMLSelectElement;
      expect(paginationLimit.value).toBe('20');
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

      expect(await screen.findByLabelText('pagination')).toBeInTheDocument();

      const paginationLimit = (await screen.findByLabelText('pagination-limit')) as HTMLSelectElement;
      expect(paginationLimit.value).toBe('20');

      await userEvent.selectOptions(paginationLimit, '60');

      await waitFor(() => {
        expect(mockHistoryReplace).toHaveBeenCalledTimes(1);
        expect(mockHistoryReplace).toHaveBeenCalledWith({
          pathname: '/packages/search',
          search: prepareQueryString({
            tsQueryWeb: 'test',
            pageNumber: 1,
            filters: {},
            deprecated: false,
          }),
        });
      });
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

      const opts = await screen.findAllByLabelText(/Falco rules/);
      await userEvent.click(opts[0]);

      await waitFor(() => {
        expect(mockHistoryPush).toHaveBeenCalledTimes(1);
        expect(mockHistoryPush).toHaveBeenCalledWith({
          pathname: '/packages/search',
          search: prepareQueryString({
            tsQueryWeb: 'test',
            pageNumber: 1,
            filters: { kind: ['1'] },
            deprecated: false,
          }),
        });
      });
    });

    it('calls history push with proper filters when package kind Chart is checked', async () => {
      const mockSearchResults = getMockSearchResults('16');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      render(
        <Router>
          <SearchView {...defaultProps} filters={{ repo: ['stable'] }} />
        </Router>
      );

      const opts = await screen.findAllByLabelText(/Helm charts/);
      await userEvent.click(opts[0]);

      await waitFor(() => {
        expect(mockHistoryPush).toHaveBeenCalledTimes(1);
        expect(mockHistoryPush).toHaveBeenCalledWith({
          pathname: '/packages/search',
          search: prepareQueryString({
            tsQueryWeb: 'test',
            pageNumber: 1,
            filters: { repo: ['stable'], kind: ['0'] },
            deprecated: false,
          }),
        });
      });
    });

    it('calls history push with proper filters when package kind filter different to Chart is checked', async () => {
      const mockSearchResults = getMockSearchResults('16');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      render(
        <Router>
          <SearchView {...defaultProps} filters={{ repo: ['stable'] }} />
        </Router>
      );

      const opts = await screen.findAllByLabelText(/Helm charts/);
      await userEvent.click(opts[0]);

      await waitFor(() => {
        expect(mockHistoryPush).toHaveBeenCalledTimes(1);
        expect(mockHistoryPush).toHaveBeenCalledWith({
          pathname: '/packages/search',
          search: prepareQueryString({
            tsQueryWeb: 'test',
            pageNumber: 1,
            filters: { repo: ['stable'], kind: ['0'] },
            deprecated: false,
          }),
        });
      });
    });
  });

  describe('Facets', () => {
    it('keeps previous facets when new ones are empty', async () => {
      const mockSearchResults1 = getMockSearchResults('22a');
      const mockSearchResults2 = getMockSearchResults('22b');
      mocked(API).searchPackages.mockResolvedValueOnce(mockSearchResults1).mockResolvedValue(mockSearchResults2);

      const { rerender } = render(
        <Router>
          <SearchView {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(1);
        expect(API.searchPackages).toHaveBeenCalledWith({
          deprecated: false,
          filters: {},
          limit: 20,
          offset: 0,
          tsQueryWeb: 'test',
          sort: 'relevance',
        });
      });

      const main = await screen.findByRole('main');

      expect(main).toBeInTheDocument();
      const checks = await screen.findAllByRole('checkbox');
      expect(checks).toHaveLength(38);

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
          limit: 20,
          offset: 0,
          tsQueryWeb: 'test',
          tsQuery: ['database'],
          sort: 'relevance',
        });
      });

      const noData = await screen.findByRole('alert');
      expect(noData).toBeInTheDocument();
      expect(noData).toHaveTextContent(
        `We're sorry! We can't seem to find any packages that match your search for "test"`
      );
      expect(checks).toHaveLength(38);
    });
  });

  describe('Reset', () => {
    it('resets all filters except tsQueryWeb on click', async () => {
      const mockSearchResults = getMockSearchResults('23');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      render(
        <Router>
          <SearchView {...defaultProps} verifiedPublisher official deprecated filters={{ repo: ['stable'] }} />
        </Router>
      );

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(1);
      });
      const buttons = await screen.findAllByRole('button', { name: 'Reset filters' });
      expect(buttons).toHaveLength(2);
      expect(buttons[0]).toHaveTextContent('Reset');
      await userEvent.click(buttons[0]);

      await waitFor(() => {
        expect(mockHistoryPush).toHaveBeenCalledTimes(1);
        expect(mockHistoryPush).toHaveBeenCalledWith({
          pathname: '/packages/search',
          search: prepareQueryString({
            pageNumber: 1,
            tsQueryWeb: 'test',
          }),
        });
      });
    });

    it('resets all filters included tsQueryWeb when browseAllBtn is clicked', async () => {
      const mockSearchResults = getMockSearchResults('24');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      render(
        <Router>
          <SearchView {...defaultProps} filters={{}} />
        </Router>
      );

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(1);
      });

      const browseAllBtn = await screen.findByRole('button', { name: /Browse all packages/i });
      expect(browseAllBtn).toBeInTheDocument();
      await userEvent.click(browseAllBtn);

      await waitFor(() => {
        expect(mockHistoryPush).toHaveBeenCalledTimes(1);
        expect(mockHistoryPush).toHaveBeenCalledWith({
          pathname: '/packages/search',
          search: prepareQueryString({
            pageNumber: 1,
            tsQueryWeb: '',
          }),
        });
      });
    });

    it('resets filters when reset the filters button is clicked', async () => {
      const mockSearchResults = getMockSearchResults('24');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      render(
        <Router>
          <SearchView {...defaultProps} verifiedPublisher official deprecated filters={{ repo: ['stable'] }} />
        </Router>
      );

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(1);
      });

      const buttons = await screen.findAllByRole('button', { name: 'Reset filters' });
      expect(buttons).toHaveLength(3);
      expect(buttons[2]).toHaveTextContent('reset the filters');
      await userEvent.click(buttons[2]);

      await waitFor(() => {
        expect(mockHistoryPush).toHaveBeenCalledTimes(1);
        expect(mockHistoryPush).toHaveBeenCalledWith({
          pathname: '/packages/search',
          search: prepareQueryString({
            pageNumber: 1,
            tsQueryWeb: 'test',
          }),
        });
      });
    });
  });

  describe('Sort options', () => {
    it('renders default sort value', async () => {
      const mockSearchResults = getMockSearchResults('25');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      render(
        <Router>
          <SearchView {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(1);
      });

      const sortOpts = (await screen.findByLabelText('sort-options')) as HTMLSelectElement;
      expect(sortOpts.value).toBe('relevance');
    });

    it('updates sort value', async () => {
      const mockSearchResults = getMockSearchResults('26');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      render(
        <Router>
          <SearchView {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(1);
      });

      const sortOpts = (await screen.findByLabelText('sort-options')) as HTMLSelectElement;
      expect(sortOpts.value).toBe('relevance');

      fireEvent.change(sortOpts, { target: { value: 'stars' } });

      await waitFor(() => {
        expect(mockHistoryReplace).toHaveBeenCalledTimes(1);
        expect(mockHistoryReplace).toHaveBeenCalledWith({
          pathname: '/packages/search',
          search: prepareQueryString({
            tsQueryWeb: 'test',
            pageNumber: 1,
            filters: {},
            deprecated: false,
            sort: 'stars',
          }),
        });
      });
    });

    describe('does not render sort options', () => {
      it('when tsQueryWeb is undefined', async () => {
        const mockSearchResults = getMockSearchResults('27');
        mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

        render(
          <Router>
            <SearchView {...defaultProps} tsQueryWeb={undefined} />
          </Router>
        );

        await waitFor(() => {
          expect(API.searchPackages).toHaveBeenCalledTimes(1);
        });

        const sortOpts = await waitFor(() => screen.queryByLabelText('sort-options') as HTMLSelectElement);
        expect(sortOpts).toBeNull();
      });

      it('when tsQueryWeb is a empty string', async () => {
        const mockSearchResults = getMockSearchResults('28');
        mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

        render(
          <Router>
            <SearchView {...defaultProps} tsQueryWeb="" />
          </Router>
        );

        await waitFor(() => {
          expect(API.searchPackages).toHaveBeenCalledTimes(1);
        });

        const sortOpts = await waitFor(() => screen.queryByLabelText('sort-options') as HTMLSelectElement);
        expect(sortOpts).toBeNull();
      });
    });
  });

  describe('Filters badges', () => {
    it('displays some common filters', async () => {
      const mockSearchResults = getMockSearchResults('29');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      render(
        <Router>
          <SearchView {...defaultProps} official verifiedPublisher />
        </Router>
      );

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(1);
      });

      expect(await screen.findByRole('button', { name: 'Remove filter: Only official' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Remove filter: Only verified publishers' })).toBeInTheDocument();
    });

    it('calls history push on filters change', async () => {
      const mockSearchResults = getMockSearchResults('30');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      render(
        <Router>
          <SearchView {...defaultProps} official verifiedPublisher />
        </Router>
      );

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(1);
      });

      await userEvent.click(screen.getByRole('button', { name: 'Remove filter: Only official' }));

      await waitFor(() => {
        expect(mockHistoryPush).toHaveBeenCalledTimes(1);
        expect(mockHistoryPush).toHaveBeenCalledWith({
          pathname: '/packages/search',
          search: prepareQueryString({
            tsQueryWeb: 'test',
            pageNumber: 1,
            deprecated: false,
            verifiedPublisher: true,
          }),
        });
      });
    });

    it('displays some categories filters', async () => {
      const mockSearchResults = getMockSearchResults('29');
      mocked(API).searchPackages.mockResolvedValue(mockSearchResults);

      render(
        <Router>
          <SearchView {...defaultProps} tsQuery={['database', 'logging-and-tracing']} />
        </Router>
      );

      await waitFor(() => {
        expect(API.searchPackages).toHaveBeenCalledTimes(1);
      });

      expect(await screen.findByRole('button', { name: 'Remove filter: Category - Database' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Remove filter: Category - Logging and Tracing' })).toBeInTheDocument();
    });
  });
});
