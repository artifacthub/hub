import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import { Package } from '../../types';
import prepareQuerystring from '../../utils/prepareQueryString';
import sortPackageVersions from '../../utils/sortPackageVersions';
import Details from './Details';

const getMockPackage = (fixtureId: string): Package => {
  return require(`./__fixtures__/details/${fixtureId}.json`) as Package;
};

const mockHistoryPush = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as {}),
  useHistory: () => ({
    push: mockHistoryPush,
  }),
}));

const defaultProps = {
  sortedVersions: [],
  activeChannel: null,
  onChannelChange: jest.fn(),
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

  describe('Application version', () => {
    it('renders correct app version', () => {
      const mockPackage = getMockPackage('2');
      const { queryByText } = render(<Details {...defaultProps} package={mockPackage} />);
      expect(queryByText(mockPackage.appVersion)).toBeInTheDocument();
    });

    it("does not render app version when package hasn't", () => {
      const mockPackage = getMockPackage('3');
      const { queryByTestId } = render(<Details {...defaultProps} package={mockPackage} />);

      const appVersion = queryByTestId('appVersion');
      expect(appVersion).toBeNull();
    });
  });

  describe('Keywords', () => {
    it('renders 3 keywords', () => {
      const mockPackage = getMockPackage('4');
      const { queryByTestId } = render(<Details {...defaultProps} package={mockPackage} />);

      const keywords = queryByTestId('keywords');
      expect(keywords?.children).toHaveLength(mockPackage.keywords!.length);
      expect(keywords?.children[0]).toHaveTextContent(mockPackage.keywords![0]);
    });

    it('renders placeholder when no keywords', () => {
      const mockPackage = getMockPackage('5');
      const { queryByTestId } = render(<Details {...defaultProps} package={mockPackage} />);

      const keywords = queryByTestId('keywords');
      expect(keywords).toBeInTheDocument();
      expect(keywords).toHaveTextContent('-');
    });

    it('calls history push on keyword click', () => {
      const mockPackage = getMockPackage('6');
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
      const mockPackage = getMockPackage('7');
      const { queryByTestId, queryByText } = render(<Details {...defaultProps} package={mockPackage} />);

      const maintainers = queryByTestId('maintainers');
      expect(maintainers?.children).toHaveLength(2);

      const firstMaintainer = queryByText(mockPackage.maintainers![0].name!);
      expect(firstMaintainer?.closest('a')).toHaveAttribute('href', `mailto:${mockPackage.maintainers![0].email}`);
    });

    it('does not render maintaners when no maintainers', () => {
      const mockPackage = getMockPackage('8');
      const { queryByTestId } = render(<Details {...defaultProps} package={mockPackage} />);

      const maintainers = queryByTestId('maintainers');
      expect(maintainers).toBeNull();
    });
  });

  describe('Home url', () => {
    it('renders correctly', () => {
      const mockPackage = getMockPackage('9');
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

      const chartVersions = queryByTestId('chartVersions');
      expect(chartVersions).toBeInTheDocument();
      const versions = queryAllByTestId('version');
      expect(versions).toHaveLength(2);
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
      const mockPackage = getMockPackage('14');
      const { getByText, getAllByText } = render(<Details {...defaultProps} package={mockPackage} />);

      expect(getByText('Versions')).toBeInTheDocument();
      expect(getByText('Keywords')).toBeInTheDocument();

      expect(getByText('key1')).toBeInTheDocument();
      expect(getByText('key2')).toBeInTheDocument();
      expect(getAllByText('-')).toHaveLength(1);
    });
  });
});
