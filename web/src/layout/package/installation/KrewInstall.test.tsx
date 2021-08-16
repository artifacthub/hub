import { render, screen } from '@testing-library/react';
import React from 'react';

import { Repository } from '../../../types';
import KrewInstall from './KrewInstall';

const repo: Repository = {
  kind: 5,
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

describe('KrewInstall', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<KrewInstall {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<KrewInstall {...defaultProps} />);

      expect(screen.getByText('Add repository')).toBeInTheDocument();
      expect(screen.getByText('kubectl krew index add repo http://repo.test')).toBeInTheDocument();

      expect(screen.getByText('Install plugin')).toBeInTheDocument();
      expect(screen.getByText('kubectl krew install repo/packageName')).toBeInTheDocument();

      const link = screen.getByText('Need Krew?');
      expect(link).toBeInTheDocument();
      expect(link).toHaveProperty('href', 'https://krew.sigs.k8s.io/docs/user-guide/setup/install/');
    });

    it('renders component when is default Krew repo', () => {
      const props = {
        ...defaultProps,
        repository: { ...defaultProps.repository, url: 'https://github.com/kubernetes-sigs/krew-index' },
      };
      render(<KrewInstall {...props} />);

      expect(screen.queryByText('Add repository')).toBeNull();
      expect(screen.queryByText('kubectl krew index add repo http://repo.test')).toBeNull();

      expect(screen.getByText('Install plugin')).toBeInTheDocument();
      expect(screen.getByText('kubectl krew install packageName')).toBeInTheDocument();

      const link = screen.getByText('Need Krew?');
      expect(link).toBeInTheDocument();
      expect(link).toHaveProperty('href', 'https://krew.sigs.k8s.io/docs/user-guide/setup/install/');
    });

    it('renders private repo', () => {
      render(<KrewInstall {...defaultProps} repository={{ ...defaultProps.repository, private: true }} />);

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent('Important: This repository is private and requires some credentials.');
    });
  });
});
