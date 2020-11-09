import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import VerifiedPublisherBadge from './VerifiedPublisherBadge';

describe('VerifiedPublisherBadge', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<VerifiedPublisherBadge verifiedPublisher />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders label', async () => {
    const { getByTestId, getByText, getByRole } = render(<VerifiedPublisherBadge verifiedPublisher />);
    expect(getByText('Verified Publisher')).toBeInTheDocument();

    const badge = getByTestId('elementWithTooltip');
    expect(badge).toBeInTheDocument();
    fireEvent.mouseEnter(badge);

    await waitFor(() => {
      expect(getByText('The publisher owns the repository')).toBeInTheDocument();
      expect(getByRole('tooltip')).toBeInTheDocument();
    });
  });

  it('does not render label', () => {
    const { container } = render(<VerifiedPublisherBadge verifiedPublisher={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});
