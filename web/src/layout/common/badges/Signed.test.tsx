import { render, screen } from '@testing-library/react';

import { RepositoryKind, Signature } from '../../../types';
import Signed from './Signed';

const defaultProps = {
  signed: true as const,
  signatures: [Signature.Prov] as Signature[],
  repoKind: RepositoryKind.Helm,
};

describe('Signed', () => {
  it('does not render fingerprint block when fingerprint is empty', () => {
    render(
      <Signed
        {...defaultProps}
        signKey={{
          fingerprint: '   ',
          url: 'https://example.com/pubkey',
        }}
      />
    );

    expect(screen.queryByText('Fingerprint')).not.toBeInTheDocument();
    expect(screen.getByText('URL')).toBeInTheDocument();
    expect(screen.getByText('Sign key information')).toBeInTheDocument();
  });

  it('does not render url block when url is empty', () => {
    render(
      <Signed
        {...defaultProps}
        signKey={{
          fingerprint: 'AB:CD:EF',
          url: '',
        }}
      />
    );

    expect(screen.getByText('Fingerprint')).toBeInTheDocument();
    expect(screen.queryByText('URL')).not.toBeInTheDocument();
    expect(screen.getByText('Sign key information')).toBeInTheDocument();
  });

  it('does not render sign key section when both fingerprint and url are empty', () => {
    render(
      <Signed
        {...defaultProps}
        signKey={{
          fingerprint: '   ',
          url: '',
        }}
      />
    );

    expect(screen.queryByText('Sign key information')).not.toBeInTheDocument();
    expect(screen.queryByText('Fingerprint')).not.toBeInTheDocument();
    expect(screen.queryByText('URL')).not.toBeInTheDocument();
  });
});
