import { render, screen } from '@testing-library/react';

import { RepositoryKind } from '../../../types';
import KubeArmorInstall from './KubeArmorInstall';

const baseRepo = {
  repositoryId: 'af2de865-f025-49f3-a873-6d93e7fabb4c',
  name: 'kubearmor',
  url: 'https://codeberg.org/user/repo/policies',
  branch: 'main',
  private: false,
  kind: RepositoryKind.KubeArmor,
  verifiedPublisher: false,
  official: false,
  scannerDisabled: false,
  userAlias: 'test',
};

describe('KubeArmorInstall', () => {
  it('renders kubectl apply command for Codeberg repository', async () => {
    render(
      <KubeArmorInstall
        repository={baseRepo}
        policies={{ 'policy.yaml': 'apiVersion: security.kubearmor.com/v1' }}
        relativePath="/pkg"
      />
    );

    expect(
      await screen.findByText(/https:\/\/codeberg\.org\/user\/repo\/raw\/branch\/main\/policies\/pkg\/policy\.yaml/)
    ).toBeInTheDocument();
  });

  it('renders valid git clone fallback for self-hosted repository', async () => {
    render(
      <KubeArmorInstall
        repository={{ ...baseRepo, url: 'https://git.example.com/group/subgroup/repo.git/policies' }}
        policies={{ 'policy.yaml': 'apiVersion: security.kubearmor.com/v1' }}
        relativePath="/pkg"
      />
    );

    expect(await screen.findByText(/https:\/\/git\.example\.com\/group\/subgroup\/repo\.git/)).toBeInTheDocument();
    expect(screen.queryByText(/git clone null/)).toBeNull();
  });

  it('renders valid kubectl apply command for root-level package without relativePath', async () => {
    render(
      <KubeArmorInstall repository={baseRepo} policies={{ 'policy.yaml': 'apiVersion: security.kubearmor.com/v1' }} />
    );

    expect(
      await screen.findByText(/https:\/\/codeberg\.org\/user\/repo\/raw\/branch\/main\/policies\/policy\.yaml/)
    ).toBeInTheDocument();
    expect(screen.queryByText(/undefined/)).toBeNull();
  });
});
