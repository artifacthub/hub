import { render } from '@testing-library/react';
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
    const result = render(<HelmPluginInstall {...defaultProps} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText } = render(<HelmPluginInstall {...defaultProps} />);

      expect(getByText('Install plugin')).toBeInTheDocument();
      expect(getByText('helm plugin install http://repo.test')).toBeInTheDocument();

      const link = getByText('Need Helm?');
      expect(link).toBeInTheDocument();
      expect(link).toHaveProperty('href', 'https://helm.sh/docs/intro/quickstart/');
    });

    it('renders private repo', () => {
      const { getByRole } = render(
        <HelmPluginInstall {...defaultProps} repository={{ ...defaultProps.repository, private: true }} />
      );

      const alert = getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent('Important: This repository is private and requires some credentials.');
    });
  });
});
