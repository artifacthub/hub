import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import VerifiedPublisherBadge from './VerifiedPublisherBadge';

describe('VerifiedPublisherBadge', () => {
  it('creates snapshot', () => {
    const { asFragment } = render(<VerifiedPublisherBadge verifiedPublisher />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders label', () => {
    const { getByTestId, getByText, getByRole } = render(<VerifiedPublisherBadge verifiedPublisher />);
    expect(getByText('Verified Publisher')).toBeInTheDocument();

    const badge = getByTestId('labelWithTooltip');
    expect(badge).toBeInTheDocument();
    fireEvent.mouseEnter(badge);

    waitFor(() => {
      expect(getByText('The publisher owns this repository')).toBeInTheDocument();
      expect(getByRole('tooltip')).toBeInTheDocument();
    });
  });

  it('does not render label', () => {
    const { container } = render(<VerifiedPublisherBadge verifiedPublisher={false} />);
    expect(container).toBeEmpty();
  });
});
