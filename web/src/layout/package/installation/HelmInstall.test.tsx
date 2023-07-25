import { render, screen } from '@testing-library/react';

import { Repository } from '../../../types';
import HelmInstall from './HelmInstall';

const repo: Repository = {
  kind: 0,
  name: 'repo',
  displayName: 'Repo',
  url: 'http://repo.test',
  userAlias: 'user',
  private: false,
};
const defaultProps = {
  name: 'packageName',
  version: '1.0.0',
  repository: repo,
  label: 'v3',
};

describe('HelmInstall', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const { asFragment } = render(<HelmInstall {...defaultProps} />);
    expect(await screen.findByText('helm install my-packageName repo/packageName --version 1.0.0')).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', async () => {
      render(<HelmInstall {...defaultProps} />);

      expect(await screen.findByText(`helm repo add ${repo.name} ${repo.url}`)).toBeInTheDocument();
      expect(
        await screen.findByText(
          `helm install my-${defaultProps.name} ${repo.name}/${defaultProps.name} --version ${defaultProps.version}`
        )
      ).toBeInTheDocument();

      const helmLink = screen.getByText('Need Helm?');
      expect(helmLink).toBeInTheDocument();
      expect(helmLink).toHaveProperty('href', 'https://helm.sh/docs/intro/quickstart/');
    });

    it('renders component with content url', () => {
      render(<HelmInstall {...defaultProps} contentUrl="http://content.url" />);

      expect(screen.getByText(/You can also download this package's content directly using/)).toBeInTheDocument();
      const contentUrl = screen.getAllByRole('button')[3];
      expect(contentUrl).toBeInTheDocument();
      expect(contentUrl).toHaveTextContent('this link');
      expect(contentUrl).toHaveProperty('href', 'http://content.url/');
    });

    it('renders private repo', () => {
      render(<HelmInstall {...defaultProps} repository={{ ...defaultProps.repository, private: true }} />);

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent('Important: This repository is private and requires some credentials.');
    });
  });
});
