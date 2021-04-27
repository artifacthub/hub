import { render } from '@testing-library/react';
import React from 'react';

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
    const result = render(<Stats {...defaultProps} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText } = render(<Stats {...defaultProps} />);
      expect(getByText('Subscriptions:')).toBeInTheDocument();
      expect(getByText('12')).toBeInTheDocument();
      expect(getByText('Webhooks:')).toBeInTheDocument();
      expect(getByText('8')).toBeInTheDocument();
    });

    it('renders only subscriptions', () => {
      const { getByText, queryByText } = render(<Stats packageStats={{ subscriptions: 3, webhooks: 0 }} />);
      expect(getByText('Subscriptions:')).toBeInTheDocument();
      expect(getByText('3')).toBeInTheDocument();
      expect(queryByText('Webhooks:')).toBeNull();
      expect(queryByText('0')).toBeNull();
    });

    it('renders only webhooks', () => {
      const { getByText, queryByText } = render(<Stats packageStats={{ subscriptions: 0, webhooks: 5 }} />);
      expect(queryByText('Subscriptions:')).toBeNull();
      expect(queryByText('0')).toBeNull();
      expect(getByText('Webhooks:')).toBeInTheDocument();
      expect(getByText('5')).toBeInTheDocument();
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
