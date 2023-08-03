import { render, screen } from '@testing-library/react';

import { Repository } from '../../../types';
import HelmOCIInstall from './HelmOCIInstall';

const repo: Repository = {
  kind: 0,
  name: 'repo',
  displayName: 'Repo',
  url: 'oci://ghcr.io/artifacthub/artifact-hub',
  userAlias: 'user',
  private: false,
};

const defaultProps = {
  name: 'packageName',
  version: '1.0.0',
  repository: repo,
};

describe('HelmOCIInstall', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const { asFragment } = render(<HelmOCIInstall {...defaultProps} />);
    expect(
      await screen.findByText('helm install my-packageName oci://ghcr.io/artifacthub/artifact-hub --version 1.0.0')
    ).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', async () => {
      render(<HelmOCIInstall {...defaultProps} />);

      expect(await screen.findByText('Install chart')).toBeInTheDocument();
      expect(screen.getByText('my-packageName')).toBeInTheDocument();
      expect(screen.getByText('helm install')).toBeInTheDocument();
      expect(
        await screen.findByText('helm install my-packageName oci://ghcr.io/artifacthub/artifact-hub --version 1.0.0')
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /corresponds to the release name, feel free to change it to suit your needs. You can also add additional flags to the/
        )
      ).toBeInTheDocument();
    });

    it('renders private repo', () => {
      render(<HelmOCIInstall {...defaultProps} repository={{ ...defaultProps.repository, private: true }} />);

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent('Important: This repository is private and requires some credentials.');
    });
  });
});
