import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';

import { Package } from '../../types';
import buildPackageURL from '../../utils/buildPackageURL';
import RelatedPackageCard from './RelatedPackageCard';

const getMockPackage = (fixtureId: string): Package => {
  return require(`./__fixtures__/RelatedPackageCard/${fixtureId}.json`) as Package;
};

describe('RelatedPackageCard', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const mockPackage = getMockPackage('1');
    const { asFragment } = render(
      <Router>
        <RelatedPackageCard package={mockPackage} />
      </Router>
    );
    expect(asFragment).toMatchSnapshot();
  });

  describe('Image', () => {
    it('renders package logo', () => {
      const mockPackage = getMockPackage('2');
      const { queryByAltText } = render(
        <Router>
          <RelatedPackageCard package={mockPackage} />
        </Router>
      );
      const image = queryByAltText(`Logo ${mockPackage.displayName}`);
      expect(image).toBeInTheDocument();
    });

    it('renders placeholder when imageId is null', () => {
      const mockPackage = getMockPackage('3');

      const { queryByAltText } = render(
        <Router>
          <RelatedPackageCard package={mockPackage} />
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
          <RelatedPackageCard package={mockPackage} />
        </Router>
      );
      const title = queryByText(mockPackage.displayName!);
      expect(title).toBeInTheDocument();
    });

    it('renders name when display name is null', () => {
      const mockPackage = getMockPackage('5');

      const { queryByText } = render(
        <Router>
          <RelatedPackageCard package={mockPackage} />
        </Router>
      );
      const title = queryByText(mockPackage.name!);
      expect(title).toBeInTheDocument();
    });
  });

  describe('Detail', () => {
    it('opens detail page', () => {
      const mockPackage = getMockPackage('5');

      const { queryByTestId } = render(
        <Router>
          <RelatedPackageCard package={mockPackage} />
        </Router>
      );
      const link = queryByTestId('relatedPackageLink');
      expect(link).toBeInTheDocument();
      fireEvent.click(link!);
      expect(window.location.pathname).toBe(buildPackageURL(mockPackage));
    });
  });

  describe('Subtitle for Helm Chart', () => {
    it('renders user alias', () => {
      const mockPackage = getMockPackage('6');

      const { getByText } = render(
        <Router>
          <RelatedPackageCard package={mockPackage} />
        </Router>
      );

      expect(getByText(new RegExp(mockPackage.repository.userAlias!, 'i'))).toBeInTheDocument();
      expect(getByText('/')).toBeInTheDocument();
    });

    it('renders organization', () => {
      const mockPackage = getMockPackage('7');

      const { getByText } = render(
        <Router>
          <RelatedPackageCard package={mockPackage} />
        </Router>
      );

      expect(getByText(new RegExp(mockPackage.repository.organizationDisplayName!, 'i'))).toBeInTheDocument();
      expect(getByText('/')).toBeInTheDocument();
    });

    it('renders repo', () => {
      const mockPackage = getMockPackage('8');

      const { getByText } = render(
        <Router>
          <RelatedPackageCard package={mockPackage} />
        </Router>
      );

      expect(getByText(new RegExp(mockPackage.repository.name, 'i'))).toBeInTheDocument();
      expect(getByText('/')).toBeInTheDocument();
    });
  });

  describe('Subtitle for OPA/Falco', () => {
    it('renders user alias', () => {
      const mockPackage = getMockPackage('9');

      const { getByText } = render(
        <Router>
          <RelatedPackageCard package={mockPackage} />
        </Router>
      );
      expect(getByText(new RegExp(mockPackage.repository.userAlias!, 'i'))).toBeInTheDocument();
    });
  });
});
