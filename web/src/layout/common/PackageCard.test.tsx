import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter as Router } from 'react-router-dom';

import { Package } from '../../types';
import calculateDiffInYears from '../../utils/calculateDiffInYears';
import { prepareQueryString } from '../../utils/prepareQueryString';
import PackageCard from './PackageCard';
jest.mock('../../utils/calculateDiffInYears');

const getMockPackage = (fixtureId: string): Package => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`./__fixtures__/PackageCard/${fixtureId}.json`) as Package;
};

const mockUseNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as object),
  useNavigate: () => mockUseNavigate,
}));

describe('PackageCard', () => {
  beforeEach(() => {
    (calculateDiffInYears as jest.Mock).mockImplementation(() => 0.5);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const mockPackage = getMockPackage('1');
    const { asFragment } = render(
      <Router>
        <PackageCard package={mockPackage} />
      </Router>
    );
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Image', () => {
    it('renders package logo', () => {
      const mockPackage = getMockPackage('2');
      render(
        <Router>
          <PackageCard package={mockPackage} />
        </Router>
      );
      const image = screen.getByAltText(`Logo ${mockPackage.displayName}`);
      expect(image).toBeInTheDocument();
    });

    it('renders placeholder when imageId is null', () => {
      const mockPackage = getMockPackage('3');

      render(
        <Router>
          <PackageCard package={mockPackage} />
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
          <PackageCard package={mockPackage} />
        </Router>
      );
      expect(screen.getByText(mockPackage.displayName!)).toBeInTheDocument();
    });

    it('renders name when display name is null', () => {
      const mockPackage = getMockPackage('5');

      render(
        <Router>
          <PackageCard package={mockPackage} />
        </Router>
      );
      expect(screen.getByText(mockPackage.name!)).toBeInTheDocument();
    });
  });

  describe('Repository button', () => {
    it('renders repository link', async () => {
      const mockPackage = getMockPackage('6');

      render(
        <Router>
          <PackageCard package={mockPackage} />
        </Router>
      );
      const buttons = screen.getAllByTestId('repoLink');
      expect(buttons).toHaveLength(2);
      const icons = screen.getAllByAltText('Icon');
      expect(icons).toHaveLength(12);
      expect(icons[0]).toBeInTheDocument();
      expect((icons[0] as HTMLImageElement).src).toBe('http://localhost/static/media/helm-chart.svg');
      await userEvent.click(buttons[0]!);

      await waitFor(() => {
        expect(mockUseNavigate).toHaveBeenCalledTimes(1);
        expect(mockUseNavigate).toHaveBeenCalledWith({
          pathname: '/packages/search',
          search: prepareQueryString({
            pageNumber: 1,
            filters: {
              repo: [mockPackage.repository.name],
            },
          }),
        });
      });
    });

    it('renders user link', async () => {
      const mockPackage = getMockPackage('7');

      render(
        <Router>
          <PackageCard package={mockPackage} />
        </Router>
      );
      const button = screen.getByTestId('userLink');
      expect(button).toBeInTheDocument();
      await userEvent.click(button);

      await waitFor(() => {
        expect(mockUseNavigate).toHaveBeenCalledTimes(1);
        expect(mockUseNavigate).toHaveBeenCalledWith({
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

    it('renders repo kind link', async () => {
      const mockPackage = getMockPackage('8');

      render(
        <Router>
          <PackageCard package={mockPackage} />
        </Router>
      );
      const buttons = screen.getAllByTestId('repoIconLabelLink');
      expect(buttons).toHaveLength(2);
      await userEvent.click(buttons[0]);

      await waitFor(() => {
        expect(mockUseNavigate).toHaveBeenCalledTimes(1);
        expect(mockUseNavigate).toHaveBeenCalledWith({
          pathname: '/packages/search',
          search: prepareQueryString({
            pageNumber: 1,
            filters: {
              kind: ['1'],
            },
          }),
        });
      });
    });
  });

  describe('when repository has a verified publisher', () => {
    it('renders correct label', () => {
      const mockPackage = getMockPackage('10');

      render(
        <Router>
          <PackageCard package={mockPackage} />
        </Router>
      );
      expect(screen.getByTestId('Verified publisher badge')).toBeInTheDocument();
    });
  });

  describe('when repository has been published by a CNCF project', () => {
    it('renders correct label', () => {
      const mockPackage = getMockPackage('9');

      render(
        <Router>
          <PackageCard package={mockPackage} />
        </Router>
      );
      expect(screen.getByTestId('CNCF badge')).toBeInTheDocument();
    });
  });
});
