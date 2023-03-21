import { render, screen } from '@testing-library/react';

import KubectlGatekeeperInstall from './KubectlGatekeeperInstall';

const defaultProps = {
  relativePath: '/general/storageclass',
  repository: {
    repositoryId: 'af2de865-f025-49f3-a873-6d93e7fabb4c',
    name: 'gatekeeper',
    url: 'https://github.com/tegioz/gatekeeper-library/library',
    private: false,
    kind: 14,
    verifiedPublisher: false,
    official: false,
    scannerDisabled: false,
    userAlias: 'test',
  },
  examples: [
    {
      name: 'memory-ratio-only',
      cases: [
        {
          name: 'constraint',
          path: 'samples/container-must-meet-ratio/constraint.yaml',
          content:
            'apiVersion: constraints.gatekeeper.sh/v1beta1\nkind: K8sContainerRatios\nmetadata:\n  name: container-must-meet-ratio\nspec:\n  match:\n    kinds:\n      - apiGroups: [""]\n        kinds: ["Pod"]\n  parameters:\n    ratio: "2"\n',
        },
        {
          name: 'example-allowed',
          path: 'samples/container-must-meet-ratio/example_allowed.yaml',
          content:
            'apiVersion: v1\nkind: Pod\nmetadata:\n  name: opa-disallowed\n  labels:\n    owner: me.agilebank.demo\nspec:\n  containers:\n    - name: opa\n      image: openpolicyagent/opa:0.9.2\n      args:\n        - "run"\n        - "--server"\n        - "--addr=localhost:8080"\n      resources:\n        limits:\n          cpu: "200m"\n          memory: "200Mi"\n        requests:\n          cpu: "100m"\n          memory: "100Mi"\n',
        },
        {
          name: 'example-disallowed',
          path: 'samples/container-must-meet-ratio/example_disallowed.yaml',
          content:
            'apiVersion: v1\nkind: Pod\nmetadata:\n  name: opa-disallowed\n  labels:\n    owner: me.agilebank.demo\nspec:\n  containers:\n    - name: opa\n      image: openpolicyagent/opa:0.9.2\n      args:\n        - "run"\n        - "--server"\n        - "--addr=localhost:8080"\n      resources:\n        limits:\n          cpu: "800m"\n          memory: "2Gi"\n        requests:\n          cpu: "100m"\n          memory: "100Mi"\n',
        },
      ],
    },
    {
      name: 'memory-and-cpu-ratios',
      cases: [
        {
          name: 'constraint',
          path: 'samples/container-must-meet-memory-and-cpu-ratio/constraint.yaml',
          content:
            'apiVersion: constraints.gatekeeper.sh/v1beta1\nkind: K8sContainerRatios\nmetadata:\n  name: container-must-meet-memory-and-cpu-ratio\nspec:\n  match:\n    kinds:\n      - apiGroups: [""]\n        kinds: ["Pod"]\n  parameters:\n    ratio: "1"\n    cpuRatio: "10"\n',
        },
        {
          name: 'example-allowed',
          path: 'samples/container-must-meet-memory-and-cpu-ratio/example_allowed.yaml',
          content:
            'apiVersion: v1\nkind: Pod\nmetadata:\n  name: opa-allowed\n  labels:\n    owner: me.agilebank.demo\nspec:\n  containers:\n    - name: opa\n      image: openpolicyagent/opa:0.9.2\n      args:\n        - "run"\n        - "--server"\n        - "--addr=localhost:8080"\n      resources:\n        limits:\n          cpu: "4"\n          memory: "2Gi"\n        requests:\n          cpu: "1"\n          memory: "2Gi"\n',
        },
        {
          name: 'example-disallowed',
          path: 'samples/container-must-meet-memory-and-cpu-ratio/example_disallowed.yaml',
          content:
            'apiVersion: v1\nkind: Pod\nmetadata:\n  name: opa-disallowed\n  labels:\n    owner: me.agilebank.demo\nspec:\n  containers:\n    - name: opa\n      image: openpolicyagent/opa:0.9.2\n      args:\n        - "run"\n        - "--server"\n        - "--addr=localhost:8080"\n      resources:\n        limits:\n          cpu: "4"\n          memory: "2Gi"\n        requests:\n          cpu: "100m"\n          memory: "2Gi"\n',
        },
      ],
    },
  ],
};

describe('KubectlGatekeeperInstall', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', async () => {
    const { asFragment } = render(<KubectlGatekeeperInstall {...defaultProps} />);
    expect(await screen.findByText('library/general/storageclass')).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', async () => {
      render(<KubectlGatekeeperInstall {...defaultProps} />);

      expect(screen.getByText(/and the sample constraints provided in each/)).toBeInTheDocument();
      expect(await screen.findByText('library/general/storageclass')).toBeInTheDocument();
      expect(
        screen.getByText(/kubectl apply -f samples\/container-must-meet-ratio\/constraint\.yaml/)
      ).toBeInTheDocument();
    });

    it('renders private repo', () => {
      render(
        <KubectlGatekeeperInstall
          relativePath={defaultProps.relativePath}
          repository={{
            ...defaultProps.repository,
            private: true,
          }}
        />
      );

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent('Important: This repository is private and requires some credentials.');
    });
  });
});
