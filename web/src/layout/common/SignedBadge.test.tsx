import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import SignedBadge from './SignedBadge';

describe('SignedBadge', () => {
  it('creates snapshot', () => {
    const { asFragment } = render(<SignedBadge repositoryKind={0} signed />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders label for Chart package', () => {
    const { getByTestId, getByText, getByRole } = render(<SignedBadge repositoryKind={0} signed />);
    expect(getByText('Signed')).toBeInTheDocument();

    const badge = getByTestId('elementWithTooltip');
    expect(badge).toBeInTheDocument();
    fireEvent.mouseEnter(badge);

    waitFor(() => {
      expect(getByText('This chart has a provenance file')).toBeInTheDocument();
      expect(getByRole('tooltip')).toBeInTheDocument();
    });
  });

  it('renders label for not Chart package', () => {
    const { getByTestId, getByText, queryByText, queryByRole } = render(<SignedBadge repositoryKind={1} signed />);
    expect(getByText('Signed')).toBeInTheDocument();

    const badge = getByTestId('elementWithTooltip');
    expect(badge).toBeInTheDocument();
    fireEvent.mouseEnter(badge);

    waitFor(() => {
      expect(queryByText('This chart has a provenance file')).toBeNull();
      expect(queryByRole('tooltip')).toBeNull();
    });
  });

  it('does not render label', () => {
    const { container } = render(<SignedBadge repositoryKind={0} signed={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});
