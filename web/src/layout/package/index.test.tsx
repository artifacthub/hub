import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mocked } from 'jest-mock';
import { BrowserRouter as Router } from 'react-router-dom';

import API from '../../api';
import { ErrorKind, Package, SearchResults } from '../../types';
import { prepareQueryString } from '../../utils/prepareQueryString';
import PackageView from './index';

jest.mock('../../api');
jest.mock('../../utils/updateMetaIndex');
jest.mock('react-apexcharts', () => () => <div>Chart</div>);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
jest.mock('react-markdown', () => (props: any) => {
  return <>{props.children}</>;
});
jest.mock('remark-gfm', () => () => <div />);
jest.mock('rehype-github-alerts', () => () => <div />);
jest.mock('../../utils/bannerDispatcher', () => ({
  getBanner: () => null,
}));

const getMockPackage = (fixtureId: string): Package => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`./__fixtures__/index/${fixtureId}.json`) as Package;
};

const getMockRelatedPackages = (fixtureId: string): SearchResults => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`./__fixtures__/index/${fixtureId}Related.json`) as SearchResults;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockOutletContextData: any = {
  setIsLoading: jest.fn(),
};
const mockUseNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useOutletContext: () => mockOutletContextData,
  useNavigate: () => mockUseNavigate,
}));

