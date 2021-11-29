import { render, screen } from '@testing-library/react';

import Stats from './Stats';

const defaultProps = {
  packageStats: {
    subscriptions: 12,
    webhooks: 8,
  },
};

describe('Stats', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<Stats {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<Stats {...defaultProps} />);
      expect(screen.getByText('Subscriptions:')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('Webhooks:')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
    });

    it('renders only subscriptions', () => {
      render(<Stats packageStats={{ subscriptions: 3, webhooks: 0 }} />);
      expect(screen.getByText('Subscriptions:')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.queryByText('Webhooks:')).toBeNull();
      expect(screen.queryByText('0')).toBeNull();
    });

    it('renders only webhooks', () => {
      render(<Stats packageStats={{ subscriptions: 0, webhooks: 5 }} />);
      expect(screen.queryByText('Subscriptions:')).toBeNull();
      expect(screen.queryByText('0')).toBeNull();
      expect(screen.getByText('Webhooks:')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  describe('does not render section', () => {
    it('when packegeStats in undefined', () => {
      const { container } = render(<Stats />);
      expect(container).toBeEmptyDOMElement();
    });

    it('when both values are 0', () => {
      const { container } = render(<Stats packageStats={{ subscriptions: 0, webhooks: 0 }} />);
      expect(container).toBeEmptyDOMElement();
    });
  });
});
