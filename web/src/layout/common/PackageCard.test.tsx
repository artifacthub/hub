import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter as Router } from 'react-router-dom';

import { Package } from '../../types';
import { prepareQueryString } from '../../utils/prepareQueryString';
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
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Image', () => {
    it('renders package logo', () => {
      const mockPackage = getMockPackage('2');
      render(
        <Router>
          <PackageCard {...defaultProps} package={mockPackage} />
        </Router>
      );
      const image = screen.getByAltText(`Logo ${mockPackage.displayName}`);
      expect(image).toBeInTheDocument();
    });

    it('renders placeholder when imageId is null', () => {
      const mockPackage = getMockPackage('3');

      render(
        <Router>
          <PackageCard {...defaultProps} package={mockPackage} />
        </Router>
      );
      const image = screen.getByAltText(`Logo ${mockPackage.displayName}`);
      expect(image).toBeInTheDocument();
      expect((image as HTMLImageElement).src).toBe('http://localhost/static/media/placeholder_pkg_helm.png');
    });
  });

  describe('Title', () => {
    it('renders display name', () => {
      const mockPackage = getMockPackage('4');

      render(
        <Router>
          <PackageCard {...defaultProps} package={mockPackage} />
        </Router>
      );
      const title = screen.getByText(mockPackage.displayName!);
      expect(title).toBeInTheDocument();
    });

    it('renders name when display name is null', () => {
      const mockPackage = getMockPackage('5');

      render(
        <Router>
          <PackageCard {...defaultProps} package={mockPackage} />
        </Router>
      );
      expect(screen.getByText(mockPackage.name!)).toBeInTheDocument();
    });
  });

  describe('Repository button', () => {
    it('renders repository link', () => {
      const mockPackage = getMockPackage('6');

      render(
        <Router>
          <PackageCard {...defaultProps} package={mockPackage} />
        </Router>
      );
      const buttons = screen.getAllByTestId('repoLink');
      expect(buttons).toHaveLength(2);
      const icons = screen.getAllByAltText('Icon');
      expect(icons).toHaveLength(8);
      expect(icons[0]).toBeInTheDocument();
      expect((icons[0] as HTMLImageElement).src).toBe('http://localhost/static/media/helm-chart.svg');
      userEvent.click(buttons[0]!);
      expect(mockHistoryPush).toHaveBeenCalledTimes(1);
      expect(mockHistoryPush).toHaveBeenCalledWith({
        pathname: '/packages/search',
        search: prepareQueryString({
          pageNumber: 1,
          filters: {
            repo: [mockPackage.repository.name],
          },
        }),
      });
    });

    it('renders user link', () => {
      const mockPackage = getMockPackage('7');

      render(
        <Router>
          <PackageCard {...defaultProps} package={mockPackage} />
        </Router>
      );
      const button = screen.getByTestId('userLink');
      expect(button).toBeInTheDocument();
      userEvent.click(button);
      expect(mockHistoryPush).toHaveBeenCalledTimes(1);
      expect(mockHistoryPush).toHaveBeenCalledWith({
        pathname: '/packages/search',
        search: prepareQueryString({
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
      render(
        <Router>
          <PackageCard {...defaultProps} package={mockPackage} searchUrlReferer={urlReferer} />
        </Router>
      );
      const link = screen.getByRole('link');
      expect(link).toBeInTheDocument();
      userEvent.click(link!);
      expect(mockSaveScrollPosition).toHaveBeenCalledTimes(1);
      expect(window.location.pathname).toBe('/packages/helm/test/test');
    });
  });
});
