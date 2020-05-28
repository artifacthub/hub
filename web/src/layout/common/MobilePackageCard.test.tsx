import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';

import { Package } from '../../types';
import buildPackageURL from '../../utils/buildPackageURL';
import MobilePackageCard from './MobilePackageCard';

const getMockPackage = (fixtureId: string): Package => {
  return require(`./__fixtures__/MobilePackageCard/${fixtureId}.json`) as Package;
};

describe('MobilePackageCard', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const mockPackage = getMockPackage('1');
    const { asFragment } = render(
      <Router>
        <MobilePackageCard package={mockPackage} />
      </Router>
    );
    expect(asFragment).toMatchSnapshot();
  });

  describe('Image', () => {
    it('renders package logo', () => {
      const mockPackage = getMockPackage('2');
      const { queryByAltText } = render(
        <Router>
          <MobilePackageCard package={mockPackage} />
        </Router>
      );
      const image = queryByAltText(`Logo ${mockPackage.displayName}`);
      expect(image).toBeInTheDocument();
    });

    it('renders placeholder when imageId is null', () => {
      const mockPackage = getMockPackage('3');

      const { queryByAltText } = render(
        <Router>
          <MobilePackageCard package={mockPackage} />
        </Router>
      );
      const image = queryByAltText(`Logo ${mockPackage.displayName}`);
      expect(image).toBeInTheDocument();
      expect((image as HTMLImageElement).src).toBe('http://localhost/static/media/kubernetes_grey.svg');
    });
  });

  describe('Title', () => {
    it('renders display name', () => {
      const mockPackage = getMockPackage('4');

      const { queryByText } = render(
        <Router>
          <MobilePackageCard package={mockPackage} />
        </Router>
      );
      const title = queryByText(mockPackage.displayName!);
      expect(title).toBeInTheDocument();
    });

    it('renders name when display name is null', () => {
      const mockPackage = getMockPackage('5');

      const { queryByText } = render(
        <Router>
          <MobilePackageCard package={mockPackage} />
        </Router>
      );
      const title = queryByText(mockPackage.name!);
      expect(title).toBeInTheDocument();
    });

    it('renders description', () => {
      const mockPackage = getMockPackage('6');

      const { queryByText } = render(
        <Router>
          <MobilePackageCard package={mockPackage} />
        </Router>
      );
      const description = queryByText(mockPackage.description!);
      expect(description).toBeInTheDocument();
    });

    it('renders Deprecated badge', () => {
      const mockPackage = getMockPackage('7');

      const { queryByText } = render(
        <Router>
          <MobilePackageCard package={mockPackage} />
        </Router>
      );
      const badge = queryByText('Deprecated');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Detail', () => {
    it('opens detail page', () => {
      const mockPackage = getMockPackage('8');

      const { queryByTestId } = render(
        <Router>
          <MobilePackageCard package={mockPackage} />
        </Router>
      );
      const link = queryByTestId('mobilePackageLink');
      expect(link).toBeInTheDocument();
      fireEvent.click(link!);
      expect(window.location.pathname).toBe(buildPackageURL(mockPackage));
    });
  });
});
