import { render, screen } from '@testing-library/react';

import { Repository } from '../../../types';
import OLMOCIInstall from './OLMOCIInstall';

const repo: Repository = {
  kind: 0,
  name: 'repo',
  displayName: 'Repo',
  url: 'oci://docker.io/ibmcom/ibm-operator-catalog:latest',
  userAlias: 'user',
  private: false,
};
const defaultProps = {
  name: 'packageName',
  repository: repo,
  defaultChannel: 'stable',
  channels: [
    { name: 'stable', version: '1.0.0' },
    { name: 'alpha', version: '1.1.0' },
  ],
};

describe('OLMOCIInstall', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const { asFragment } = render(<OLMOCIInstall {...defaultProps} />);
    expect(await screen.findByText('kubectl apply -f packageName-subscription.yaml')).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', async () => {
      render(<OLMOCIInstall {...defaultProps} />);

      expect(screen.getByText('Install catalog')).toBeInTheDocument();
      expect(screen.getByText('repo-catalog.yaml')).toBeInTheDocument();
      expect(await screen.findByText(/Repo/)).toBeInTheDocument();
      expect(screen.getByText(/user/)).toBeInTheDocument();
      expect(screen.getByText(/docker.io\/ibmcom\/ibm-operator-catalog:latest/)).toBeInTheDocument();
      expect(await screen.findByText('kubectl apply -f repo-catalog.yaml')).toBeInTheDocument();
      expect(screen.getByText('Create subscription')).toBeInTheDocument();
      expect(screen.getByText('packageName-subscription.yaml')).toBeInTheDocument();
      expect(screen.getAllByText(/stable/)).toHaveLength(2);
      expect(await screen.findByText('kubectl apply -f packageName-subscription.yaml')).toBeInTheDocument();

      const olmLink = screen.getByText('Need OLM?');
      expect(olmLink).toBeInTheDocument();
      expect(olmLink).toHaveProperty(
        'href',
        'https://github.com/operator-framework/operator-lifecycle-manager/blob/master/doc/install/install.md'
      );
    });

    it('renders private repo', () => {
      render(<OLMOCIInstall {...defaultProps} repository={{ ...defaultProps.repository, private: true }} />);

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent('Important: This repository is private and requires some credentials.');
    });
  });
});
