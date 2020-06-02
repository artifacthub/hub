import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import { Package } from '../../types';
import prepareQuerystring from '../../utils/prepareQueryString';
import Details from './Details';

const getMockPackage = (fixtureId: string): Package => {
  return require(`./__fixtures__/details/${fixtureId}.json`) as Package;
};

const testsOrder = [
  { versions: [], sortedVersions: [] },
  {
    versions: ['0.10.0', '0.11.0', '0.12.0', '0.13.0', '0.14.0'],
    sortedVersions: ['0.14.0', '0.13.0', '0.12.0'],
  },
  {
    versions: ['1.3.1', '1.3.10', '1.3.3', '1.3.5', '1.3.6'],
    sortedVersions: ['1.3.10', '1.3.6', '1.3.5'],
  },
  {
    versions: ['1.8.2', '1.9.0', '1.9.1', '2.0.0-rc1', '2.0.0-rc2'],
    sortedVersions: ['2.0.0-rc2', '2.0.0-rc1', '1.9.1'],
  },
  {
    versions: ['0.4.0', '0.5', '0.5.1', '0.6'],
    sortedVersions: ['0.5.1', '0.4.0', '0.5'],
  },
  { versions: ['0.1.0', '0.1.1', '0.1.2', '1.1.1'], sortedVersions: ['1.1.1', '0.1.2', '0.1.1'] },
];

const mockHistoryPush = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({
    push: mockHistoryPush,
  }),
}));

describe('Details', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders correctly', () => {
    const mockPackage = getMockPackage('1');
    const { asFragment } = render(
      <Details
        package={mockPackage}
        searchUrlReferer={{
          text: 'test',
          pageNumber: 1,
          filters: {},
          deprecated: false,
        }}
      />
    );
    expect(asFragment).toMatchSnapshot();
  });

  describe('Application version', () => {
    it('renders correct app version', () => {
      const mockPackage = getMockPackage('2');
      const { queryByText } = render(<Details package={mockPackage} />);
      expect(queryByText(mockPackage.appVersion)).toBeInTheDocument();
    });

    it('renders placeholder when no app version', () => {
      const mockPackage = getMockPackage('3');
      const { queryByTestId } = render(<Details package={mockPackage} />);

      const appVersion = queryByTestId('appVersion');
      expect(appVersion).toBeInTheDocument();
      expect(appVersion).toHaveTextContent('-');
    });
  });

  describe('Keywords', () => {
    it('renders 3 keywords', () => {
      const mockPackage = getMockPackage('4');
      const { queryByTestId } = render(<Details package={mockPackage} />);

      const keywords = queryByTestId('keywords');
      expect(keywords?.children).toHaveLength(mockPackage.keywords!.length);
      expect(keywords?.children[0]).toHaveTextContent(mockPackage.keywords![0]);
    });

    it('renders placeholder when no keywords', () => {
      const mockPackage = getMockPackage('5');
      const { queryByTestId } = render(<Details package={mockPackage} />);

      const keywords = queryByTestId('keywords');
      expect(keywords).toBeInTheDocument();
      expect(keywords).toHaveTextContent('-');
    });

    it('calls history push on keyword click', () => {
      const mockPackage = getMockPackage('6');
      const { queryByText } = render(<Details package={mockPackage} />);

      const keywordBtn = queryByText(mockPackage.keywords![0])?.closest('button');
      expect(keywordBtn).toBeInTheDocument();
      fireEvent.click(keywordBtn!);
      expect(mockHistoryPush).toHaveBeenCalledTimes(1);
      expect(mockHistoryPush).toHaveBeenCalledWith({
        pathname: '/packages/search',
        search: prepareQuerystring({
          text: mockPackage.keywords![0],
          pageNumber: 1,
          filters: {},
          deprecated: false,
        }),
      });
    });
  });

  describe('Maintainers', () => {
    it('renders 2 maintainers', () => {
      const mockPackage = getMockPackage('7');
      const { queryByTestId, queryByText } = render(<Details package={mockPackage} />);

      const maintainers = queryByTestId('maintainers');
      expect(maintainers?.children).toHaveLength(2);

      const firstMaintainer = queryByText(mockPackage.maintainers![0].name!);
      expect(firstMaintainer?.closest('a')).toHaveAttribute('href', `mailto:${mockPackage.maintainers![0].email}`);
    });

    it('renders placeholder when no maintainers', () => {
      const mockPackage = getMockPackage('8');
      const { queryByTestId } = render(<Details package={mockPackage} />);

      const maintainers = queryByTestId('maintainers');
      expect(maintainers).toBeInTheDocument();
      expect(maintainers).toHaveTextContent('-');
    });
  });

  describe('Home url', () => {
    it('renders correctly', () => {
      const mockPackage = getMockPackage('9');
      const { queryByText } = render(<Details package={mockPackage} />);
      const homeUrl = queryByText('Homepage');
      expect(homeUrl).toBeInTheDocument();
      expect(homeUrl).toHaveAttribute('href', mockPackage.homeUrl);
    });
  });

  describe('Package versions', () => {
    it('renders correctly', () => {
      const mockPackage = getMockPackage('11');
      const { queryByTestId, queryAllByTestId } = render(<Details package={mockPackage} />);

      const chartVersions = queryByTestId('chartVersions');
      expect(chartVersions).toBeInTheDocument();
      const versions = queryAllByTestId('version');
      expect(versions).toHaveLength(2);
    });

    it('renders placeholder when no versions', () => {
      const mockPackage = getMockPackage('12');
      const { queryByTestId } = render(<Details package={mockPackage} />);

      const versions = queryByTestId('versions');
      expect(versions).toBeInTheDocument();
      expect(versions).toHaveTextContent('-');
    });
  });

  describe('Versions order', () => {
    const mockPackage = getMockPackage('13');
    for (let i = 0; i < testsOrder.length; i++) {
      it('renders proper order', () => {
        const { queryAllByTestId } = render(
          <Details
            package={{
              ...mockPackage,
              availableVersions: testsOrder[i].versions,
            }}
          />
        );

        const versions = queryAllByTestId('version');
        expect(versions).toHaveLength(testsOrder[i].sortedVersions.length);
        for (let v = 0; v < testsOrder[i].sortedVersions.length; v++) {
          expect(versions[v]).toHaveTextContent(testsOrder[i].sortedVersions[v]);
        }
      });
    }
  });

  describe('Not chart package renders', () => {
    it('renders correctly', () => {
      const mockPackage = getMockPackage('14');
      const { getByText, getAllByText } = render(<Details package={mockPackage} />);

      expect(getByText('Versions')).toBeInTheDocument();
      expect(getByText('Keywords')).toBeInTheDocument();

      expect(getByText('key1')).toBeInTheDocument();
      expect(getByText('key2')).toBeInTheDocument();
      expect(getAllByText('-')).toHaveLength(1);
    });
  });
});
