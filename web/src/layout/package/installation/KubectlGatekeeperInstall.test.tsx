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
  samples: {
    'storageclass/constraint.yaml':
      'apiVersion: constraints.gatekeeper.sh/v1beta1\nkind: K8sStorageClass\nmetadata:\n  name: storageclass\nspec:\n  match:\n    kinds:\n      - apiGroups: [""]\n        kinds: ["PersistentVolumeClaim"]\n      - apiGroups: ["apps"]\n        kinds: ["StatefulSet"]\n  parameters:\n    includeStorageClassesInMessage: true\n',
    'storageclass/example_allowed_ss.yaml':
      'apiVersion: apps/v1\nkind: StatefulSet\nmetadata:\n  name: volumeclaimstorageclass\nspec:\n  selector:\n    matchLabels:\n      app: volumeclaimstorageclass\n  serviceName: volumeclaimstorageclass\n  replicas: 1\n  template:\n    metadata:\n      labels:\n        app: volumeclaimstorageclass\n    spec:\n      containers:\n      - name: main\n        image: k8s.gcr.io/nginx-slim:0.8\n        volumeMounts:\n        - name: data\n          mountPath: /usr/share/nginx/html\n  volumeClaimTemplates:\n  - metadata:\n      name: data\n    spec:\n      accessModes: ["ReadWriteOnce"]\n      storageClassName: "somestorageclass"\n      resources:\n        requests:\n          storage: 1Gi\n',
    'storageclass/example_allowed_pvc.yaml':
      'apiVersion: v1\nkind: PersistentVolumeClaim\nmetadata:\n  name: ok\nspec:\n  accessModes:\n    - ReadWriteOnce\n  volumeMode: Filesystem\n  resources:\n    requests:\n      storage: 8Gi\n  storageClassName: somestorageclass\n',
    'storageclass/example_disallowed_pvc_badname.yaml':
      'apiVersion: v1\nkind: PersistentVolumeClaim\nmetadata:\n  name: badstorageclass\nspec:\n  accessModes:\n    - ReadWriteOnce\n  volumeMode: Filesystem\n  resources:\n    requests:\n      storage: 8Gi\n  storageClassName: badstorageclass\n',
    'storageclass/example_disallowed_pvc_nonamename.yaml':
      '---\napiVersion: v1\nkind: PersistentVolumeClaim\nmetadata:\n  name: nostorageclass\nspec:\n  accessModes:\n    - ReadWriteOnce\n  volumeMode: Filesystem\n  resources:\n    requests:\n      storage: 8Gi\n',
    'storageclass/example_disallowed_ssvct_nonamename.yaml':
      'apiVersion: apps/v1\nkind: StatefulSet\nmetadata:\n  name: novolumeclaimstorageclass\nspec:\n  selector:\n    matchLabels:\n      app: novolumeclaimstorageclass\n  serviceName: novolumeclaimstorageclass\n  replicas: 1\n  template:\n    metadata:\n      labels:\n        app: novolumeclaimstorageclass\n    spec:\n      containers:\n      - name: main\n        image: k8s.gcr.io/nginx-slim:0.8\n        volumeMounts:\n        - name: data\n          mountPath: /usr/share/nginx/html\n  volumeClaimTemplates:\n  - metadata:\n      name: data\n    spec:\n      accessModes: ["ReadWriteOnce"]\n      resources:\n        requests:\n          storage: 1Gi\n',
    'storageclass/example_disallowed_ssvct_badnamename.yaml':
      'apiVersion: apps/v1\nkind: StatefulSet\nmetadata:\n  name: badvolumeclaimstorageclass\nspec:\n  selector:\n    matchLabels:\n      app: badvolumeclaimstorageclass\n  serviceName: badvolumeclaimstorageclass\n  replicas: 1\n  template:\n    metadata:\n      labels:\n        app: badvolumeclaimstorageclass\n    spec:\n      containers:\n      - name: main\n        image: k8s.gcr.io/nginx-slim:0.8\n        volumeMounts:\n        - name: data\n          mountPath: /usr/share/nginx/html\n  volumeClaimTemplates:\n  - metadata:\n      name: data\n    spec:\n      accessModes: ["ReadWriteOnce"]\n      storageClassName: "badstorageclass"\n      resources:\n        requests:\n          storage: 1Gi\n',
    'storageclass/example_inventory_allowed_storageclass.yaml':
      'apiVersion: storage.k8s.io/v1\nkind: StorageClass\nmetadata:\n  name: somestorageclass\nprovisioner: foo\nparameters:\nallowVolumeExpansion: true\n',
  },
};

describe('KubectlGatekeeperInstall', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<KubectlGatekeeperInstall {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<KubectlGatekeeperInstall {...defaultProps} />);

      expect(screen.getByText(/and the sample constraints provided in each/)).toBeInTheDocument();
      expect(screen.getByText('library/general/storageclass')).toBeInTheDocument();
      expect(screen.getByText(/kubectl apply -f samples\/storageclass\/constraint\.yaml/)).toBeInTheDocument();
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
