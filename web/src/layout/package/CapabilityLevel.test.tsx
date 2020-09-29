import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import CapabilityLevel from './CapabilityLevel';

describe('DefaultDetails', () => {
  it('creates snapshot', () => {
    const result = render(<CapabilityLevel capabilityLevel="deep insights" />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText, getAllByTestId } = render(<CapabilityLevel capabilityLevel="deep insights" />);

      expect(getByText('Capability Level')).toBeInTheDocument();

      expect(getByText('basic install')).toBeInTheDocument();
      expect(getByText('seamless upgrades')).toBeInTheDocument();
      expect(getByText('full lifecycle')).toBeInTheDocument();
      expect(getByText('deep insights')).toBeInTheDocument();
      expect(getByText('auto pilot')).toBeInTheDocument();

      const steps = getAllByTestId('capabilityLevelStep');
      expect(steps[0]).toHaveClass('activeStep');
      expect(steps[1]).toHaveClass('activeStep');
      expect(steps[2]).toHaveClass('activeStep');
      expect(steps[3]).toHaveClass('activeStep');
      expect(steps[4]).not.toHaveClass('activeStep');
    });

    it('opens modal', () => {
      const { getByTestId, getByRole, getByAltText } = render(<CapabilityLevel capabilityLevel="deep insights" />);

      const modal = getByRole('dialog');
      expect(modal).not.toHaveClass('d-block');

      const btn = getByTestId('openModalBtn');
      fireEvent.click(btn);

      expect(modal).toHaveClass('d-block');
      expect(getByAltText('Capability Level Diagram')).toBeInTheDocument();
    });
  });
});
