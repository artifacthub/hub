import { render, screen } from '@testing-library/react';
import React from 'react';

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

  it('creates snapshot', () => {
    const { asFragment } = render(<HelmOCIInstall {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<HelmOCIInstall {...defaultProps} />);

      expect(screen.getByText('Enable OCI support')).toBeInTheDocument();
      expect(screen.getByText('HELM_EXPERIMENTAL_OCI=1')).toBeInTheDocument();
      expect(screen.getByText('Pull chart from remote')).toBeInTheDocument();
      expect(screen.getAllByText(/ghcr.io\/artifacthub\/artifact-hub:1.0.0/g)).toHaveLength(2);
      expect(screen.getByText('Export chart to directory')).toBeInTheDocument();
      expect(screen.getByText('Install chart')).toBeInTheDocument();
      expect(screen.getByText('helm install my-packageName ./packageName')).toBeInTheDocument();
    });

    it('renders private repo', () => {
      render(<HelmOCIInstall {...defaultProps} repository={{ ...defaultProps.repository, private: true }} />);

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent('Important: This repository is private and requires some credentials.');
    });
  });
});
