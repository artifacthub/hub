import { render, screen } from '@testing-library/react';
import React from 'react';

import { Repository } from '../../../types';
import HelmPluginInstall from './HelmPluginInstall';

const repo: Repository = {
  kind: 6,
  name: 'repo',
  displayName: 'Repo',
  url: 'http://repo.test',
  userAlias: 'user',
  private: false,
};
const defaultProps = {
  name: 'packageName',
  repository: repo,
};

describe('HelmPluginInstall', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<HelmPluginInstall {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<HelmPluginInstall {...defaultProps} />);

      expect(screen.getByText('Install plugin')).toBeInTheDocument();
      expect(screen.getByText('helm plugin install http://repo.test')).toBeInTheDocument();

      const link = screen.getByText('Need Helm?');
      expect(link).toBeInTheDocument();
      expect(link).toHaveProperty('href', 'https://helm.sh/docs/intro/quickstart/');
    });

    it('renders private repo', () => {
      render(<HelmPluginInstall {...defaultProps} repository={{ ...defaultProps.repository, private: true }} />);

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent('Important: This repository is private and requires some credentials.');
    });
  });
});
