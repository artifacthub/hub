import { render } from '@testing-library/react';
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
    const result = render(<HelmOCIInstall {...defaultProps} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText, getAllByText } = render(<HelmOCIInstall {...defaultProps} />);

      expect(getByText('Enable OCI support')).toBeInTheDocument();
      expect(getByText('HELM_EXPERIMENTAL_OCI=1')).toBeInTheDocument();
      expect(getByText('Pull chart from remote')).toBeInTheDocument();
      expect(getAllByText(/ghcr.io\/artifacthub\/artifact-hub:1.0.0/g)).toHaveLength(2);
      expect(getByText('Export chart to directory')).toBeInTheDocument();
      expect(getByText('Install chart')).toBeInTheDocument();
      expect(getByText('helm install my-packageName ./packageName')).toBeInTheDocument();
    });

    it('renders private repo', () => {
      const { getByRole } = render(
        <HelmOCIInstall {...defaultProps} repository={{ ...defaultProps.repository, private: true }} />
      );

      const alert = getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent('Important: This repository is private and requires some credentials.');
    });
  });
});
