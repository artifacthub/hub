import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import CapabilityLevelInfoModal from './CapabilityLevelInfoModal';

describe('CapabilityLevelInfoModal', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<CapabilityLevelInfoModal />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<CapabilityLevelInfoModal />);
      expect(screen.getByText('Capability level')).toBeInTheDocument();
    });

    it('opens modal', async () => {
      render(<CapabilityLevelInfoModal />);

      expect(screen.getByRole('dialog')).not.toHaveClass('active');
      const btn = screen.getByRole('button', { name: /Open modal/ });
      await userEvent.click(btn);

      expect(screen.getByRole('dialog')).toHaveClass('active');
      expect(screen.getByAltText('Capability Level Diagram')).toBeInTheDocument();
    });
  });
});
