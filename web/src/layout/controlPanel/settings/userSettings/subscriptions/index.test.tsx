import { render } from '@testing-library/react';
import React from 'react';

import SubscriptionsSection from './index';
jest.mock('./packages', () => () => <div />);
jest.mock('./repositories', () => () => <div />);

const defaultProps = {
  onAuthError: jest.fn(),
};

describe('SubscriptionsSection', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const result = render(<SubscriptionsSection {...defaultProps} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', async () => {
      const { getByText } = render(<SubscriptionsSection {...defaultProps} />);

      expect(getByText('Your subscriptions')).toBeInTheDocument();
    });
  });
});
