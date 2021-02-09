import { fireEvent, render } from '@testing-library/react';
import React from 'react';
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
}

const getMockProps = (fixtureId: string): Props => {
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
    expect(asFragment).toMatchSnapshot();
  });

  describe('Image', () => {
    it('renders package logo', () => {
      const mockProps = getMockProps('2');
      const { queryByAltText } = render(
        <Router>
          <RelatedPackageCard {...mockProps} />
        </Router>
      );
      const image = queryByAltText(`Logo ${mockProps.displayName}`);
      expect(image).toBeInTheDocument();
    });

    it('renders placeholder when imageId is undefined', () => {
      const mockProps = getMockProps('3');

      const { queryByAltText } = render(
        <Router>
          <RelatedPackageCard {...mockProps} />
        </Router>
      );
      const image = queryByAltText(`Logo ${mockProps.displayName}`);
      expect(image).toBeInTheDocument();
      expect((image as HTMLImageElement).src).toBe('http://localhost/static/media/placeholder_pkg_helm.png');
    });
  });

  describe('Title', () => {
    it('renders display name', () => {
      const mockProps = getMockProps('4');

      const { queryByText } = render(
        <Router>
          <RelatedPackageCard {...mockProps} />
        </Router>
      );
      const title = queryByText(mockProps.displayName!);
      expect(title).toBeInTheDocument();
    });

    it('renders name when display name is undefined', () => {
      const mockProps = getMockProps('5');

      const { queryByText } = render(
        <Router>
          <RelatedPackageCard {...mockProps} />
        </Router>
      );
      const title = queryByText(mockProps.name!);
      expect(title).toBeInTheDocument();
    });
  });

  describe('Detail', () => {
    it('opens detail page', () => {
      const mockProps = getMockProps('5');

      const { queryByTestId } = render(
        <Router>
          <RelatedPackageCard {...mockProps} />
        </Router>
      );
      const link = queryByTestId('relatedPackageLink');
      expect(link).toBeInTheDocument();
      fireEvent.click(link!);
      expect(window.location.pathname).toBe('/packages/helm/incubator/test');
    });
  });

  describe('Subtitle for Helm Chart', () => {
    it('renders user alias', () => {
      const mockProps = getMockProps('6');

      const { getByText } = render(
        <Router>
          <RelatedPackageCard {...mockProps} />
        </Router>
      );

      expect(getByText(new RegExp(mockProps.repository.userAlias!, 'i'))).toBeInTheDocument();
      expect(getByText('/')).toBeInTheDocument();
    });

    it('renders organization', () => {
      const mockProps = getMockProps('7');

      const { getByText } = render(
        <Router>
          <RelatedPackageCard {...mockProps} />
        </Router>
      );

      expect(getByText(new RegExp('Org name', 'i'))).toBeInTheDocument();
      expect(getByText('/')).toBeInTheDocument();
    });

    it('renders repo', () => {
      const mockProps = getMockProps('8');

      const { getByText } = render(
        <Router>
          <RelatedPackageCard {...mockProps} />
        </Router>
      );

      expect(getByText(new RegExp(mockProps.repository.name, 'i'))).toBeInTheDocument();
      expect(getByText('/')).toBeInTheDocument();
    });
  });

  describe('Subtitle for OPA/Falco', () => {
    it('renders user alias', () => {
      const mockProps = getMockProps('9');

      const { getByText } = render(
        <Router>
          <RelatedPackageCard {...mockProps} />
        </Router>
      );
      expect(getByText(new RegExp(mockProps.repository.userAlias!, 'i'))).toBeInTheDocument();
    });
  });
});
