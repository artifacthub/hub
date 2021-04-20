import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import SignedBadge from './SignedBadge';

describe('SignedBadge', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<SignedBadge repositoryKind={0} signed />);
    expect(asFragment).toMatchSnapshot();
  });

  it('renders label for Helm package', async () => {
    render(<SignedBadge repositoryKind={0} signed />);
    expect(screen.getByText('Signed')).toBeInTheDocument();

    const badge = screen.getByTestId('elementWithTooltip');
    expect(badge).toBeInTheDocument();
    userEvent.hover(badge);

    expect(await screen.findByRole('tooltip')).toBeInTheDocument();

    expect(screen.getByText('This chart has a provenance file')).toBeInTheDocument();
  });

  it('does not render label for not helm package', () => {
    render(<SignedBadge repositoryKind={1} signed />);
    expect(screen.getByText('Signed')).toBeInTheDocument();

    const badge = screen.getByTestId('elementWithTooltip');
    expect(badge).toBeInTheDocument();
    userEvent.hover(badge);

    expect(screen.queryByText('This chart has a provenance file')).toBeNull();
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('does not render label', () => {
    const { container } = render(<SignedBadge repositoryKind={0} signed={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});
