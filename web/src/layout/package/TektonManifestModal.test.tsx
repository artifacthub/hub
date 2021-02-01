import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import TektonManifestModal from './TektonManifestModal';

const defaultProps = {
  manifestRaw:
    '---\napiVersion: tekton.dev/v1beta1\nkind: Task\nmetadata:\n  name: tkn\n  labels:\n    app.kubernetes.io/version: "0.2"\n  annotations:\n    tekton.dev/pipelines.minVersion: "0.17.0"\n    tekton.dev/tags: cli\n    tekton.dev/displayName: "Tekton CLI"\nspec:\n  workspaces:\n    - name: kubeconfig\n      description: >-\n        An optional workspace that allows you to provide a .kube/config\n        file for tkn to access the cluster. The file should be placed at\n        the root of the Workspace with name kubeconfig.\n      optional: true\n  description: >-\n    This task performs operations on Tekton resources using tkn\n\n  params:\n    - name: TKN_IMAGE\n      description: tkn CLI container image to run this task\n      default: gcr.io/tekton-releases/dogfooding/tkn@sha256:defb97935a4d4be26c760e43a397b649fb5591ac1aa6a736ada01e559c13767b\n    - name: SCRIPT\n      description: tkn CLI script to execute\n      type: string\n      default: "tkn $@"\n    - name: ARGS\n      type: array\n      description: tkn CLI arguments to run\n      default: ["--help"]\n  steps:\n    - name: tkn\n      image: "$(params.TKN_IMAGE)"\n      script: |\n        if [ "$(workspaces.kubeconfig.bound)" == "true" ] && [[ -e $(workspaces.kubeconfig.path)/kubeconfig ]]; then\n          export KUBECONFIG=$(workspaces.kubeconfig.path)/kubeconfig\n        fi\n\n        $(params.SCRIPT)\n      args: ["$(params.ARGS)"]\n',
  normalizedName: 'task-name',
};

describe('TektonManifestModal', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const result = render(<TektonManifestModal {...defaultProps} />);
    expect(result.asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders properly', () => {
      const { getByTestId, getByText } = render(<TektonManifestModal {...defaultProps} />);

      expect(getByTestId('tektonManifestBtn')).toBeInTheDocument();
      expect(getByText('Manifest YAML')).toBeInTheDocument();
    });

    it('does not render component when manifest is undefined', () => {
      const { container } = render(<TektonManifestModal normalizedName="task-name" />);
      expect(container).toBeEmptyDOMElement();
    });

    it('opens manifest modal', () => {
      const { queryByRole, getByText, getByTestId, getAllByText } = render(<TektonManifestModal {...defaultProps} />);

      const modal = queryByRole('dialog');
      expect(modal).toBeNull();

      const btn = getByTestId('tektonManifestBtn');
      fireEvent.click(btn);

      waitFor(() => {
        expect(modal).toBeInTheDocument();
        expect(getAllByText('Manifest YAML')).toHaveLength(2);
        expect(getByText(/apiVersion: tekton.dev\/11abetv/g)).toBeInTheDocument();
        expect(getByTestId('ctcBtn')).toBeInTheDocument();
        expect(getByTestId('downloadBtn')).toBeInTheDocument();
      });
    });
  });
});
