import { render } from '@testing-library/react';
import React from 'react';

import { Package } from '../../types';
import OPAPoliciesDetails from './OPAPoliciesDetails';

const getMockPackage = (fixtureId: string): Package => {
  return require(`./__fixtures__/OPAPoliciesDetails/${fixtureId}.json`) as Package;
};

const mockHistoryPush = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as {}),
  useHistory: () => ({
    push: mockHistoryPush,
  }),
}));

const defaultProps = {
  allVersions: [<div key="a">0.1.0</div>],
};

describe('OPAPoliciesDetails', () => {
  it('creates snapshot', () => {
    const mockPackage = getMockPackage('1');
    const result = render(<OPAPoliciesDetails {...defaultProps} package={mockPackage} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const mockPackage = getMockPackage('2');
      const { getByText, getByTestId, getAllByTestId } = render(
        <OPAPoliciesDetails package={mockPackage} {...defaultProps} />
      );

      expect(getByText('Versions')).toBeInTheDocument();
      expect(getByText('0.1.0')).toBeInTheDocument();

      expect(getByText('Provider')).toBeInTheDocument();
      expect(getByText(mockPackage.provider!)).toBeInTheDocument();

      expect(getByText('Links')).toBeInTheDocument();
      const homepage = getByText('source');
      expect(homepage).toBeInTheDocument();
      expect(homepage.closest('a')).toHaveProperty('href', mockPackage.links![0].url);

      expect(getByText('Maintainers')).toBeInTheDocument();
      expect(getByTestId('maintainers')).toBeInTheDocument();
      const maintainer1 = getByText(mockPackage.maintainers![0].name!);
      expect(maintainer1).toBeInTheDocument();
      expect(maintainer1.closest('a')).toHaveProperty('href', `mailto:${mockPackage.maintainers![0].email}`);

      expect(getByText('License')).toBeInTheDocument();
      expect(getByText(mockPackage.license!)).toBeInTheDocument();

      expect(getByText(/Container Image/g)).toBeInTheDocument();
      expect(getByText(mockPackage.containersImages![0].image)).toBeInTheDocument();

      expect(getByText('Keywords')).toBeInTheDocument();
      expect(getAllByTestId('keywordBtn')).toHaveLength(mockPackage.keywords!.length);
    });
  });
});
