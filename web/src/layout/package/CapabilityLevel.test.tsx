import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import CapabilityLevel from './CapabilityLevel';

describe('CapabilityLevel', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<CapabilityLevel capabilityLevel="deep insights" />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<CapabilityLevel capabilityLevel="deep insights" />);

      expect(screen.getByText('Capability Level')).toBeInTheDocument();

      expect(screen.getByText('basic install')).toBeInTheDocument();
      expect(screen.getByText('seamless upgrades')).toBeInTheDocument();
      expect(screen.getByText('full lifecycle')).toBeInTheDocument();
      expect(screen.getByText('deep insights')).toBeInTheDocument();
      expect(screen.getByText('auto pilot')).toBeInTheDocument();

      const steps = screen.getAllByTestId('capabilityLevelStep');
      expect(steps[0]).toHaveClass('activeStep');
      expect(steps[1]).toHaveClass('activeStep');
      expect(steps[2]).toHaveClass('activeStep');
      expect(steps[3]).toHaveClass('activeStep');
      expect(steps[4]).not.toHaveClass('activeStep');
    });

    it('renders component with capital letters', () => {
      render(<CapabilityLevel capabilityLevel="Auto Pilot" />);

      expect(screen.getByText('Capability Level')).toBeInTheDocument();

      expect(screen.getByText('basic install')).toBeInTheDocument();
      expect(screen.getByText('seamless upgrades')).toBeInTheDocument();
      expect(screen.getByText('full lifecycle')).toBeInTheDocument();
      expect(screen.getByText('deep insights')).toBeInTheDocument();
      expect(screen.getByText('auto pilot')).toBeInTheDocument();

      const steps = screen.getAllByTestId('capabilityLevelStep');
      expect(steps[0]).toHaveClass('activeStep');
      expect(steps[1]).toHaveClass('activeStep');
      expect(steps[2]).toHaveClass('activeStep');
      expect(steps[3]).toHaveClass('activeStep');
      expect(steps[4]).toHaveClass('activeStep');
    });

    it('opens modal', async () => {
      render(<CapabilityLevel capabilityLevel="deep insights" />);

      const modal = screen.getByRole('dialog');
      expect(modal).not.toHaveClass('d-block');

      const btn = screen.getByRole('button', { name: /Open modal/ });
      await userEvent.click(btn);

      expect(modal).toHaveClass('d-block');
      expect(screen.getByAltText('Capability Level Diagram')).toBeInTheDocument();
    });
  });

  describe('does not render', () => {
    it('when capability level is null', () => {
      const { container } = render(<CapabilityLevel capabilityLevel={null} />);
      expect(container).toBeEmptyDOMElement();
    });

    it('when capability level is undefined', () => {
      const { container } = render(<CapabilityLevel />);
      expect(container).toBeEmptyDOMElement();
    });

    it('when capability level is different to described levels', () => {
      const { container } = render(<CapabilityLevel capabilityLevel="a not valid one" />);
      expect(container).toBeEmptyDOMElement();
    });
  });
});
