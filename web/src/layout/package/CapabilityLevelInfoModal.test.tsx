import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import CapabilityLevelInfoModal from './CapabilityLevelInfoModal';

const hasClassContaining = (element: Element, token: string): boolean =>
  Array.from(element.classList).some((cls) => cls.includes(token));

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

      expect(hasClassContaining(screen.getByRole('dialog'), 'active')).toBe(false);
      const btn = screen.getByRole('button', { name: /Open modal/ });
      await userEvent.click(btn);

      expect(hasClassContaining(screen.getByRole('dialog'), 'active')).toBe(true);
      expect(screen.getByAltText('Capability Level Diagram')).toBeInTheDocument();
    });
  });
});
