import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import CapatabilityLevelInfoModal from './CapatabilityLevelInfoModal';

describe('CapatabilityLevelInfoModal', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(<CapatabilityLevelInfoModal />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText } = render(<CapatabilityLevelInfoModal />);
      expect(getByText('Capability level')).toBeInTheDocument();
    });

    it('opens modal', () => {
      const { getByRole, getByTestId, getByAltText } = render(<CapatabilityLevelInfoModal />);

      expect(getByRole('dialog')).not.toHaveClass('active');
      const btn = getByTestId('openModalBtn');
      fireEvent.click(btn);

      expect(getByRole('dialog')).toHaveClass('active');
      expect(getByAltText('Capability Level Diagram')).toBeInTheDocument();
    });
  });
});
