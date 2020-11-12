import { render } from '@testing-library/react';
import React from 'react';

import { Repository } from '../../../types';
import OLMOCIInstall from './OLMOCIInstall';

const repo: Repository = {
  kind: 0,
  name: 'repo',
  displayName: 'Repo',
  url: 'oci://docker.io/ibmcom/ibm-operator-catalog:latest',
  userAlias: 'user',
};
const defaultProps = {
  name: 'packageName',
  repository: repo,
  activeChannel: 'stable',
};

describe('OLMOCIInstall', () => {
  it('creates snapshot', () => {
    const result = render(<OLMOCIInstall {...defaultProps} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText } = render(<OLMOCIInstall {...defaultProps} />);

      expect(getByText('Install catalog')).toBeInTheDocument();
      expect(getByText('repo-catalog.yaml')).toBeInTheDocument();
      expect(getByText(/Repo/g)).toBeInTheDocument();
      expect(getByText(/user/g)).toBeInTheDocument();
      expect(getByText(/docker.io\/ibmcom\/ibm-operator-catalog:latest/g)).toBeInTheDocument();
      expect(getByText('kubectl apply -f repo-catalog.yaml')).toBeInTheDocument();
      expect(getByText('Create subscription')).toBeInTheDocument();
      expect(getByText('packageName-subscription.yaml')).toBeInTheDocument();
      expect(getByText(/stable/g)).toBeInTheDocument();
      expect(getByText('kubectl apply -f packageName-subscription.yaml')).toBeInTheDocument();

      const olmLink = getByText('Need OLM?');
      expect(olmLink).toBeInTheDocument();
      expect(olmLink).toHaveProperty(
        'href',
        'https://github.com/operator-framework/operator-lifecycle-manager/blob/master/doc/install/install.md'
      );
    });
  });
});
