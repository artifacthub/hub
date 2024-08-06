import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter as Router } from 'react-router-dom';

import { Package, PackageLink, Version } from '../../types';
import { prepareQueryString } from '../../utils/prepareQueryString';
import sortPackageVersions from '../../utils/sortPackageVersions';
import Details from './Details';

const getMockPackage = (fixtureId: string): Package => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`./__fixtures__/Details/${fixtureId}.json`) as Package;
};

const mockUseNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as object),
  useNavigate: () => mockUseNavigate,
}));

jest.mock('react-markdown', () => () => <div />);

const defaultProps = {
  visibleSecurityReport: true,
  sortedVersions: [
    {
      version: '1.0.0',
      ts: 0,
      containsSecurityUpdates: false,
      prerelease: false,
    },
  ],
};

describe('Details', () => {
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

  it('renders correctly', () => {
    const mockPackage = getMockPackage('1');
    const { asFragment } = render(
      <Router>
        <Details {...defaultProps} package={mockPackage} />
      </Router>
    );
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Helm chart', () => {
    it('renders component', () => {
      const mockPackage = getMockPackage('2');

      render(
        <Router>
          <Details {...defaultProps} package={mockPackage} />
        </Router>
      );

      expect(screen.getByText('Application version')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('Kubernetes version')).toBeInTheDocument();
      expect(screen.getByText('Chart versions')).toBeInTheDocument();
      expect(screen.getByText('Last year activity')).toBeInTheDocument();
      expect(screen.queryByText('Links')).toBeNull();
      expect(screen.getByText('License')).toBeInTheDocument();
      expect(screen.getByText('Maintainers')).toBeInTheDocument();

      const maintainer = screen.getByText('maintainerName');
      expect(maintainer).toBeInTheDocument();
      expect(maintainer!.closest('a')).toHaveProperty('href', 'mailto:main@tainer.com');

      expect(screen.getByText('1.0.0')).toBeInTheDocument();
      expect(screen.getByText('-')).toBeInTheDocument();
      expect(screen.getAllByText('MIT')).toHaveLength(2);
    });

    describe('Application version', () => {
      it('renders correct app version', () => {
        const mockPackage = getMockPackage('3');
        render(
          <Router>
            <Details {...defaultProps} package={mockPackage} />
          </Router>
        );
        expect(screen.getByText(mockPackage.appVersion!)).toBeInTheDocument();
      });

      it("does not render app version when package hasn't", () => {
        const mockPackage = getMockPackage('4');
        render(
          <Router>
            <Details {...defaultProps} package={mockPackage} />
          </Router>
        );

        const appVersion = screen.queryByTestId('appVersion');
        expect(appVersion).toBeNull();
      });
    });

    describe('Keywords', () => {
      it('renders 3 keywords', () => {
        const mockPackage = getMockPackage('5');
        render(
          <Router>
            <Details {...defaultProps} package={mockPackage} />
          </Router>
        );

        const keywords = screen.getByTestId('keywords');
        expect(keywords!.children).toHaveLength(mockPackage.keywords!.length);
        expect(keywords!.children[0]).toHaveTextContent(mockPackage.keywords![0]);
      });

      it('calls navigate on keyword click', async () => {
        const mockPackage = getMockPackage('7');
        render(
          <Router>
            <Details {...defaultProps} package={mockPackage} />
          </Router>
        );

        const keywordBtn = screen.getByText(mockPackage.keywords![0])!.closest('button');
        expect(keywordBtn).toBeInTheDocument();
        await userEvent.click(keywordBtn!);

        await waitFor(() => {
          expect(mockUseNavigate).toHaveBeenCalledTimes(1);
          expect(mockUseNavigate).toHaveBeenCalledWith({
            pathname: '/packages/search',
            search: prepareQueryString({
              tsQueryWeb: mockPackage.keywords![0],
              pageNumber: 1,
            }),
          });
        });
      });
    });

    describe('Maintainers', () => {
      it('renders 2 maintainers', () => {
        const mockPackage = getMockPackage('8');
        render(
          <Router>
            <Details {...defaultProps} package={mockPackage} />
          </Router>
        );

        const maintainers = screen.getByTestId('maintainers');
        expect(maintainers.children).toHaveLength(2);

        const firstMaintainer = screen.getByText(mockPackage.maintainers![0].name!);
        expect(firstMaintainer!.closest('a')).toHaveAttribute('href', `mailto:${mockPackage.maintainers![0].email}`);
      });

      it('does not render maintaners when no maintainers', () => {
        const mockPackage = getMockPackage('9');
        render(
          <Router>
            <Details {...defaultProps} package={mockPackage} />
          </Router>
        );

        const maintainers = screen.queryByTestId('maintainers');
        expect(maintainers).toBeNull();
      });
    });

    describe('Home url', () => {
      it('renders correctly', () => {
        const mockPackage = getMockPackage('10');
        render(
          <Router>
            <Details {...defaultProps} package={mockPackage} />
          </Router>
        );
        const homeUrl = screen.getByText('Homepage');
        expect(homeUrl).toBeInTheDocument();
        expect(homeUrl.closest('a')).toHaveAttribute('href', mockPackage.homeUrl);
      });
    });

    describe('Package versions', () => {
      it('renders correctly', () => {
        const mockPackage = getMockPackage('11');
        render(
          <Router>
            <Details
              {...defaultProps}
              sortedVersions={sortPackageVersions(mockPackage.availableVersions!)}
              package={mockPackage}
            />
          </Router>
        );

        const versions = screen.getByTestId('versions');
        expect(versions).toBeInTheDocument();
        const versionsList = screen.getAllByRole('button', { name: /version/ });
        expect(versionsList).toHaveLength(2);
      });

      it('renders placeholder when no versions', () => {
        const mockPackage = getMockPackage('12');
        render(
          <Router>
            <Details
              {...defaultProps}
              sortedVersions={sortPackageVersions(mockPackage.availableVersions!)}
              package={mockPackage}
            />
          </Router>
        );

        const versions = screen.getByTestId(/versions/i);
        expect(versions).toBeInTheDocument();
        expect(versions).toHaveTextContent('-');
      });
    });

    describe('Not chart package renders', () => {
      it('renders correctly', () => {
        const mockPackage = getMockPackage('13');
        render(
          <Router>
            <Details {...defaultProps} package={mockPackage} />
          </Router>
        );

        expect(screen.getByText('Versions')).toBeInTheDocument();
        expect(screen.getByText('Keywords')).toBeInTheDocument();

        expect(screen.getByText('key1')).toBeInTheDocument();
        expect(screen.getByText('key2')).toBeInTheDocument();
        expect(screen.getAllByText('-')).toHaveLength(1);
      });
    });
  });

  describe('OLM operator', () => {
    it('renders component', () => {
      const mockPackage = getMockPackage('14');
      render(
        <Router>
          <Details
            package={mockPackage}
            {...defaultProps}
            sortedVersions={[
              {
                version: '1.0.0',
                ts: 0,
                containsSecurityUpdates: false,
                prerelease: false,
              },
              { version: '0.2.0', ts: 0, containsSecurityUpdates: false, prerelease: false },
              { version: '0.2.3', ts: 0, containsSecurityUpdates: false, prerelease: false },
            ]}
          />
        </Router>
      );

      expect(screen.getByText('Versions')).toBeInTheDocument();
      mockPackage.availableVersions!.forEach((vs: Version) => {
        expect(screen.getByText(vs.version)).toBeInTheDocument();
      });

      expect(screen.getByText('Capability Level')).toBeInTheDocument();
      const steps = screen.getAllByTestId('capabilityLevelStep');
      expect(steps[0]).toHaveClass('activeStep');
      expect(steps[1]).toHaveClass('activeStep');
      expect(steps[2]).not.toHaveClass('activeStep');
      expect(steps[3]).not.toHaveClass('activeStep');
      expect(steps[4]).not.toHaveClass('activeStep');

      expect(screen.getByText('Provider')).toBeInTheDocument();
      expect(screen.getByText(mockPackage.provider!)).toBeInTheDocument();

      expect(screen.getByText('Links')).toBeInTheDocument();
      const homepage = screen.getByText('source');
      expect(homepage).toBeInTheDocument();
      expect(homepage.closest('a')).toHaveProperty('href', mockPackage.links![0].url);
      mockPackage.links!.forEach((link: PackageLink) => {
        expect(screen.getByText(link.name)).toBeInTheDocument();
      });

      expect(screen.getByText('Maintainers')).toBeInTheDocument();
      expect(screen.getByTestId('maintainers')).toBeInTheDocument();
      const maintainer1 = screen.getByText(mockPackage.maintainers![0].name!);
      expect(maintainer1).toBeInTheDocument();
      expect(maintainer1.closest('a')).toHaveProperty('href', `mailto:${mockPackage.maintainers![0].email}`);

      expect(screen.getByText('License')).toBeInTheDocument();
      expect(screen.getAllByText(mockPackage.license!)).toHaveLength(2);

      expect(screen.getAllByText(/Containers Images/)).toHaveLength(2);
      expect(screen.getAllByTestId('containerImage')).toHaveLength(2);
      expect(screen.getAllByTestId('containerImage')[0]).toHaveTextContent(mockPackage.containersImages![0].image);

      expect(screen.getByText('Keywords')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem', { name: /Filter by/ })).toHaveLength(mockPackage.keywords!.length);
    });
  });

  describe('OPA policy', () => {
    it('renders component', () => {
      const mockPackage = getMockPackage('16');
      render(
        <Router>
          <Details package={mockPackage} {...defaultProps} />
        </Router>
      );

      expect(screen.getByText('Versions')).toBeInTheDocument();
      expect(screen.getByText('1.0.0')).toBeInTheDocument();

      expect(screen.getByText('Provider')).toBeInTheDocument();
      expect(screen.getByText(mockPackage.provider!)).toBeInTheDocument();

      expect(screen.getByText('Links')).toBeInTheDocument();
      const homepage = screen.getByText('source');
      expect(homepage).toBeInTheDocument();
      expect(homepage.closest('a')).toHaveProperty('href', mockPackage.links![0].url);

      expect(screen.getByText('Maintainers')).toBeInTheDocument();
      expect(screen.getByTestId('maintainers')).toBeInTheDocument();
      const maintainer1 = screen.getByText(mockPackage.maintainers![0].name!);
      expect(maintainer1).toBeInTheDocument();
      expect(maintainer1.closest('a')).toHaveProperty('href', `mailto:${mockPackage.maintainers![0].email}`);

      expect(screen.getByText('License')).toBeInTheDocument();
      expect(screen.getAllByText(mockPackage.license!)).toHaveLength(2);

      expect(screen.getAllByText(/Containers Images/)).toHaveLength(2);
      expect(screen.getAllByTestId('containerImage')).toHaveLength(2);
      expect(screen.getAllByTestId('containerImage')[0]).toHaveTextContent(mockPackage.containersImages![0].image);

      expect(screen.getByText('Keywords')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem', { name: /Filter by/ })).toHaveLength(mockPackage.keywords!.length);
    });
  });

  describe('Falco rule', () => {
    it('renders component', () => {
      const mockPackage = getMockPackage('17');
      render(
        <Router>
          <Details package={mockPackage} {...defaultProps} />
        </Router>
      );

      expect(screen.getByText('Versions')).toBeInTheDocument();
      expect(screen.getByText('License')).toBeInTheDocument();
      expect(screen.getByText('Keywords')).toBeInTheDocument();

      expect(screen.getByText('key1')).toBeInTheDocument();
      expect(screen.getByText('key2')).toBeInTheDocument();
      expect(screen.getAllByText('MIT')).toHaveLength(2);
      expect(screen.getAllByText('-')).toHaveLength(1);
    });
  });

  describe('Tekton task', () => {
    it('renders component', () => {
      const mockPackage = getMockPackage('18');
      render(
        <Router>
          <Details package={mockPackage} {...defaultProps} />
        </Router>
      );

      expect(screen.getByText('Versions')).toBeInTheDocument();
      expect(screen.getByText('Pipeline minimal version')).toBeInTheDocument();
      expect(screen.getByText('Keywords')).toBeInTheDocument();

      expect(screen.getByText('tekton')).toBeInTheDocument();
      expect(screen.getByText('task')).toBeInTheDocument();
      expect(screen.getByText('cli')).toBeInTheDocument();
    });
  });

  describe('Tekton pipeline', () => {
    it('renders component', () => {
      const mockPackage = getMockPackage('19');
      render(
        <Router>
          <Details package={mockPackage} {...defaultProps} />
        </Router>
      );

      expect(screen.getByText('Versions')).toBeInTheDocument();
      expect(screen.getByText('Pipeline minimal version')).toBeInTheDocument();
      expect(screen.getByText('Tasks')).toBeInTheDocument();
      expect(screen.getAllByText('Run After:')).toHaveLength(2);
      expect(screen.getByText('Keywords')).toBeInTheDocument();

      expect(screen.getByText('tekton')).toBeInTheDocument();
      expect(screen.getByText('pipeline')).toBeInTheDocument();
    });
  });

  describe('Argo template', () => {
    it('renders component', () => {
      const mockPackage = getMockPackage('20');
      render(
        <Router>
          <Details package={mockPackage} {...defaultProps} />
        </Router>
      );

      expect(screen.getByText('Versions')).toBeInTheDocument();
      expect(screen.getByText('Workflows version')).toBeInTheDocument();
      expect(screen.getByTestId('argoVersion')).toBeInTheDocument();
    });
  });
});
