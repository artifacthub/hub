import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import { Package, PackageLink, Version } from '../../types';
import OLMOperatorsDetails from './OLMOperatorsDetails';

const getMockPackage = (fixtureId: string): Package => {
  return require(`./__fixtures__/OLMOperatorsDetails/${fixtureId}.json`) as Package;
};

const mockHistoryPush = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as {}),
  useHistory: () => ({
    push: mockHistoryPush,
  }),
}));

const mockOnChannelChange = jest.fn();

const defaultProps = {
  onChannelChange: mockOnChannelChange,
  allVersions: [<div key="a">1.0.0</div>, <div key="b">0.2.0</div>, <div key="c">0.2.3</div>],
};

describe('OLMOperatorsDetails', () => {
  it('creates snapshot', () => {
    const mockPackage = getMockPackage('1');
    const result = render(<OLMOperatorsDetails {...defaultProps} package={mockPackage} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const mockPackage = getMockPackage('2');
      const { getByText, getByLabelText, getByTestId, getAllByTestId } = render(
        <OLMOperatorsDetails package={mockPackage} {...defaultProps} />
      );

      expect(getByText('Channel')).toBeInTheDocument();
      expect(getByLabelText('channel-select')).toBeInTheDocument();
      expect(getByText(mockPackage.channels![0].name));

      expect(getByText('Versions')).toBeInTheDocument();
      mockPackage.availableVersions!.forEach((vs: Version) => {
        expect(getByText(vs.version)).toBeInTheDocument();
      });

      expect(getByText('Capability Level')).toBeInTheDocument();
      const steps = getAllByTestId('capabilityLevelStep');
      expect(steps[0]).toHaveClass('activeStep');
      expect(steps[1]).toHaveClass('activeStep');
      expect(steps[2]).not.toHaveClass('activeStep');
      expect(steps[3]).not.toHaveClass('activeStep');
      expect(steps[4]).not.toHaveClass('activeStep');

      expect(getByText('Provider')).toBeInTheDocument();
      expect(getByText(mockPackage.provider!)).toBeInTheDocument();

      expect(getByText('Links')).toBeInTheDocument();
      const homepage = getByText('source');
      expect(homepage).toBeInTheDocument();
      expect(homepage.closest('a')).toHaveProperty('href', mockPackage.links![0].url);
      mockPackage.links!.forEach((link: PackageLink) => {
        expect(getByText(link.name)).toBeInTheDocument();
      });

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

    it('calls onChannelChange', () => {
      const mockPackage = getMockPackage('3');
      const { getByText, getByLabelText } = render(<OLMOperatorsDetails package={mockPackage} {...defaultProps} />);

      expect(getByText('Channel')).toBeInTheDocument();
      const select = getByLabelText('channel-select');
      expect(getByText('alpha')).toBeInTheDocument();
      expect(getByText('original')).toBeInTheDocument();
      fireEvent.change(select, { target: { value: 'original' } });

      expect(mockOnChannelChange).toHaveBeenCalledTimes(1);
      expect(mockOnChannelChange).toHaveBeenCalledWith('original');
    });
  });
});
