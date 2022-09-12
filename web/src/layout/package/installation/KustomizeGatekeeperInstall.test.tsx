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

  it('creates snapshot', () => {
    const { asFragment } = render(<KustomizeGatekeeperInstall {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<KustomizeGatekeeperInstall {...defaultProps} />);

      expect(screen.getByText('kustomize.config.k8s.io/v1beta1')).toBeInTheDocument();
      expect(screen.getByText('github.com/tegioz/gatekeeper-library/library/general/storageclass')).toBeInTheDocument();

      const link = screen.getByText('kustomization documentation');
      expect(link).toBeInTheDocument();
      expect(link).toHaveProperty('href', 'https://kubectl.docs.kubernetes.io/installation/kustomize/');
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
