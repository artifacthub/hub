import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Signature } from '../../types';
import SignedBadge from './SignedBadge';

describe('SignedBadge', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<SignedBadge repositoryKind={0} signed signatures={[Signature.Prov]} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('does not render tooltip whitout signature', async () => {
    render(<SignedBadge repositoryKind={0} signed />);
    expect(screen.getByText('Signed')).toBeInTheDocument();

    const badge = screen.getByTestId('elementWithTooltip');
    expect(badge).toBeInTheDocument();
    userEvent.hover(badge);

    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('renders label for Helm package with Prov signature', async () => {
    render(<SignedBadge repositoryKind={0} signed signatures={[Signature.Prov]} />);
    expect(screen.getByText('Signed')).toBeInTheDocument();

    const badge = screen.getByTestId('elementWithTooltip');
    expect(badge).toBeInTheDocument();
    userEvent.hover(badge);

    expect(await screen.findByRole('tooltip')).toBeInTheDocument();

    expect(screen.getByText('This chart has a provenance file')).toBeInTheDocument();
  });

  it('renders label for Helm package with Cosign signature', async () => {
    render(<SignedBadge repositoryKind={0} signed signatures={[Signature.Cosign]} />);
    expect(screen.getByText('Signed')).toBeInTheDocument();

    const badge = screen.getByTestId('elementWithTooltip');
    expect(badge).toBeInTheDocument();
    userEvent.hover(badge);

    expect(await screen.findByRole('tooltip')).toBeInTheDocument();

    expect(screen.getByText(/This chart has been signed with/)).toBeInTheDocument();
    expect(screen.getByText('cosign')).toBeInTheDocument();
    expect(screen.getByText(/(Sigstore)/)).toBeInTheDocument();
  });

  it('renders label for Helm package with more than one signature', async () => {
    render(<SignedBadge repositoryKind={0} signed signatures={[Signature.Prov, Signature.Cosign]} />);
    expect(screen.getByText('Signed')).toBeInTheDocument();

    const badge = screen.getByTestId('elementWithTooltip');
    expect(badge).toBeInTheDocument();
    userEvent.hover(badge);

    expect(await screen.findByRole('tooltip')).toBeInTheDocument();

    expect(screen.getByText('This chart has a provenance file')).toBeInTheDocument();
    expect(screen.getByText(/This chart has been signed with/)).toBeInTheDocument();
    expect(screen.getByText('cosign')).toBeInTheDocument();
    expect(screen.getByText(/(Sigstore)/)).toBeInTheDocument();
  });

  it('does not render label for not helm package', () => {
    render(<SignedBadge repositoryKind={1} signed signatures={[Signature.Prov]} />);
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
