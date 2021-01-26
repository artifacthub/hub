import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';

import { Package } from '../../types';
import prepareQuerystring from '../../utils/prepareQueryString';
import PackageCard from './PackageCard';

const getMockPackage = (fixtureId: string): Package => {
  return require(`./__fixtures__/PackageCard/${fixtureId}.json`) as Package;
};

const mockHistoryPush = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as {}),
  useHistory: () => ({
    push: mockHistoryPush,
  }),
}));

const mockSaveScrollPosition = jest.fn();

const defaultProps = {
  saveScrollPosition: mockSaveScrollPosition,
  searchUrlReferer: undefined,
};

describe('PackageCard', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const mockPackage = getMockPackage('1');
    const { asFragment } = render(
      <Router>
        <PackageCard {...defaultProps} package={mockPackage} />
      </Router>
    );
    expect(asFragment).toMatchSnapshot();
  });

  describe('Image', () => {
    it('renders package logo', () => {
      const mockPackage = getMockPackage('2');
      const { queryByAltText } = render(
        <Router>
          <PackageCard {...defaultProps} package={mockPackage} />
        </Router>
      );
      const image = queryByAltText(`Logo ${mockPackage.displayName}`);
      expect(image).toBeInTheDocument();
    });

    it('renders placeholder when imageId is null', () => {
      const mockPackage = getMockPackage('3');

      const { queryByAltText } = render(
        <Router>
          <PackageCard {...defaultProps} package={mockPackage} />
        </Router>
      );
      const image = queryByAltText(`Logo ${mockPackage.displayName}`);
      expect(image).toBeInTheDocument();
      expect((image as HTMLImageElement).src).toBe('http://localhost/static/media/placeholder_pkg_helm.png');
    });
  });

  describe('Title', () => {
    it('renders display name', () => {
      const mockPackage = getMockPackage('4');

      const { queryByText } = render(
        <Router>
          <PackageCard {...defaultProps} package={mockPackage} />
        </Router>
      );
      const title = queryByText(mockPackage.displayName!);
      expect(title).toBeInTheDocument();
    });

    it('renders name when display name is null', () => {
      const mockPackage = getMockPackage('5');

      const { queryByText } = render(
        <Router>
          <PackageCard {...defaultProps} package={mockPackage} />
        </Router>
      );
      const title = queryByText(mockPackage.name!);
      expect(title).toBeInTheDocument();
    });
  });

  describe('Repository button', () => {
    it('renders repository link', () => {
      const mockPackage = getMockPackage('6');

      const { queryAllByTestId, queryAllByAltText } = render(
        <Router>
          <PackageCard {...defaultProps} package={mockPackage} />
        </Router>
      );
      const buttons = queryAllByTestId('repoLink');
      expect(buttons).toHaveLength(2);
      const icons = queryAllByAltText('Icon');
      expect(icons).toHaveLength(8);
      expect(icons[0]).toBeInTheDocument();
      expect((icons[0] as HTMLImageElement).src).toBe('http://localhost/static/media/helm-chart.svg');
      fireEvent.click(buttons[0]!);
      expect(mockHistoryPush).toHaveBeenCalledTimes(1);
      expect(mockHistoryPush).toHaveBeenCalledWith({
        pathname: '/packages/search',
        search: prepareQuerystring({
          pageNumber: 1,
          filters: {
            repo: [mockPackage.repository.name],
          },
        }),
      });
    });

    it('renders user link', () => {
      const mockPackage = getMockPackage('7');

      const { getByTestId } = render(
        <Router>
          <PackageCard {...defaultProps} package={mockPackage} />
        </Router>
      );
      const button = getByTestId('userLink');
      expect(button).toBeInTheDocument();
      fireEvent.click(button);
      expect(mockHistoryPush).toHaveBeenCalledTimes(1);
      expect(mockHistoryPush).toHaveBeenCalledWith({
        pathname: '/packages/search',
        search: prepareQuerystring({
          pageNumber: 1,
          filters: {
            user: [mockPackage.repository.userAlias!],
          },
        }),
      });
    });
  });

  describe('Detail', () => {
    it('opens detail page', () => {
      const mockPackage = getMockPackage('9');
      const urlReferer = {
        tsQueryWeb: 'test',
        filters: {},
        pageNumber: 1,
      };
      const { queryByTestId } = render(
        <Router>
          <PackageCard {...defaultProps} package={mockPackage} searchUrlReferer={urlReferer} />
        </Router>
      );
      const link = queryByTestId('link');
      expect(link).toBeInTheDocument();
      fireEvent.click(link!);
      expect(mockSaveScrollPosition).toHaveBeenCalledTimes(1);
      expect(window.location.pathname).toBe('/packages/helm/test/test');
    });
  });
});
