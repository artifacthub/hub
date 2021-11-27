import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import CapatabilityLevelInfoModal from './CapatabilityLevelInfoModal';

describe('CapatabilityLevelInfoModal', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<CapatabilityLevelInfoModal />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<CapatabilityLevelInfoModal />);
      expect(screen.getByText('Capability level')).toBeInTheDocument();
    });

    it('opens modal', () => {
      render(<CapatabilityLevelInfoModal />);

      expect(screen.getByRole('dialog')).not.toHaveClass('active');
      const btn = screen.getByRole('button', { name: /Open modal/ });
      userEvent.click(btn);

      expect(screen.getByRole('dialog')).toHaveClass('active');
      expect(screen.getByAltText('Capability Level Diagram')).toBeInTheDocument();
    });
  });
});
