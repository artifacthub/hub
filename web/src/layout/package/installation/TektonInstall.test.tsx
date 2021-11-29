import { render, screen } from '@testing-library/react';

import { Repository, RepositoryKind } from '../../../types';
import TektonInstall from './TektonInstall';

const repo: Repository = {
  kind: RepositoryKind.TektonTask,
  name: 'repo',
  displayName: 'Repo',
  url: 'http://github.com/test/repo',
  userAlias: 'user',
  private: false,
};

const defaultProps = {
  contentUrl: 'https://url.com',
  repository: repo,
};

describe('TektonInstall', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<TektonInstall {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<TektonInstall {...defaultProps} />);

      expect(screen.getByText('Install the task:')).toBeInTheDocument();
      expect(screen.getByText('kubectl apply -f https://url.com')).toBeInTheDocument();
    });

    it('when kind is TektonPipeline', () => {
      render(<TektonInstall {...defaultProps} repository={{ ...repo, kind: RepositoryKind.TektonPipeline }} />);

      expect(screen.getByText('Install the pipeline:')).toBeInTheDocument();
      expect(screen.getByText('kubectl apply -f https://url.com')).toBeInTheDocument();
    });

    it('renders private repo', () => {
      render(<TektonInstall {...defaultProps} isPrivate />);

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent('Important: This repository is private and requires some credentials.');
    });

    describe('when contentUrl', () => {
      it('is undefined', () => {
        render(<TektonInstall {...defaultProps} contentUrl={undefined} />);
        expect(screen.getByText('kubectl apply -f TASK_RAW_YAML_URL')).toBeInTheDocument();
      });

      it('is an empty string', () => {
        render(<TektonInstall repository={{ ...repo, kind: RepositoryKind.TektonPipeline }} contentUrl="" />);
        expect(screen.getByText('kubectl apply -f PIPELINE_RAW_YAML_URL')).toBeInTheDocument();
      });
    });
  });
});
