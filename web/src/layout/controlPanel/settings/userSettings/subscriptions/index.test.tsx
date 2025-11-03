import { render, screen } from '@testing-library/react';

import SubscriptionsSection from './index';
import { vi } from 'vitest';
vi.mock('./packages', () => () => <div />);
vi.mock('./repositories', () => () => <div />);

const defaultProps = {
  onAuthError: jest.fn(),
};

describe('SubscriptionsSection', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const { asFragment } = render(<SubscriptionsSection {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', async () => {
      render(<SubscriptionsSection {...defaultProps} />);

      expect(screen.getByText('Your subscriptions')).toBeInTheDocument();
    });
  });
});
