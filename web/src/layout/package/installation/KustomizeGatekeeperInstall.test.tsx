import { render, screen } from '@testing-library/react';

import KustomizeGatekeeperInstall from './KustomizeGatekeeperInstall';

const defaultProps = {
  relativePath: '/general/storageclass',
  repository: {
    repositoryId: 'af2de865-f025-49f3-a873-6d93e7fabb4c',
    name: 'gatekeeper',
    url: 'https://github.com/tegioz/gatekeeper-library/library',
    private: false,
    kind: 14,
    verifiedPublisher: false,
    official: false,
    scannerDisabled: false,
    userAlias: 'test',
  },
};

describe('KustomizeGatekeeperInstall', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const { asFragment } = render(<KustomizeGatekeeperInstall {...defaultProps} />);
    expect(await screen.findByText('kustomize.config.k8s.io/v1beta1')).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', async () => {
      render(<KustomizeGatekeeperInstall {...defaultProps} />);

      expect(await screen.findByText('kustomize.config.k8s.io/v1beta1')).toBeInTheDocument();
      expect(screen.getByText('github.com/tegioz/gatekeeper-library/library/general/storageclass')).toBeInTheDocument();

      const link = screen.getByText('kustomization documentation');
      expect(link).toBeInTheDocument();
      expect(link).toHaveProperty('href', 'https://kubectl.docs.kubernetes.io/installation/kustomize/');
    });

    it('renders subgroup repository with .git delimiter', async () => {
      render(
        <KustomizeGatekeeperInstall
          relativePath={defaultProps.relativePath}
          repository={{
            ...defaultProps.repository,
            url: 'https://gitlab.com/group/subgroup/gatekeeper-library.git/library',
          }}
        />
      );

      expect(
        await screen.findByText(
          'https://gitlab.com/group/subgroup/gatekeeper-library.git//library/general/storageclass'
        )
      ).toBeInTheDocument();
    });

    it('renders non-github repository keeping https scheme', async () => {
      render(
        <KustomizeGatekeeperInstall
          relativePath={defaultProps.relativePath}
          repository={{
            ...defaultProps.repository,
            url: 'https://codeberg.org/user/gatekeeper-library/library',
          }}
        />
      );

      expect(
        await screen.findByText('https://codeberg.org/user/gatekeeper-library//library/general/storageclass')
      ).toBeInTheDocument();
    });

    it('renders root-level package in .git subgroup repository without relativePath', async () => {
      render(
        <KustomizeGatekeeperInstall
          repository={{
            ...defaultProps.repository,
            url: 'https://gitlab.com/group/subgroup/gatekeeper-library.git',
          }}
        />
      );

      expect(await screen.findByText('https://gitlab.com/group/subgroup/gatekeeper-library.git')).toBeInTheDocument();
    });

    it('renders private repo', () => {
      render(
        <KustomizeGatekeeperInstall
          relativePath={defaultProps.relativePath}
          repository={{
            ...defaultProps.repository,
            private: true,
          }}
        />
      );

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent('Important: This repository is private and requires some credentials.');
    });
  });
});
