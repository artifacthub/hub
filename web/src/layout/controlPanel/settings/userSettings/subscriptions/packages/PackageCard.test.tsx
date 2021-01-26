import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';

import { Package } from '../../../../../../types';
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
      const image = queryByAltText(`Logo ${mockPackage.name}`);
      expect(image).toBeInTheDocument();
    });

    it('renders placeholder when imageId is null', () => {
      const mockPackage = getMockPackage('3');

      const { queryByAltText } = render(
        <Router>
          <PackageCard {...defaultProps} package={mockPackage} />
        </Router>
      );
      const image = queryByAltText(`Logo ${mockPackage.name}`);
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

  describe('Detail', () => {
    it('detail page link', () => {
      const mockPackage = getMockPackage('9');

      const { getByTestId } = render(
        <Router>
          <PackageCard {...defaultProps} package={mockPackage} />
        </Router>
      );
      const link = getByTestId('packageCardLink');
      expect(link).toBeInTheDocument();
      expect(link).toHaveProperty('href', 'http://localhost/packages/helm/stable/airflow');
    });
  });

  describe('Subscriptions', () => {
    it('renders active New releases subscription', () => {
      const mockPackage = getMockPackage('10');

      const { getByTestId } = render(
        <Router>
          <PackageCard {...defaultProps} package={mockPackage} />
        </Router>
      );
      const btn = getByTestId('newReleaseMobileBtn');
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);
      expect(mockChangeSubscription).toHaveBeenCalledTimes(1);
      expect(mockChangeSubscription).toHaveBeenCalledWith('0acb228c-17ab-4e50-85e9-ffc7102ea423', 0, true, 'airflow');
    });
  });
});
