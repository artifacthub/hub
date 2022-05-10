import { render, screen } from '@testing-library/react';

import Stats from './Stats';

const defaultProps = {
  packageStats: {
    subscriptions: 12,
    webhooks: 8,
  },
  productionOrganizationsCount: 3,
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
      expect(screen.getByTestId('subscriptions')).toBeInTheDocument();
      expect(screen.getByText('Subscriptions:')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByTestId('webhooks')).toBeInTheDocument();
      expect(screen.getByText('Webhooks:')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
      expect(screen.getByTestId('productionUsers')).toBeInTheDocument();
      expect(screen.getByText('Production users:')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('renders only subscriptions', () => {
      render(<Stats packageStats={{ subscriptions: 3, webhooks: 0 }} />);
      expect(screen.getByTestId('subscriptions')).toBeInTheDocument();
      expect(screen.getByText('Subscriptions:')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.queryByTestId('webhooks')).toBeNull();
      expect(screen.queryByText('Webhooks:')).toBeNull();
      expect(screen.queryByText('0')).toBeNull();
      expect(screen.queryByTestId('productionUsers')).toBeNull();
    });

    it('renders only webhooks', () => {
      render(<Stats packageStats={{ subscriptions: 0, webhooks: 5 }} />);
      expect(screen.queryByTestId('subscriptions')).toBeNull();
      expect(screen.queryByText('Subscriptions:')).toBeNull();
      expect(screen.queryByText('0')).toBeNull();
      expect(screen.getByTestId('webhooks')).toBeInTheDocument();
      expect(screen.getByText('Webhooks:')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.queryByTestId('productionUsers')).toBeNull();
    });

    it('renders only production users', () => {
      render(<Stats packageStats={{ subscriptions: 0, webhooks: 0 }} productionOrganizationsCount={5} />);

      expect(screen.queryByTestId('subscriptions')).toBeNull();
      expect(screen.queryByTestId('webhooks')).toBeNull();
      expect(screen.getByTestId('productionUsers')).toBeInTheDocument();
      expect(screen.getByText('Production users:')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  describe('does not render section or part of section', () => {
    it('when packageStats and productionOrganizationsCount are undefined', () => {
      const { container } = render(<Stats />);

      expect(screen.queryByTestId('subscriptions')).toBeNull();
      expect(screen.queryByTestId('webhooks')).toBeNull();
      expect(screen.queryByTestId('productionUsers')).toBeNull();
      expect(container).toBeEmptyDOMElement();
    });

    it('when all values are 0', () => {
      render(<Stats packageStats={{ subscriptions: 0, webhooks: 0 }} productionOrganizationsCount={0} />);

      expect(screen.queryByTestId('subscriptions')).toBeNull();
      expect(screen.queryByTestId('webhooks')).toBeNull();
      expect(screen.queryByTestId('productionUsers')).toBeNull();
    });
  });
});
