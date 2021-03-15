import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import { Package, PackageLink, Version } from '../../types';
import prepareQuerystring from '../../utils/prepareQueryString';
import sortPackageVersions from '../../utils/sortPackageVersions';
import Details from './Details';

const getMockPackage = (fixtureId: string): Package => {
  return require(`./__fixtures__/Details/${fixtureId}.json`) as Package;
};

const mockHistoryPush = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as {}),
  useHistory: () => ({
    push: mockHistoryPush,
  }),
}));

const mockOnChannelChange = jest.fn();

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
  activeChannel: null,
  onChannelChange: mockOnChannelChange,
};

describe('Details', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders correctly', () => {
    const mockPackage = getMockPackage('1');
    const { asFragment } = render(
      <Details
        {...defaultProps}
        package={mockPackage}
        searchUrlReferer={{
          tsQueryWeb: 'test',
          pageNumber: 1,
          filters: {},
        }}
      />
    );
    expect(asFragment).toMatchSnapshot();
  });

  describe('Helm chart', () => {
    it('renders component', () => {
      const mockPackage = getMockPackage('2');

      const { getByText, queryByText, getAllByText } = render(
        <Details
          {...defaultProps}
          package={mockPackage}
          searchUrlReferer={{
            tsQueryWeb: 'test',
            pageNumber: 1,
            filters: {},
          }}
        />
      );

      expect(getByText('Application version')).toBeInTheDocument();
      expect(getByText('Type')).toBeInTheDocument();
      expect(getByText('Kubernetes version')).toBeInTheDocument();
      expect(getByText('Chart versions')).toBeInTheDocument();
      expect(queryByText('Links')).toBeNull();
      expect(getByText('License')).toBeInTheDocument();
      expect(getByText('Maintainers')).toBeInTheDocument();
      expect(getByText('Keywords')).toBeInTheDocument();

      const maintainer = queryByText('maintainerName');
      expect(maintainer).toBeInTheDocument();
      expect(maintainer!.closest('a')).toHaveProperty('href', 'mailto:main@tainer.com');

      expect(getByText('1.0.0')).toBeInTheDocument();
      expect(getAllByText('-')).toHaveLength(2);
      expect(getByText('MIT')).toBeInTheDocument();
    });

    describe('Application version', () => {
      it('renders correct app version', () => {
        const mockPackage = getMockPackage('3');
        const { queryByText } = render(<Details {...defaultProps} package={mockPackage} />);
        expect(queryByText(mockPackage.appVersion!)).toBeInTheDocument();
      });

      it("does not render app version when package hasn't", () => {
        const mockPackage = getMockPackage('4');
        const { queryByTestId } = render(<Details {...defaultProps} package={mockPackage} />);

        const appVersion = queryByTestId('appVersion');
        expect(appVersion).toBeNull();
      });
    });

    describe('Keywords', () => {
      it('renders 3 keywords', () => {
        const mockPackage = getMockPackage('5');
        const { queryByTestId } = render(<Details {...defaultProps} package={mockPackage} />);

        const keywords = queryByTestId('keywords');
        expect(keywords?.children).toHaveLength(mockPackage.keywords!.length);
        expect(keywords?.children[0]).toHaveTextContent(mockPackage.keywords![0]);
      });

      it('renders placeholder when no keywords', () => {
        const mockPackage = getMockPackage('6');
        const { queryByTestId } = render(<Details {...defaultProps} package={mockPackage} />);

        const keywords = queryByTestId('keywords');
        expect(keywords).toBeInTheDocument();
        expect(keywords).toHaveTextContent('-');
      });

      it('calls history push on keyword click', () => {
        const mockPackage = getMockPackage('7');
        const { queryByText } = render(<Details {...defaultProps} package={mockPackage} />);

        const keywordBtn = queryByText(mockPackage.keywords![0])?.closest('button');
        expect(keywordBtn).toBeInTheDocument();
        fireEvent.click(keywordBtn!);
        expect(mockHistoryPush).toHaveBeenCalledTimes(1);
        expect(mockHistoryPush).toHaveBeenCalledWith({
          pathname: '/packages/search',
          search: prepareQuerystring({
            tsQueryWeb: mockPackage.keywords![0],
            pageNumber: 1,
            filters: {},
          }),
        });
      });
    });

    describe('Maintainers', () => {
      it('renders 2 maintainers', () => {
        const mockPackage = getMockPackage('8');
        const { queryByTestId, queryByText } = render(<Details {...defaultProps} package={mockPackage} />);

        const maintainers = queryByTestId('maintainers');
        expect(maintainers?.children).toHaveLength(2);

        const firstMaintainer = queryByText(mockPackage.maintainers![0].name!);
        expect(firstMaintainer?.closest('a')).toHaveAttribute('href', `mailto:${mockPackage.maintainers![0].email}`);
      });

      it('does not render maintaners when no maintainers', () => {
        const mockPackage = getMockPackage('9');
        const { queryByTestId } = render(<Details {...defaultProps} package={mockPackage} />);

        const maintainers = queryByTestId('maintainers');
        expect(maintainers).toBeNull();
      });
    });

    describe('Home url', () => {
      it('renders correctly', () => {
        const mockPackage = getMockPackage('10');
        const { getByText } = render(<Details {...defaultProps} package={mockPackage} />);
        const homeUrl = getByText('Homepage');
        expect(homeUrl).toBeInTheDocument();
        expect(homeUrl.closest('a')).toHaveAttribute('href', mockPackage.homeUrl);
      });
    });

    describe('Package versions', () => {
      it('renders correctly', () => {
        const mockPackage = getMockPackage('11');
        const { queryByTestId, queryAllByTestId } = render(
          <Details
            {...defaultProps}
            sortedVersions={sortPackageVersions(mockPackage.availableVersions!)}
            package={mockPackage}
          />
        );

        const versions = queryByTestId('versions');
        expect(versions).toBeInTheDocument();
        const versionsList = queryAllByTestId('version');
        expect(versionsList).toHaveLength(2);
      });

      it('renders placeholder when no versions', () => {
        const mockPackage = getMockPackage('12');
        const { queryByTestId } = render(
          <Details
            {...defaultProps}
            sortedVersions={sortPackageVersions(mockPackage.availableVersions!)}
            package={mockPackage}
          />
        );

        const versions = queryByTestId(/versions/i);
        expect(versions).toBeInTheDocument();
        expect(versions).toHaveTextContent('-');
      });
    });

    describe('Not chart package renders', () => {
      it('renders correctly', () => {
        const mockPackage = getMockPackage('13');
        const { getByText, getAllByText } = render(<Details {...defaultProps} package={mockPackage} />);

        expect(getByText('Versions')).toBeInTheDocument();
        expect(getByText('Keywords')).toBeInTheDocument();

        expect(getByText('key1')).toBeInTheDocument();
        expect(getByText('key2')).toBeInTheDocument();
        expect(getAllByText('-')).toHaveLength(1);
      });
    });
  });

  describe('OLM operator', () => {
    it('renders component', () => {
      const mockPackage = getMockPackage('14');
      const { getByText, getByLabelText, getByTestId, getAllByTestId } = render(
        <Details
          package={mockPackage}
          {...defaultProps}
          activeChannel="alpha"
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
      );

      expect(getByText('Channel')).toBeInTheDocument();
      expect(getByLabelText('channel-select')).toBeInTheDocument();
      expect(getByText(mockPackage.channels![0].name));

      expect(getByText('Versions')).toBeInTheDocument();
      mockPackage.availableVersions!.forEach((vs: Version) => {
        expect(getByText(vs.version)).toBeInTheDocument();
      });

      expect(getByText('Capability Level')).toBeInTheDocument();
      const steps = getAllByTestId('capabilityLevelStep');
      expect(steps[0]).toHaveClass('activeStep');
      expect(steps[1]).toHaveClass('activeStep');
      expect(steps[2]).not.toHaveClass('activeStep');
      expect(steps[3]).not.toHaveClass('activeStep');
      expect(steps[4]).not.toHaveClass('activeStep');

      expect(getByText('Provider')).toBeInTheDocument();
      expect(getByText(mockPackage.provider!)).toBeInTheDocument();

      expect(getByText('Links')).toBeInTheDocument();
      const homepage = getByText('source');
      expect(homepage).toBeInTheDocument();
      expect(homepage.closest('a')).toHaveProperty('href', mockPackage.links![0].url);
      mockPackage.links!.forEach((link: PackageLink) => {
        expect(getByText(link.name)).toBeInTheDocument();
      });

      expect(getByText('Maintainers')).toBeInTheDocument();
      expect(getByTestId('maintainers')).toBeInTheDocument();
      const maintainer1 = getByText(mockPackage.maintainers![0].name!);
      expect(maintainer1).toBeInTheDocument();
      expect(maintainer1.closest('a')).toHaveProperty('href', `mailto:${mockPackage.maintainers![0].email}`);

      expect(getByText('License')).toBeInTheDocument();
      expect(getByText(mockPackage.license!)).toBeInTheDocument();

      expect(getByText(/Containers Images/g)).toBeInTheDocument();
      expect(getByTestId('containerImage')).toBeInTheDocument();
      expect(getByTestId('containerImage')).toHaveTextContent(mockPackage.containersImages![0].image);

      expect(getByText('Keywords')).toBeInTheDocument();
      expect(getAllByTestId('keywordBtn')).toHaveLength(mockPackage.keywords!.length);
    });

    it('calls onChannelChange', () => {
      const mockPackage = getMockPackage('15');
      const { getByText, getByLabelText } = render(
        <Details package={mockPackage} {...defaultProps} activeChannel="alpha" />
      );

      expect(getByText('Channel')).toBeInTheDocument();
      const select = getByLabelText('channel-select');
      expect(getByText('alpha')).toBeInTheDocument();
      expect(getByText('original')).toBeInTheDocument();
      fireEvent.change(select, { target: { value: 'original' } });

      expect(mockOnChannelChange).toHaveBeenCalledTimes(1);
      expect(mockOnChannelChange).toHaveBeenCalledWith('original');
    });
  });

  describe('OPA policy', () => {
    it('renders component', () => {
      const mockPackage = getMockPackage('16');
      const { getByText, getByTestId, getAllByTestId } = render(<Details package={mockPackage} {...defaultProps} />);

      expect(getByText('Versions')).toBeInTheDocument();
      expect(getByText('1.0.0')).toBeInTheDocument();

      expect(getByText('Provider')).toBeInTheDocument();
      expect(getByText(mockPackage.provider!)).toBeInTheDocument();

      expect(getByText('Links')).toBeInTheDocument();
      const homepage = getByText('source');
      expect(homepage).toBeInTheDocument();
      expect(homepage.closest('a')).toHaveProperty('href', mockPackage.links![0].url);

      expect(getByText('Maintainers')).toBeInTheDocument();
      expect(getByTestId('maintainers')).toBeInTheDocument();
      const maintainer1 = getByText(mockPackage.maintainers![0].name!);
      expect(maintainer1).toBeInTheDocument();
      expect(maintainer1.closest('a')).toHaveProperty('href', `mailto:${mockPackage.maintainers![0].email}`);

      expect(getByText('License')).toBeInTheDocument();
      expect(getByText(mockPackage.license!)).toBeInTheDocument();

      expect(getByText(/Containers Images/g)).toBeInTheDocument();
      expect(getByTestId('containerImage')).toBeInTheDocument();
      expect(getByTestId('containerImage')).toHaveTextContent(mockPackage.containersImages![0].image);

      expect(getByText('Keywords')).toBeInTheDocument();
      expect(getAllByTestId('keywordBtn')).toHaveLength(mockPackage.keywords!.length);
    });
  });

  describe('Falco rule', () => {
    it('renders component', () => {
      const mockPackage = getMockPackage('17');
      const { getByText, getAllByText } = render(<Details package={mockPackage} {...defaultProps} />);

      expect(getByText('Versions')).toBeInTheDocument();
      expect(getByText('License')).toBeInTheDocument();
      expect(getByText('Keywords')).toBeInTheDocument();

      expect(getByText('key1')).toBeInTheDocument();
      expect(getByText('key2')).toBeInTheDocument();
      expect(getByText('MIT')).toBeInTheDocument();
      expect(getAllByText('-')).toHaveLength(1);
    });
  });

  describe('Tekton task', () => {
    it('renders component', () => {
      const mockPackage = getMockPackage('18');
      const { getByText } = render(<Details package={mockPackage} {...defaultProps} />);

      expect(getByText('Versions')).toBeInTheDocument();
      expect(getByText('Pipeline minimal version')).toBeInTheDocument();
      expect(getByText('Keywords')).toBeInTheDocument();

      expect(getByText('tekton')).toBeInTheDocument();
      expect(getByText('task')).toBeInTheDocument();
      expect(getByText('cli')).toBeInTheDocument();
    });
  });
});
