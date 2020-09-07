import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import VerifiedPublisherBadge from './VerifiedPublisherBadge';

describe('VerifiedPublisherBadge', () => {
  it('creates snapshot', () => {
    const { asFragment } = render(<VerifiedPublisherBadge verifiedPublisher />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders properly', () => {
    const { getByTestId, getByText } = render(<VerifiedPublisherBadge verifiedPublisher />);
    expect(getByTestId('verifiedPublisherBadge')).toBeInTheDocument();
    expect(getByText('Verified Publisher')).toBeInTheDocument();
  });

  it('does not render label', () => {
    const { container } = render(<VerifiedPublisherBadge verifiedPublisher={false} />);
    expect(container).toBeEmpty();
  });

  it('displays tootltip', () => {
    const { getByTestId, getByText, getByRole } = render(<VerifiedPublisherBadge verifiedPublisher />);

    const badge = getByTestId('verifiedPublisherBadge');
    fireEvent.mouseEnter(badge);

    waitFor(() => {
      expect(getByText('The publisher owns this repository')).toBeInTheDocument();
      expect(getByRole('tooltip')).toBeInTheDocument();
    });
  });

  it('hides tootltip on mouse leave', () => {
    const { getByTestId, getByText, getByRole, queryByRole } = render(<VerifiedPublisherBadge verifiedPublisher />);

    const badge = getByTestId('verifiedPublisherBadge');
    fireEvent.mouseEnter(badge);

    waitFor(() => {
      expect(getByText('The publisher owns this repository')).toBeInTheDocument();
      expect(getByRole('tooltip')).toBeInTheDocument();
    });

    fireEvent.mouseLeave(badge);

    waitFor(() => {
      expect(queryByRole('tooltip')).toBeNull();
    });
  });
});
