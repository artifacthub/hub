import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter as Router } from 'react-router-dom';
import { mocked } from 'ts-jest/utils';

import API from '../../api';
import { ErrorKind, Package, SearchResults } from '../../types';
import { prepareQueryString } from '../../utils/prepareQueryString';
import PackageView from './index';
jest.mock('../../api');
jest.mock('../../utils/updateMetaIndex');

const getMockPackage = (fixtureId: string): Package => {
  return require(`./__fixtures__/index/${fixtureId}.json`) as Package;
};

const getMockRelatedPackages = (fixtureId: string): SearchResults => {
  return require(`./__fixtures__/index/${fixtureId}Related.json`) as SearchResults;
};

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
  repositoryKind: 'helm',
  repositoryName: 'repoName',
  packageName: 'packageName',
  searchUrlReferer: undefined,
};

describe('Package index', () => {
  let dateNowSpy: any;

  beforeEach(() => {
    dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => 1634969145000);
  });

  afterAll(() => {
    dateNowSpy.mockRestore();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const mockPackage = getMockPackage('1');
    mocked(API).getPackage.mockResolvedValue(mockPackage);

    const { asFragment } = render(
      <Router>
        <PackageView {...defaultProps} />
      </Router>
    );

    await waitFor(() => {
      expect(API.getPackage).toHaveBeenCalledTimes(1);
      expect(asFragment()).toMatchSnapshot();
    });
  });

  describe('Render', () => {
    it('renders component', async () => {
      const mockPackage = getMockPackage('2');
      mocked(API).getPackage.mockResolvedValue(mockPackage);

      render(
        <Router>
          <PackageView {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getPackage).toHaveBeenCalledTimes(1);
      });
    });

    it('displays loading spinner', async () => {
      const mockPackage = getMockPackage('3');
      mocked(API).getPackage.mockResolvedValue(mockPackage);

      const props = {
        ...defaultProps,
      };

      render(
        <Router>
          <PackageView {...props} />
        </Router>
      );

      expect(await screen.findByRole('status')).toBeTruthy();
    });
  });

  describe('when getPackage fails', () => {
    it('generic error', async () => {
      mocked(API).getPackage.mockRejectedValue({
        kind: ErrorKind.Other,
      });

      const props = {
        ...defaultProps,
      };

      render(
        <Router>
          <PackageView {...props} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getPackage).toHaveBeenCalledTimes(1);
      });

      const noData = screen.getByRole('alert');
      expect(noData).toBeInTheDocument();
      expect(noData).toHaveTextContent(/An error occurred getting this package, please try again later./i);
    });

    it('not found package', async () => {
      mocked(API).getPackage.mockRejectedValue({
        kind: ErrorKind.NotFound,
      });

      const props = {
        ...defaultProps,
      };

      render(
        <Router>
          <PackageView {...props} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getPackage).toHaveBeenCalledTimes(1);
      });

      const noData = screen.getByRole('alert');
      expect(noData).toBeInTheDocument();
      expect(noData).toHaveTextContent('Sorry, the package you requested was not found.');
      expect(
        screen.getByText(
          'The package you are looking for may have been deleted by the provider, or it may now belong to a different repository. Please try searching for it, as it may help locating the package in a different repository or discovering other alternatives.'
        )
      ).toBeInTheDocument();
    });
  });

  describe('Go back button', () => {
    it('proper behaviour', async () => {
      const searchUrlReferer = {
        tsQueryWeb: 'test',
        filters: {},
        pageNumber: 1,
        deprecated: false,
      };
      const mockPackage = getMockPackage('4');
      mocked(API).getPackage.mockResolvedValue(mockPackage);

      render(
        <Router>
          <PackageView {...defaultProps} searchUrlReferer={searchUrlReferer} />
        </Router>
      );

      const goBack = await screen.findByRole('button', { name: /Back to results/ });
      expect(goBack).toBeInTheDocument();
      userEvent.click(goBack);
      expect(mockHistoryPush).toHaveBeenCalledTimes(1);
      expect(mockHistoryPush).toHaveBeenCalledWith({
        pathname: '/packages/search',
        search: prepareQueryString(searchUrlReferer),
        state: { 'from-detail': true },
      });
    });
  });

  describe('Repository button', () => {
    it('renders repository link', async () => {
      const mockPackage = getMockPackage('5');
      mocked(API).getPackage.mockResolvedValue(mockPackage);

      render(
        <Router>
          <PackageView {...defaultProps} />
        </Router>
      );

      const link = await screen.findByTestId('repoLink');
      expect(link).toBeInTheDocument();
      userEvent.click(link);
      expect(mockHistoryPush).toHaveBeenCalledTimes(1);
      expect(mockHistoryPush).toHaveBeenCalledWith({
        pathname: '/packages/search',
        search: prepareQueryString({
          pageNumber: 1,
          filters: {
            repo: [mockPackage.repository.name],
          },
          deprecated: mockPackage.deprecated,
        }),
      });
    });
  });

  describe('Modal', () => {
    it('renders properly', async () => {
      const mockPackage = getMockPackage('6');
      mocked(API).getPackage.mockResolvedValue(mockPackage);

      render(
        <Router>
          <PackageView {...defaultProps} />
        </Router>
      );

      expect(await screen.findByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('Readme', () => {
    it('does not render it when readme is null and displays no data message', async () => {
      const mockPackage = getMockPackage('7');
      mocked(API).getPackage.mockResolvedValue(mockPackage);

      render(
        <Router>
          <PackageView {...defaultProps} />
        </Router>
      );

      const noData = await screen.findByRole('alert');
      expect(noData).toBeInTheDocument();
      expect(noData).toHaveTextContent('This package version does not provide a README file');
      expect(screen.queryByTestId('readme')).toBeNull();
    });

    it('renders it correctly', async () => {
      const mockPackage = getMockPackage('8');
      mocked(API).getPackage.mockResolvedValue(mockPackage);

      render(
        <Router>
          <PackageView {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getPackage).toHaveBeenCalledTimes(1);
      });

      const readme = await screen.findByTestId('readme');
      expect(readme).toBeInTheDocument();
      expect(readme).toHaveTextContent(mockPackage.readme!);
    });
  });

  describe('Labels', () => {
    it('renders Verified Publisher label', async () => {
      const mockPackage = getMockPackage('9');
      mocked(API).getPackage.mockResolvedValue(mockPackage);

      render(
        <Router>
          <PackageView {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getPackage).toHaveBeenCalledTimes(1);
      });

      expect(screen.getAllByText('Verified Publisher')).toHaveLength(2);
    });
  });

  describe('Helm package', () => {
    it('renders CRDs button when are defined', async () => {
      const mockPackage = getMockPackage('10');
      mocked(API).getPackage.mockResolvedValue(mockPackage);

      render(
        <Router>
          <PackageView {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getPackage).toHaveBeenCalledTimes(1);
      });

      expect(screen.getByText('CRDs')).toBeInTheDocument();
    });
  });

  describe('OLM package', () => {
    it('renders CRDs button from crds prop when is defined', async () => {
      const mockPackage = getMockPackage('11');
      mocked(API).getPackage.mockResolvedValue(mockPackage);

      render(
        <Router>
          <PackageView {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getPackage).toHaveBeenCalledTimes(1);
      });

      expect(screen.getByText('CRDs')).toBeInTheDocument();
    });
  });

  describe('Falco rules', () => {
    it('renders rules properly', async () => {
      const mockPackage = getMockPackage('12');
      mocked(API).getPackage.mockResolvedValue(mockPackage);

      render(
        <Router>
          <PackageView {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getPackage).toHaveBeenCalledTimes(1);
      });

      expect(screen.getByTestId('mainPackage')).toBeInTheDocument();
      expect(screen.getByText('Rules')).toBeInTheDocument();
    });
  });

  describe('Tekton task', () => {
    it('renders task properly', async () => {
      const mockPackage = getMockPackage('13');
      mocked(API).getPackage.mockResolvedValue(mockPackage);

      render(
        <Router>
          <PackageView {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getPackage).toHaveBeenCalledTimes(1);
      });

      expect(screen.getByText('Manifest')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Open Manifest' })).toBeInTheDocument();
    });
  });

  describe('Krew kubectl plugin', () => {
    it('renders plugin properly', async () => {
      const mockPackage = getMockPackage('14');
      mocked(API).getPackage.mockResolvedValue(mockPackage);

      render(
        <Router>
          <PackageView {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getPackage).toHaveBeenCalledTimes(1);
      });

      expect(screen.getByText('Manifest')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Copy to clipboard' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument();
    });
  });

  describe('Related packages', () => {
    describe('Render', () => {
      it('renders component', async () => {
        const mockPackage = getMockPackage('15');
        mocked(API).getPackage.mockResolvedValue(mockPackage);
        const mockPackages = getMockRelatedPackages('1');
        mocked(API).searchPackages.mockResolvedValue(mockPackages);

        render(
          <Router>
            <PackageView {...defaultProps} />
          </Router>
        );

        await waitFor(() => {
          expect(API.getPackage).toHaveBeenCalledTimes(1);
          expect(API.searchPackages).toHaveBeenCalledTimes(1);
          expect(API.searchPackages).toHaveBeenCalledWith(
            {
              filters: {},
              limit: 9,
              offset: 0,
              tsQueryWeb: 'test or key1 or key2',
            },
            false
          );
        });
        expect(screen.getByText('Related packages')).toBeInTheDocument();
      });
    });

    it('excludes selected package from search results list', async () => {
      const mockPackage = getMockPackage('15');
      mocked(API).getPackage.mockResolvedValue(mockPackage);
      const mockPackages = getMockRelatedPackages('2');
      mocked(API).searchPackages.mockResolvedValue(mockPackages);

      render(
        <Router>
          <PackageView {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getPackage).toHaveBeenCalledTimes(1);
        expect(API.searchPackages).toHaveBeenCalledTimes(1);
      });
      expect(await screen.findAllByTestId('relatedPackageLink')).toHaveLength(6);
    });

    it('renders only 8 related packages', async () => {
      const mockPackage = getMockPackage('15');
      mocked(API).getPackage.mockResolvedValue(mockPackage);
      const mockPackages = getMockRelatedPackages('3');
      mocked(API).searchPackages.mockResolvedValue(mockPackages);

      render(
        <Router>
          <PackageView {...defaultProps} />
        </Router>
      );

      expect(await screen.findAllByTestId('relatedPackageLink')).toHaveLength(8);
    });

    describe('does not render', () => {
      it('when related packages list is empty', async () => {
        const mockPackage = getMockPackage('15');
        mocked(API).getPackage.mockResolvedValue(mockPackage);
        const mockPackages = getMockRelatedPackages('4');
        mocked(API).searchPackages.mockResolvedValue(mockPackages);

        render(
          <Router>
            <PackageView {...defaultProps} />
          </Router>
        );

        await waitFor(() => {
          expect(API.getPackage).toHaveBeenCalledTimes(1);
          expect(API.searchPackages).toHaveBeenCalledTimes(1);
        });
        expect(screen.queryAllByTestId('relatedPackageLink')).toHaveLength(0);
      });

      it('when list contains only selected package', async () => {
        const mockPackage = getMockPackage('15');
        mocked(API).getPackage.mockResolvedValue(mockPackage);
        const mockPackages = getMockRelatedPackages('5');
        mocked(API).searchPackages.mockResolvedValue(mockPackages);

        render(
          <Router>
            <PackageView {...defaultProps} />
          </Router>
        );

        await waitFor(() => {
          expect(API.getPackage).toHaveBeenCalledTimes(1);
          expect(API.searchPackages).toHaveBeenCalledTimes(1);
        });
        expect(screen.queryAllByTestId('relatedPackageLink')).toHaveLength(0);
      });

      it('when SearchPackages call fails', async () => {
        const mockPackage = getMockPackage('15');
        mocked(API).getPackage.mockResolvedValue(mockPackage);
        mocked(API).searchPackages.mockRejectedValue(null);

        render(
          <Router>
            <PackageView {...defaultProps} />
          </Router>
        );

        await waitFor(() => {
          expect(API.getPackage).toHaveBeenCalledTimes(1);
          expect(API.searchPackages).toHaveBeenCalledTimes(1);
        });
        expect(screen.queryAllByTestId('relatedPackageLink')).toHaveLength(0);
      });
    });
  });

  describe('Special section', () => {
    it('renders recommended pkgs', async () => {
      const mockPackage = getMockPackage('16');
      mocked(API).getPackage.mockResolvedValue(mockPackage);

      render(
        <Router>
          <PackageView {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getPackage).toHaveBeenCalledTimes(1);
      });

      expect(screen.getByTestId('more-details-section')).toBeInTheDocument();
      expect(screen.getByText(/recommended by the publisher/)).toBeInTheDocument();

      const pkgs = screen.getAllByTestId('recommended-pkg');
      expect(pkgs).toHaveLength(2);
      expect(pkgs[0]).toHaveTextContent('artifact-hub');
      expect(pkgs[1]).toHaveTextContent('kube-prometheus-stack');
    });

    it('renders orgs using package', async () => {
      const mockPackage = getMockPackage('17');
      mocked(API).getPackage.mockResolvedValue(mockPackage);

      render(
        <Router>
          <PackageView {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getPackage).toHaveBeenCalledTimes(1);
      });

      expect(screen.getByTestId('more-details-section')).toBeInTheDocument();
      expect(screen.getByText(/Organizations using this package in production/)).toBeInTheDocument();

      const orgs = screen.getAllByTestId('org-using-pkg');
      expect(orgs).toHaveLength(3);
      expect(orgs[0]).toHaveTextContent('Artifact Hub');
      expect(orgs[1]).toHaveTextContent('test');
      expect(orgs[2]).toHaveTextContent('Organization');

      const link = screen.getByRole('button', { name: 'Open organization url' });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://artifacthub.io');
    });

    it('does not render when recommendes and production usage are undefined', async () => {
      const mockPackage = getMockPackage('18');
      mocked(API).getPackage.mockResolvedValue(mockPackage);

      render(
        <Router>
          <PackageView {...defaultProps} />
        </Router>
      );

      await waitFor(() => {
        expect(API.getPackage).toHaveBeenCalledTimes(1);
      });

      expect(screen.queryByTestId('more-details-section')).toBeNull();
    });
  });
});
