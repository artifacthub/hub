import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import Details from './Details';
import prepareQuerystring from '../../utils/prepareQueryString';
import { Package } from '../../types';

const getMockPackage = (fixtureId: string): Package => {
  return require(`./__fixtures__/details/${fixtureId}.json`) as Package;
};

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
          filters: {}
        }}
      />
    );
    expect(asFragment).toMatchSnapshot();
  });

  describe('Application version', () => {
    it('renders correct app version', () => {
      const mockPackage = getMockPackage('2');
      const { queryByText } = render(
        <Details
          package={mockPackage}
          searchUrlReferer={null}
        />
      );
      expect(queryByText(mockPackage.appVersion)).toBeInTheDocument();
    });

    it('renders placeholder when no app version', () => {
      const mockPackage = getMockPackage('3');
      const { queryByTestId } = render(
        <Details
          package={mockPackage}
          searchUrlReferer={null}
        />
      );

      const appVersion = queryByTestId('appVersion');
      expect(appVersion).toBeInTheDocument();
      expect(appVersion?.textContent).toBe('-');
    });
  });

  describe('Keywords', () => {
    it('renders 3 keywords', () => {
      const mockPackage = getMockPackage('4');
      const { queryByTestId } = render(
        <Details
          package={mockPackage}
          searchUrlReferer={null}
        />
      );

      const keywords = queryByTestId('keywords');
      expect(keywords?.children).toHaveLength(mockPackage.keywords!.length);
      expect(keywords?.children[0].textContent).toBe(mockPackage.keywords![0]);
    });

    it('renders placeholder when no keywords', () => {
      const mockPackage = getMockPackage('5');
      const { queryByTestId } = render(
        <Details
          package={mockPackage}
          searchUrlReferer={null}
        />
      );

      const keywords = queryByTestId('keywords');
      expect(keywords).toBeInTheDocument();
      expect(keywords?.textContent).toBe('-');
    });

    it('calls history push on keyword click', () => {
      const mockPackage = getMockPackage('6');
      const { queryByText } = render(
        <Details
          package={mockPackage}
          searchUrlReferer={null}
        />
      );

      const keywordBtn = queryByText(mockPackage.keywords![0])?.closest('button');
      expect(keywordBtn).toBeInTheDocument();
      fireEvent.click(keywordBtn!);
      expect(mockHistoryPush).toHaveBeenCalledTimes(1);
      expect(mockHistoryPush).toHaveBeenCalledWith({
        pathname: '/search',
        search: prepareQuerystring({
          text: mockPackage.keywords![0],
          pageNumber: 1,
          filters: {},
        }),
      });
    });
  });

  describe('Maintainers', () => {
    it('renders 2 maintainers', () => {
      const mockPackage = getMockPackage('7');
      const { queryByTestId, queryByText } = render(
        <Details
          package={mockPackage}
          searchUrlReferer={null}
        />
      );

      const maintainers = queryByTestId('maintainers');
      expect(maintainers?.children).toHaveLength(2);

      const firstMaintainer = queryByText(mockPackage.maintainers![0].name!);
      expect(firstMaintainer?.closest('a')).toHaveAttribute('href', `mailto:${mockPackage.maintainers![0].email}`);
    });

    it('renders placeholder when no maintainers', () => {
      const mockPackage = getMockPackage('8');
      const { queryByTestId } = render(
        <Details
          package={mockPackage}
          searchUrlReferer={null}
        />
      );

      const maintainers = queryByTestId('maintainers');
      expect(maintainers).toBeInTheDocument();
      expect(maintainers?.textContent).toBe('-');
    });
  });

  describe('Home url', () => {
    it('renders correctly', () => {
      const mockPackage = getMockPackage('9');
      const { queryByText } = render(
        <Details
          package={mockPackage}
          searchUrlReferer={null}
        />
      );
      const homeUrl = queryByText('Home url');
      expect(homeUrl).toBeInTheDocument();
      expect(homeUrl).toHaveAttribute('href', mockPackage.homeUrl);
    });

    it('renders placeholder when no home url', () => {
      const mockPackage = getMockPackage('10');
      const { queryByTestId } = render(
        <Details
          package={mockPackage}
          searchUrlReferer={null}
        />
      );

      const homeUrl = queryByTestId('homeUrl');
      expect(homeUrl).toBeInTheDocument();
      expect(homeUrl?.textContent).toBe('-');
    });
  });

  describe('Chart versions', () => {
    it('renders correctly', () => {
      const mockPackage = getMockPackage('11');
      const { queryByTestId, queryAllByTestId } = render(
        <Details
          package={mockPackage}
          searchUrlReferer={null}
        />
      );

      const chartVersions = queryByTestId('chartVersions');
      expect(chartVersions).toBeInTheDocument();
      const versions = queryAllByTestId('version');
      expect(versions).toHaveLength(4);
    });

    it('renders placeholder when no home url', () => {
      const mockPackage = getMockPackage('12');
      const { queryByTestId } = render(
        <Details
          package={mockPackage}
          searchUrlReferer={null}
        />
      );

      const chartVersions = queryByTestId('chartVersions');
      expect(chartVersions).toBeInTheDocument();
      expect(chartVersions?.textContent).toBe('-');
    });
  });
});
