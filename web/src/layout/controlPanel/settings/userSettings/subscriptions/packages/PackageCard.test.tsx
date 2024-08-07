import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter as Router } from 'react-router-dom';

import { Package } from '../../../../../../types';
import PackageCard from './PackageCard';

const getMockPackage = (fixtureId: string): Package => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`./__fixtures__/PackageCard/${fixtureId}.json`) as Package;
};

const mockUseNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as object),
  useNavigate: () => mockUseNavigate,
}));

const mockChangeSubscription = jest.fn();

const defaultProps = {
  changeSubscription: mockChangeSubscription,
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
      const image = screen.queryByAltText(`Logo ${mockPackage.name}`);
      expect(image).toBeInTheDocument();
    });

    it('renders placeholder when imageId is null', () => {
      const mockPackage = getMockPackage('3');

      render(
        <Router>
          <PackageCard {...defaultProps} package={mockPackage} />
        </Router>
      );
      const image = screen.queryByAltText(`Logo ${mockPackage.name}`);
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
      const title = screen.queryByText(mockPackage.displayName!);
      expect(title).toBeInTheDocument();
    });

    it('renders name when display name is null', () => {
      const mockPackage = getMockPackage('5');

      render(
        <Router>
          <PackageCard {...defaultProps} package={mockPackage} />
        </Router>
      );
      const title = screen.queryByText(mockPackage.name!);
      expect(title).toBeInTheDocument();
    });
  });

  describe('Detail', () => {
    it('detail page link', () => {
      const mockPackage = getMockPackage('9');

      render(
        <Router>
          <PackageCard {...defaultProps} package={mockPackage} />
        </Router>
      );
      const link = screen.getByTestId('packageCardLink');
      expect(link).toBeInTheDocument();
      expect(link).toHaveProperty('href', 'http://localhost/packages/helm/stable/airflow');
    });
  });

  describe('Subscriptions', () => {
    it('renders active New releases subscription', async () => {
      const mockPackage = getMockPackage('10');

      render(
        <Router>
          <PackageCard {...defaultProps} package={mockPackage} />
        </Router>
      );
      const btn = screen.getByRole('switch', { name: 'New releases' });
      expect(btn).toBeInTheDocument();
      await userEvent.click(btn);

      expect(mockChangeSubscription).toHaveBeenCalledTimes(1);
      expect(mockChangeSubscription).toHaveBeenCalledWith('0acb228c-17ab-4e50-85e9-ffc7102ea423', 0, true, 'airflow');
    });
  });
});
