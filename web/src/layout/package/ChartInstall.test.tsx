import { render } from '@testing-library/react';
import React from 'react';

import { Repository } from '../../types';
import ChartInstall from './ChartInstall';

const repo: Repository = {
  kind: 0,
  name: 'repo',
  displayName: 'Repo',
  url: 'http://repo.test',
  userAlias: 'user',
};
const defaultProps = {
  name: 'packageName',
  version: '1.0.0',
  repository: repo,
};

describe('ChartInstall', () => {
  it('creates snapshot', () => {
    const result = render(<ChartInstall {...defaultProps} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText } = render(<ChartInstall {...defaultProps} />);

      expect(getByText(`helm repo add ${repo.name} ${repo.url}`));
      expect(getByText(`helm install ${repo.name}/${defaultProps.name} --version ${defaultProps.version}`));

      const helmLink = getByText('Need Helm?');
      expect(helmLink).toBeInTheDocument();
      expect(helmLink).toHaveProperty('href', 'https://helm.sh/docs/intro/quickstart/');
    });

    it('does not render content when version is undefined', () => {
      const { container } = render(<ChartInstall {...defaultProps} version={undefined} />);
      expect(container).toBeEmpty();
    });
  });
});