describe('Package index', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        <PackageView />
      </Router>
    );

    await waitFor(() => {
      expect(API.getPackage).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findAllByText('Pretty name')).toHaveLength(2);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', async () => {
      const mockPackage = getMockPackage('2');
      mocked(API).getPackage.mockResolvedValue(mockPackage);
      mocked(API).trackView.mockResolvedValue(null);

      render(
        <Router>
          <PackageView />
        </Router>
      );

      await waitFor(() => {
        expect(API.getPackage).toHaveBeenCalledTimes(1);
      });

      expect(await screen.findAllByText('Pretty name')).toHaveLength(2);
    });

    it('calls track view', async () => {
      const mockPackage = getMockPackage('19');
      mocked(API).getPackage.mockResolvedValue(mockPackage);

      render(
        <Router>
          <PackageView />
        </Router>
      );

      await waitFor(() => {
        expect(API.getPackage).toHaveBeenCalledTimes(1);
        expect(API.trackView).toHaveBeenCalledTimes(1);
        expect(API.trackView).toHaveBeenCalledWith('id', '1.0.0');
      });

      expect(await screen.findAllByText('Pretty name')).toHaveLength(4);
    });

    it('calls getViews', async () => {
      const mockPackage = getMockPackage('20');
      mocked(API).getPackage.mockResolvedValue(mockPackage);
      mocked(API).getViews.mockResolvedValue({ '1.0.0': { '2021-12-09': 1 } });

      render(
        <Router>
          <PackageView />
        </Router>
      );

      await waitFor(() => {
        expect(API.getPackage).toHaveBeenCalledTimes(1);
        expect(API.getViews).toHaveBeenCalledTimes(1);
        expect(API.getViews).toHaveBeenCalledWith('id');
      });

      expect(await screen.findByText('Views over the last 30 days')).toBeInTheDocument();
      expect(screen.getAllByText('Chart')).toHaveLength(2);
      expect(screen.getByText('See details')).toBeInTheDocument();
      expect(screen.getByText('(all versions)')).toBeInTheDocument();
    });
  });

  describe('when getPackage fails', () => {
    it('generic error', async () => {
      mocked(API).getPackage.mockRejectedValue({
        kind: ErrorKind.Other,
      });

      render(
        <Router>
          <PackageView />
        </Router>
      );

      await waitFor(() => {
        expect(API.getPackage).toHaveBeenCalledTimes(1);
      });

      const noData = await screen.findByRole('alert');
      expect(noData).toBeInTheDocument();
      expect(noData).toHaveTextContent(/An error occurred getting this package, please try again later./i);
    });

    it('not found package', async () => {
      mocked(API).getPackage.mockRejectedValue({
        kind: ErrorKind.NotFound,
      });

      render(
        <Router>
          <PackageView />
        </Router>
      );

      await waitFor(() => {
        expect(API.getPackage).toHaveBeenCalledTimes(1);
      });

      const noData = await screen.findByRole('alert');
      expect(noData).toBeInTheDocument();
      expect(noData).toHaveTextContent('Sorry, the package you requested was not found.');
      expect(
        screen.getByText(
          'The package you are looking for may have been deleted by the provider, or it may now belong to a different repository. Please try searching for it, as it may help locating the package in a different repository or discovering other alternatives.'
        )
      ).toBeInTheDocument();
    });
  });

  describe('Repository button', () => {
    it('renders repository link', async () => {
      const mockPackage = getMockPackage('5');
      mocked(API).getPackage.mockResolvedValue(mockPackage);

      render(
        <Router>
          <PackageView />
        </Router>
      );

      const link = await screen.findByTestId('repoLink');
      expect(link).toBeInTheDocument();
      await userEvent.click(link);
      expect(mockUseNavigate).toHaveBeenCalledTimes(1);
      expect(mockUseNavigate).toHaveBeenCalledWith({
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

  describe('Readme', () => {
    it('does not render it when readme is null and displays no data message', async () => {
      const mockPackage = getMockPackage('7');
      mocked(API).getPackage.mockResolvedValue(mockPackage);

      render(
        <Router>
          <PackageView />
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
          <PackageView />
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
          <PackageView />
        </Router>
      );

      await waitFor(() => {
        expect(API.getPackage).toHaveBeenCalledTimes(1);
      });

      expect(await screen.findAllByText('Pretty name')).toHaveLength(2);

      expect(await screen.findByTestId('Verified publisher badge')).toBeInTheDocument();
    });
  });

  describe('Helm package', () => {
    it('renders CRDs button when are defined', async () => {
      const mockPackage = getMockPackage('10');
      mocked(API).getPackage.mockResolvedValue(mockPackage);

      render(
        <Router>
          <PackageView />
        </Router>
      );

      await waitFor(() => {
        expect(API.getPackage).toHaveBeenCalledTimes(1);
      });

      expect(await screen.findAllByText('Pretty name')).toHaveLength(2);

      expect(await screen.findByText('CRDs')).toBeInTheDocument();
    });
  });

  describe('OLM package', () => {
    it('renders CRDs button from crds prop when is defined', async () => {
      const mockPackage = getMockPackage('11');
      mocked(API).getPackage.mockResolvedValue(mockPackage);

      render(
        <Router>
          <PackageView />
        </Router>
      );

      await waitFor(() => {
        expect(API.getPackage).toHaveBeenCalledTimes(1);
      });

      expect(await screen.findAllByText('Akka Cluster Operator')).toHaveLength(2);

      expect(await screen.findByText('CRDs')).toBeInTheDocument();
    });
  });

  describe('Falco rules', () => {
    it('renders rules properly', async () => {
      const mockPackage = getMockPackage('12');
      mocked(API).getPackage.mockResolvedValue(mockPackage);

      render(
        <Router>
          <PackageView />
        </Router>
      );

      await waitFor(() => {
        expect(API.getPackage).toHaveBeenCalledTimes(1);
      });

      expect(await screen.findAllByText('CVE-2019-14287')).toHaveLength(2);
      expect(await screen.findByText('Rules')).toBeInTheDocument();
    });
  });

  describe('Tekton task', () => {
    it('renders task properly', async () => {
      const mockPackage = getMockPackage('13');
      mocked(API).getPackage.mockResolvedValue(mockPackage);

      render(
        <Router>
          <PackageView />
        </Router>
      );

      await waitFor(() => {
        expect(API.getPackage).toHaveBeenCalledTimes(1);
      });

      expect(await screen.findAllByText('Tekton CLI')).toHaveLength(2);

      expect(await screen.findByText('Manifest')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Open Manifest' })).toBeInTheDocument();

      expect(await screen.findByText('Examples')).toBeInTheDocument();
      expect(await screen.findByText('Supported Platforms')).toBeInTheDocument();
      const platforms = screen.getAllByTestId('platformBadge');
      expect(platforms).toHaveLength(3);
    });
  });

  describe('Krew kubectl plugin', () => {
    it('renders plugin properly', async () => {
      const mockPackage = getMockPackage('14');
      mocked(API).getPackage.mockResolvedValue(mockPackage);

      render(
        <Router>
          <PackageView />
        </Router>
      );

      await waitFor(() => {
        expect(API.getPackage).toHaveBeenCalledTimes(1);
      });

      expect(await screen.findAllByText('advise-psp')).toHaveLength(3);
      expect(await screen.findByText('Manifest')).toBeInTheDocument();
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
            <PackageView />
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
        expect(await screen.findByText('Related packages')).toBeInTheDocument();
      });
    });

    it('excludes selected package from search results list', async () => {
      const mockPackage = getMockPackage('15');
      mocked(API).getPackage.mockResolvedValue(mockPackage);
      const mockPackages = getMockRelatedPackages('2');
      mocked(API).searchPackages.mockResolvedValue(mockPackages);

      render(
        <Router>
          <PackageView />
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
          <PackageView />
        </Router>
      );

      await waitFor(() => {
        expect(screen.queryAllByTestId('relatedPackageLink')).toHaveLength(8);
      });
    });

    describe('does not render', () => {
      it('when related packages list is empty', async () => {
        const mockPackage = getMockPackage('15');
        mocked(API).getPackage.mockResolvedValue(mockPackage);
        const mockPackages = getMockRelatedPackages('4');
        mocked(API).searchPackages.mockResolvedValue(mockPackages);

        render(
          <Router>
            <PackageView />
          </Router>
        );

        await waitFor(() => {
          expect(API.getPackage).toHaveBeenCalledTimes(1);
          expect(API.searchPackages).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {
          expect(screen.queryAllByTestId('relatedPackageLink')).toHaveLength(0);
        });
      });

      it('when list contains only selected package', async () => {
        const mockPackage = getMockPackage('15');
        mocked(API).getPackage.mockResolvedValue(mockPackage);
        const mockPackages = getMockRelatedPackages('5');
        mocked(API).searchPackages.mockResolvedValue(mockPackages);

        render(
          <Router>
            <PackageView />
          </Router>
        );

        await waitFor(() => {
          expect(API.getPackage).toHaveBeenCalledTimes(1);
          expect(API.searchPackages).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {
          expect(screen.queryAllByTestId('relatedPackageLink')).toHaveLength(0);
        });
      });

      it('when SearchPackages call fails', async () => {
        const mockPackage = getMockPackage('15');
        mocked(API).getPackage.mockResolvedValue(mockPackage);
        mocked(API).searchPackages.mockRejectedValue(null);

        render(
          <Router>
            <PackageView />
          </Router>
        );

        await waitFor(() => {
          expect(API.getPackage).toHaveBeenCalledTimes(1);
          expect(API.searchPackages).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {
          expect(screen.queryAllByTestId('relatedPackageLink')).toHaveLength(0);
        });
      });
    });
  });

  describe('Special section', () => {
    it('renders recommended pkgs', async () => {
      const mockPackage = getMockPackage('16');
      mocked(API).getPackage.mockResolvedValue(mockPackage);

      render(
        <Router>
          <PackageView />
        </Router>
      );

      await waitFor(() => {
        expect(API.getPackage).toHaveBeenCalledTimes(1);
      });

      expect(await screen.findByTestId('more-details-section')).toBeInTheDocument();
      expect(screen.getByText(/recommended by the publisher/)).toBeInTheDocument();

      const pkgs = await screen.findAllByTestId('recommended-pkg');
      expect(pkgs).toHaveLength(2);
      expect(pkgs[0]).toHaveTextContent('artifact-hub');
      expect(pkgs[1]).toHaveTextContent('kube-prometheus-stack');
    });

    it('renders only recommended pkgs with valid urls', async () => {
      const mockPackage = getMockPackage('16a');
      mocked(API).getPackage.mockResolvedValue(mockPackage);

      render(
        <Router>
          <PackageView />
        </Router>
      );

      await waitFor(() => {
        expect(API.getPackage).toHaveBeenCalledTimes(1);
      });

      expect(await screen.findByTestId('more-details-section')).toBeInTheDocument();
      expect(screen.getByText(/recommended by the publisher/)).toBeInTheDocument();

      const pkgs = await screen.findAllByTestId('recommended-pkg');
      expect(pkgs).toHaveLength(1);
      expect(pkgs[0]).toHaveTextContent('artifact-hub');
    });

    it('does not renders recommended pkgs with not valid urls', async () => {
      const mockPackage = getMockPackage('16b');
      mocked(API).getPackage.mockResolvedValue(mockPackage);

      render(
        <Router>
          <PackageView />
        </Router>
      );

      await waitFor(() => {
        expect(API.getPackage).toHaveBeenCalledTimes(1);
      });

      expect(await screen.findAllByText('Pretty name')).toHaveLength(2);

      expect(screen.queryByTestId('more-details-section')).toBeNull();
    });

    it('does not render when recommended and production usage are undefined', async () => {
      const mockPackage = getMockPackage('18');
      mocked(API).getPackage.mockResolvedValue(mockPackage);

      render(
        <Router>
          <PackageView />
        </Router>
      );

      await waitFor(() => {
        expect(API.getPackage).toHaveBeenCalledTimes(1);
      });

      expect(await screen.findAllByText('Pretty name')).toHaveLength(2);

      await waitFor(() => {
        expect(screen.queryAllByTestId('more-details-section')).toHaveLength(0);
      });
    });
  });
});
