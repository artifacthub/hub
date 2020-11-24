import { render } from '@testing-library/react';
import React from 'react';

import { Repository } from '../../../types';
import HelmInstall from './HelmInstall';

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

describe('HelmInstall', () => {
  it('creates snapshot', () => {
    const result = render(<HelmInstall {...defaultProps} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      const { getByText, getAllByText } = render(<HelmInstall {...defaultProps} />);

      expect(getAllByText('Helm v3')).toHaveLength(2);
      expect(getAllByText('Helm v2')).toHaveLength(2);
      expect(getByText(`helm repo add ${repo.name} ${repo.url}`)).toBeInTheDocument();
      expect(
        getByText(
          `helm install my-${defaultProps.name} ${repo.name}/${defaultProps.name} --version ${defaultProps.version}`
        )
      ).toBeInTheDocument();

      const helmLink = getByText('Need Helm?');
      expect(helmLink).toBeInTheDocument();
      expect(helmLink).toHaveProperty('href', 'https://helm.sh/docs/intro/quickstart/');
    });

    it('renders component with content url', () => {
      const { getByText, getAllByRole } = render(<HelmInstall {...defaultProps} contentUrl="http://content.url" />);

      expect(getByText(/You can also download this package's content directly using/g)).toBeInTheDocument();
      const contentUrl = getAllByRole('button')[5];
      expect(contentUrl).toBeInTheDocument();
      expect(contentUrl).toHaveTextContent('this link');
      expect(contentUrl).toHaveProperty('href', 'http://content.url/');
    });

    it('does not render content when version is undefined', () => {
      const { container } = render(<HelmInstall {...defaultProps} version={undefined} />);
      expect(container).toBeEmptyDOMElement();
    });
  });
});
