import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter as Router } from 'react-router-dom';

import { Repository } from '../../types';
import RelatedPackageCard from './RelatedPackageCard';

interface Props {
  normalizedName: string;
  version: string;
  repository: Repository;
  name: string;
  displayName?: string | null;
  logoImageId?: string | null;
  size: 'normal';
}

const getMockProps = (fixtureId: string): Props => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(`./__fixtures__/RelatedPackageCard/${fixtureId}.json`) as Props;
};

describe('RelatedPackageCard', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const mockProps = getMockProps('1');
    const { asFragment } = render(
      <Router>
        <RelatedPackageCard {...mockProps} />
      </Router>
    );
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Image', () => {
    it('renders package logo', () => {
      const mockProps = getMockProps('2');
      render(
        <Router>
          <RelatedPackageCard {...mockProps} />
        </Router>
      );
      const image = screen.getByAltText(`Logo ${mockProps.displayName}`);
      expect(image).toBeInTheDocument();
    });

    it('renders placeholder when imageId is undefined', () => {
      const mockProps = getMockProps('3');

      render(
        <Router>
          <RelatedPackageCard {...mockProps} />
        </Router>
      );
      const image = screen.getByAltText(`Logo ${mockProps.displayName}`);
      expect(image).toBeInTheDocument();
      expect((image as HTMLImageElement).src).toBe('http://localhost/static/media/placeholder_pkg_helm.png');
    });
  });

  describe('Title', () => {
    it('renders display name', () => {
      const mockProps = getMockProps('4');

      render(
        <Router>
          <RelatedPackageCard {...mockProps} />
        </Router>
      );
      const title = screen.getByText(mockProps.displayName!);
      expect(title).toBeInTheDocument();
    });

    it('renders name when display name is undefined', () => {
      const mockProps = getMockProps('5');

      render(
        <Router>
          <RelatedPackageCard {...mockProps} />
        </Router>
      );
      const title = screen.getByText(mockProps.name!);
      expect(title).toBeInTheDocument();
    });
  });

  describe('Detail', () => {
    it('opens detail page', async () => {
      const mockProps = getMockProps('5');

      render(
        <Router>
          <RelatedPackageCard {...mockProps} />
        </Router>
      );
      const link = screen.getByTestId('relatedPackageLink');
      expect(link).toBeInTheDocument();
      await userEvent.click(link!);
      expect(window.location.pathname).toBe('/packages/helm/incubator/test');
    });
  });

  describe('Subtitle for Helm Chart', () => {
    it('renders repo', () => {
      const mockProps = getMockProps('8');

      render(
        <Router>
          <RelatedPackageCard {...mockProps} />
        </Router>
      );

      expect(screen.getByText(new RegExp(mockProps.repository.name, 'i'))).toBeInTheDocument();
    });
  });
});
