import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter as Router } from 'react-router-dom';

import TektonManifestModal from './TektonManifestModal';

const mockUseNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as object),
  useNavigate: () => mockUseNavigate,
}));

jest.mock('react-syntax-highlighter', () => () => <div>content</div>);

const defaultProps = {
  manifestRaw:
    '---\napiVersion: tekton.dev/v1beta1\nkind: Task\nmetadata:\n  name: tkn\n  labels:\n    app.kubernetes.io/version: "0.2"\n  annotations:\n    tekton.dev/pipelines.minVersion: "0.17.0"\n    tekton.dev/tags: cli\n    tekton.dev/displayName: "Tekton CLI"\nspec:\n  workspaces:\n    - name: kubeconfig\n      description: >-\n        An optional workspace that allows you to provide a .kube/config\n        file for tkn to access the cluster. The file should be placed at\n        the root of the Workspace with name kubeconfig.\n      optional: true\n  description: >-\n    This task performs operations on Tekton resources using tkn\n\n  params:\n    - name: TKN_IMAGE\n      description: tkn CLI container image to run this task\n      default: gcr.io/tekton-releases/dogfooding/tkn@sha256:defb97935a4d4be26c760e43a397b649fb5591ac1aa6a736ada01e559c13767b\n    - name: SCRIPT\n      description: tkn CLI script to execute\n      type: string\n      default: "tkn $@"\n    - name: ARGS\n      type: array\n      description: tkn CLI arguments to run\n      default: ["--help"]\n  steps:\n    - name: tkn\n      image: "$(params.TKN_IMAGE)"\n      script: |\n        if [ "$(workspaces.kubeconfig.bound)" == "true" ] && [[ -e $(workspaces.kubeconfig.path)/kubeconfig ]]; then\n          export KUBECONFIG=$(workspaces.kubeconfig.path)/kubeconfig\n        fi\n\n        $(params.SCRIPT)\n      args: ["$(params.ARGS)"]\n',
  normalizedName: 'task-name',
  visibleManifest: false,
};

describe('TektonManifestModal', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(
      <Router>
        <TektonManifestModal {...defaultProps} />
      </Router>
    );
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders properly', () => {
      render(
        <Router>
          <TektonManifestModal {...defaultProps} />
        </Router>
      );

      expect(screen.getByRole('button', { name: 'Open Manifest' })).toBeInTheDocument();
      expect(screen.getByText('Manifest')).toBeInTheDocument();
    });

    it('does not render component when manifest is undefined', () => {
      const { container } = render(
        <Router>
          <TektonManifestModal normalizedName="task-name" visibleManifest={false} />
        </Router>
      );
      expect(container).toBeEmptyDOMElement();
    });

    it('opens manifest modal', async () => {
      render(
        <Router>
          <TektonManifestModal {...defaultProps} />
        </Router>
      );

      expect(screen.queryByRole('dialog')).toBeNull();

      const btn = screen.getByRole('button', { name: 'Open Manifest' });
      await userEvent.click(btn);

      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      expect(screen.getAllByText('Manifest')).toHaveLength(2);
      expect(screen.getByText('content')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Copy to clipboard' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument();
    });

    it('renders open modal', async () => {
      render(
        <Router>
          <TektonManifestModal {...defaultProps} visibleManifest />
        </Router>
      );

      expect(await screen.findByRole('dialog')).toBeInTheDocument();

      await waitFor(() => {
        expect(mockUseNavigate).toHaveBeenCalledTimes(1);
        expect(mockUseNavigate).toHaveBeenCalledWith('?modal=manifest', { replace: true, state: null });
      });
    });

    it('closes modal', async () => {
      render(
        <Router>
          <TektonManifestModal {...defaultProps} visibleManifest />
        </Router>
      );

      expect(await screen.findByRole('dialog')).toBeInTheDocument();

      const btn = screen.getByRole('button', { name: 'Close' });
      await userEvent.click(btn);

      await waitFor(() => {
        expect(mockUseNavigate).toHaveBeenCalledTimes(2);
        expect(mockUseNavigate).toHaveBeenLastCalledWith('', { replace: true, state: null });
      });
    });
  });
});
