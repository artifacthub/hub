import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ValuesView from './ValuesView';

const updateUrlMock = jest.fn();

const defaultProps = {
  values:
    '# Default values for cert-manager.\n# This is a YAML-formatted file.\n# Declare variables to be passed into your templates.\nglobal:\n  ## Reference to one or more secrets to be used when pulling images\n  ## ref: https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/\n  ##\n  imagePullSecrets: []\n  # - name: "image-pull-secret"\n\n  # Optional priority class to be used for the cert-manager pods\n  priorityClassName: ""\n  rbac:\n    create: true\n    # Aggregate ClusterRoles to Kubernetes default user-facing roles. Ref: https://kubernetes.io/docs/reference/access-authn-authz/rbac/#user-facing-roles\n    aggregateClusterRoles: true\n\n  podSecurityPolicy:\n    enabled: false\n    useAppArmor: true\n\n  # Set the verbosity of cert-manager. Range of 0 - 6 with 6 being the most verbose.\n  logLevel: 2\n\n  leaderElection:\n    # Override the namespace used to store the ConfigMap for leader election\n    namespace: "kube-system"\n\n    # The duration that non-leader candidates will wait after observing a\n    # leadership renewal until attempting to acquire leadership of a led but\n    # unrenewed leader slot. This is effectively the maximum duration that a\n    # leader can be stopped before it is replaced by another candidate.\n    # leaseDuration: 60s\n\n    # The interval between attempts by the acting master to renew a leadership\n    # slot before it stops leading. This must be less than or equal to the\n    # lease duration.\n    # renewDeadline: 40s\n\n    # The duration the clients should wait between attempting acquisition and\n    # renewal of a leadership.\n    # retryPeriod: 15s\n\ninstallCRDs: false\n\nreplicaCount: 1\n\nstrategy: {}\n  # type: RollingUpdate\n  # rollingUpdate:\n  #   maxSurge: 0\n  #   maxUnavailable: 1\n\n# Comma separated list of feature gates that should be enabled on the\n# controller pod.\nfeatureGates: ""\n\nimage:\n  repository: quay.io/jetstack/cert-manager-controller\n  # You can manage a registry with\n  # registry: quay.io\n  # repository: jetstack/cert-manager-controller\n\n  # Override the image tag to deploy by setting this variable.\n  # If no value is set, the chart\'s appVersion will be used.\n  # tag: canary\n\n  # Setting a digest will override any tag\n  # digest: sha256:0e072dddd1f7f8fc8909a2ca6f65e76c5f0d2fcfb8be47935ae3457e8bbceb20\n  pullPolicy: IfNotPresent\n\n# Override the namespace used to store DNS provider credentials etc. for ClusterIssuer\n# resources. By default, the same namespace as cert-manager is deployed within is\n# used. This namespace will not be automatically created by the Helm chart.\nclusterResourceNamespace: ""\n\n# This namespace allows you to define where the services will be installed into\n# if not set then they will use the namespace of the release\n# This is helpful when installing cert manager as a chart dependency (sub chart)\nnamespace: ""\n\nserviceAccount:\n  # Specifies whether a service account should be created\n  create: true\n  # The name of the service account to use.\n  # If not set and create is true, a name is generated using the fullname template\n  # name: ""\n  # Optional additional annotations to add to the controller\'s ServiceAccount\n  # annotations: {}\n  # Automount API credentials for a Service Account.\n  # Optional additional labels to add to the controller\'s ServiceAccount\n  # labels: {}\n  automountServiceAccountToken: true\n\n# Automounting API credentials for a particular pod\n# automountServiceAccountToken: true\n\n# Additional command line flags to pass to cert-manager controller binary.\n# To see all available flags run docker run quay.io/jetstack/cert-manager-controller:<version> --help\nextraArgs: []\n  # When this flag is enabled, secrets will be automatically removed when the certificate resource is deleted\n  # - --enable-certificate-owner-ref=true\n  # Use this flag to enabled or disable arbitrary controllers, for example, disable the CertificiateRequests approver\n  # - --controllers=*,-certificaterequests-approver\n\nextraEnv: []\n# - name: SOME_VAR\n#   value: \'some value\'\n\nresources: {}\n  # requests:\n  #   cpu: 10m\n  #   memory: 32Mi\n\n# Pod Security Context\n# ref: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/\nsecurityContext:\n  runAsNonRoot: true\n\n# Container Security Context to be set on the controller component container\n# ref: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/\ncontainerSecurityContext:\n  allowPrivilegeEscalation: false\n  # capabilities:\n  #   drop:\n  #   - ALL\n  # readOnlyRootFilesystem: true\n  # runAsNonRoot: true\n\n\nvolumes: []\n\nvolumeMounts: []\n\n# Optional additional annotations to add to the controller Deployment\n# deploymentAnnotations: {}\n\n# Optional additional annotations to add to the controller Pods\n# podAnnotations: {}\n\npodLabels: {}\n\n# Optional annotations to add to the controller Service\n# serviceAnnotations: {}\n\n# Optional additional labels to add to the controller Service\n# serviceLabels: {}\n\n# Optional DNS settings, useful if you have a public and private DNS zone for\n# the same domain on Route 53. What follows is an example of ensuring\n# cert-manager can access an ingress or DNS TXT records at all times.\n# NOTE: This requires Kubernetes 1.10 or `CustomPodDNS` feature gate enabled for\n# the cluster to work.\n# podDnsPolicy: "None"\n# podDnsConfig:\n#   nameservers:\n#     - "1.1.1.1"\n#     - "8.8.8.8"\n\nnodeSelector:\n  kubernetes.io/os: linux\n\ningressShim: {}\n  # defaultIssuerName: ""\n  # defaultIssuerKind: ""\n  # defaultIssuerGroup: ""\n\nprometheus:\n  enabled: true\n  servicemonitor:\n    enabled: false\n    prometheusInstance: default\n    targetPort: 9402\n    path: /metrics\n    interval: 60s\n    scrapeTimeout: 30s\n    labels: {}\n    honorLabels: false\n\n# Use these variables to configure the HTTP_PROXY environment variables\n# http_proxy: "http://proxy:8080"\n# https_proxy: "https://proxy:8080"\n# no_proxy: 127.0.0.1,localhost\n\n# expects input structure as per specification https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.11/#affinity-v1-core\n# for example:\n#   affinity:\n#     nodeAffinity:\n#      requiredDuringSchedulingIgnoredDuringExecution:\n#        nodeSelectorTerms:\n#        - matchExpressions:\n#          - key: foo.bar.com/role\n#            operator: In\n#            values:\n#            - master\naffinity: {}\n\n# expects input structure as per specification https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.11/#toleration-v1-core\n# for example:\n#   tolerations:\n#   - key: foo.bar.com/role\n#     operator: Equal\n#     value: master\n#     effect: NoSchedule\ntolerations: []\n\nwebhook:\n  replicaCount: 1\n  timeoutSeconds: 10\n\n  # Used to configure options for the webhook pod.\n  # This allows setting options that\'d usually be provided via flags.\n  # An APIVersion and Kind must be specified in your values.yaml file.\n  # Flags will override options that are set here.\n  config:\n    # apiVersion: webhook.config.cert-manager.io/v1alpha1\n    # kind: WebhookConfiguration\n\n    # The port that the webhook should listen on for requests.\n    # In GKE private clusters, by default kubernetes apiservers are allowed to\n    # talk to the cluster nodes only on 443 and 10250. so configuring\n    # securePort: 10250, will work out of the box without needing to add firewall\n    # rules or requiring NET_BIND_SERVICE capabilities to bind port numbers <1000.\n    # This should be uncommented and set as a default by the chart once we graduate\n    # the apiVersion of WebhookConfiguration past v1alpha1.\n    # securePort: 10250\n\n  strategy: {}\n    # type: RollingUpdate\n    # rollingUpdate:\n    #   maxSurge: 0\n    #   maxUnavailable: 1\n\n  # Pod Security Context to be set on the webhook component Pod\n  # ref: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/\n  securityContext:\n    runAsNonRoot: true\n\n  # Container Security Context to be set on the webhook component container\n  # ref: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/\n  containerSecurityContext:\n    allowPrivilegeEscalation: false\n    # capabilities:\n    #   drop:\n    #   - ALL\n    # readOnlyRootFilesystem: true\n    # runAsNonRoot: true\n\n  # Optional additional annotations to add to the webhook Deployment\n  # deploymentAnnotations: {}\n\n  # Optional additional annotations to add to the webhook Pods\n  # podAnnotations: {}\n\n  # Optional additional annotations to add to the webhook Service\n  # serviceAnnotations: {}\n\n  # Optional additional annotations to add to the webhook MutatingWebhookConfiguration\n  # mutatingWebhookConfigurationAnnotations: {}\n\n  # Optional additional annotations to add to the webhook ValidatingWebhookConfiguration\n  # validatingWebhookConfigurationAnnotations: {}\n\n  # Additional command line flags to pass to cert-manager webhook binary.\n  # To see all available flags run docker run quay.io/jetstack/cert-manager-webhook:<version> --help\n  extraArgs: []\n  # Path to a file containing a WebhookConfiguration object used to configure the webhook\n  # - --config=<path-to-config-file>\n\n  resources: {}\n    # requests:\n    #   cpu: 10m\n    #   memory: 32Mi\n\n  ## Liveness and readiness probe values\n  ## Ref: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#container-probes\n  ##\n  livenessProbe:\n    failureThreshold: 3\n    initialDelaySeconds: 60\n    periodSeconds: 10\n    successThreshold: 1\n    timeoutSeconds: 1\n  readinessProbe:\n    failureThreshold: 3\n    initialDelaySeconds: 5\n    periodSeconds: 5\n    successThreshold: 1\n    timeoutSeconds: 1\n\n  nodeSelector:\n    kubernetes.io/os: linux\n\n  affinity: {}\n\n  tolerations: []\n\n  # Optional additional labels to add to the Webhook Pods\n  podLabels: {}\n\n  # Optional additional labels to add to the Webhook Service\n  serviceLabels: {}\n\n  image:\n    repository: quay.io/jetstack/cert-manager-webhook\n    # You can manage a registry with\n    # registry: quay.io\n    # repository: jetstack/cert-manager-webhook\n\n    # Override the image tag to deploy by setting this variable.\n    # If no value is set, the chart\'s appVersion will be used.\n    # tag: canary\n\n    # Setting a digest will override any tag\n    # digest: sha256:0e072dddd1f7f8fc8909a2ca6f65e76c5f0d2fcfb8be47935ae3457e8bbceb20\n\n    pullPolicy: IfNotPresent\n\n  serviceAccount:\n    # Specifies whether a service account should be created\n    create: true\n    # The name of the service account to use.\n    # If not set and create is true, a name is generated using the fullname template\n    # name: ""\n    # Optional additional annotations to add to the controller\'s ServiceAccount\n    # annotations: {}\n    # Optional additional labels to add to the webhook\'s ServiceAccount\n    # labels: {}\n    # Automount API credentials for a Service Account.\n    automountServiceAccountToken: true\n\n  # Automounting API credentials for a particular pod\n  # automountServiceAccountToken: true\n\n  # The port that the webhook should listen on for requests.\n  # In GKE private clusters, by default kubernetes apiservers are allowed to\n  # talk to the cluster nodes only on 443 and 10250. so configuring\n  # securePort: 10250, will work out of the box without needing to add firewall\n  # rules or requiring NET_BIND_SERVICE capabilities to bind port numbers <1000\n  securePort: 10250\n\n  # Specifies if the webhook should be started in hostNetwork mode.\n  #\n  # Required for use in some managed kubernetes clusters (such as AWS EKS) with custom\n  # CNI (such as calico), because control-plane managed by AWS cannot communicate\n  # with pods\' IP CIDR and admission webhooks are not working\n  #\n  # Since the default port for the webhook conflicts with kubelet on the host\n  # network, `webhook.securePort` should be changed to an available port if\n  # running in hostNetwork mode.\n  hostNetwork: false\n\n  # Specifies how the service should be handled. Useful if you want to expose the\n  # webhook to outside of the cluster. In some cases, the control plane cannot\n  # reach internal services.\n  serviceType: ClusterIP\n  # loadBalancerIP:\n\n  # Overrides the mutating webhook and validating webhook so they reach the webhook\n  # service using the `url` field instead of a service.\n  url: {}\n    # host:\n\ncainjector:\n  enabled: true\n  replicaCount: 1\n\n  strategy: {}\n    # type: RollingUpdate\n    # rollingUpdate:\n    #   maxSurge: 0\n    #   maxUnavailable: 1\n\n  # Pod Security Context to be set on the cainjector component Pod\n  # ref: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/\n  securityContext:\n    runAsNonRoot: true\n\n  # Container Security Context to be set on the cainjector component container\n  # ref: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/\n  containerSecurityContext:\n    allowPrivilegeEscalation: false\n    # capabilities:\n    #   drop:\n    #   - ALL\n    # readOnlyRootFilesystem: true\n    # runAsNonRoot: true\n\n\n  # Optional additional annotations to add to the cainjector Deployment\n  # deploymentAnnotations: {}\n\n  # Optional additional annotations to add to the cainjector Pods\n  # podAnnotations: {}\n\n  # Additional command line flags to pass to cert-manager cainjector binary.\n  # To see all available flags run docker run quay.io/jetstack/cert-manager-cainjector:<version> --help\n  extraArgs: []\n  # Enable profiling for cainjector\n  # - --enable-profiling=true\n\n  resources: {}\n    # requests:\n    #   cpu: 10m\n    #   memory: 32Mi\n\n  nodeSelector:\n    kubernetes.io/os: linux\n\n  affinity: {}\n\n  tolerations: []\n\n  # Optional additional labels to add to the CA Injector Pods\n  podLabels: {}\n\n  image:\n    repository: quay.io/jetstack/cert-manager-cainjector\n    # You can manage a registry with\n    # registry: quay.io\n    # repository: jetstack/cert-manager-cainjector\n\n    # Override the image tag to deploy by setting this variable.\n    # If no value is set, the chart\'s appVersion will be used.\n    # tag: canary\n\n    # Setting a digest will override any tag\n    # digest: sha256:0e072dddd1f7f8fc8909a2ca6f65e76c5f0d2fcfb8be47935ae3457e8bbceb20\n\n    pullPolicy: IfNotPresent\n\n  serviceAccount:\n    # Specifies whether a service account should be created\n    create: true\n    # The name of the service account to use.\n    # If not set and create is true, a name is generated using the fullname template\n    # name: ""\n    # Optional additional annotations to add to the controller\'s ServiceAccount\n    # annotations: {}\n    # Automount API credentials for a Service Account.\n    # Optional additional labels to add to the cainjector\'s ServiceAccount\n    # labels: {}\n    automountServiceAccountToken: true\n\n  # Automounting API credentials for a particular pod\n  # automountServiceAccountToken: true\n\n# This startupapicheck is a Helm post-install hook that waits for the webhook\n# endpoints to become available.\n# The check is implemented using a Kubernetes Job- if you are injecting mesh\n# sidecar proxies into cert-manager pods, you probably want to ensure that they\n# are not injected into this Job\'s pod. Otherwise the installation may time out\n# due to the Job never being completed because the sidecar proxy does not exit.\n# See https://github.com/cert-manager/cert-manager/pull/4414 for context.\nstartupapicheck:\n  enabled: true\n\n  # Pod Security Context to be set on the startupapicheck component Pod\n  # ref: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/\n  securityContext:\n    runAsNonRoot: true\n\n  # Container Security Context to be set on the controller component container\n  # ref: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/\n  containerSecurityContext:\n    allowPrivilegeEscalation: false\n    # capabilities:\n    #   drop:\n    #   - ALL\n    # readOnlyRootFilesystem: true\n    # runAsNonRoot: true\n\n  # Timeout for \'kubectl check api\' command\n  timeout: 1m\n\n  # Job backoffLimit\n  backoffLimit: 4\n\n  # Optional additional annotations to add to the startupapicheck Job\n  jobAnnotations:\n    helm.sh/hook: post-install\n    helm.sh/hook-weight: "1"\n    helm.sh/hook-delete-policy: before-hook-creation,hook-succeeded\n\n  # Optional additional annotations to add to the startupapicheck Pods\n  # podAnnotations: {}\n\n  # Additional command line flags to pass to startupapicheck binary.\n  # To see all available flags run docker run quay.io/jetstack/cert-manager-ctl:<version> --help\n  extraArgs: []\n\n  resources: {}\n    # requests:\n    #   cpu: 10m\n    #   memory: 32Mi\n\n  nodeSelector:\n    kubernetes.io/os: linux\n\n  affinity: {}\n\n  tolerations: []\n\n  # Optional additional labels to add to the startupapicheck Pods\n  podLabels: {}\n\n  image:\n    repository: quay.io/jetstack/cert-manager-ctl\n    # You can manage a registry with\n    # registry: quay.io\n    # repository: jetstack/cert-manager-ctl\n\n    # Override the image tag to deploy by setting this variable.\n    # If no value is set, the chart\'s appVersion will be used.\n    # tag: canary\n\n    # Setting a digest will override any tag\n    # digest: sha256:0e072dddd1f7f8fc8909a2ca6f65e76c5f0d2fcfb8be47935ae3457e8bbceb20\n\n    pullPolicy: IfNotPresent\n\n  rbac:\n    # annotations for the startup API Check job RBAC and PSP resources\n    annotations:\n      helm.sh/hook: post-install\n      helm.sh/hook-weight: "-5"\n      helm.sh/hook-delete-policy: before-hook-creation,hook-succeeded\n\n  serviceAccount:\n    # Specifies whether a service account should be created\n    create: true\n\n    # The name of the service account to use.\n    # If not set and create is true, a name is generated using the fullname template\n    # name: ""\n\n    # Optional additional annotations to add to the Job\'s ServiceAccount\n    annotations:\n      helm.sh/hook: post-install\n      helm.sh/hook-weight: "-5"\n      helm.sh/hook-delete-policy: before-hook-creation,hook-succeeded\n\n    # Automount API credentials for a Service Account.\n    automountServiceAccountToken: true\n\n    # Optional additional labels to add to the startupapicheck\'s ServiceAccount\n    # labels: {}\n',
  lines: {
    '4': 'global',
    '8': 'global.imagePullSecrets',
    '12': 'global.priorityClassName',
    '13': 'global.rbac',
    '14': 'global.rbac.create',
    '16': 'global.rbac.aggregateClusterRoles',
    '18': 'global.podSecurityPolicy',
    '19': 'global.podSecurityPolicy.enabled',
    '20': 'global.podSecurityPolicy.useAppArmor',
    '23': 'global.logLevel',
    '25': 'global.leaderElection',
    '27': 'global.leaderElection.namespace',
    '44': 'installCRDs',
    '46': 'replicaCount',
    '48': 'strategy',
    '56': 'featureGates',
    '58': 'image',
    '59': 'image.repository',
    '70': 'image.pullPolicy',
    '75': 'clusterResourceNamespace',
    '80': 'namespace',
    '82': 'serviceAccount',
    '84': 'serviceAccount.create',
    '93': 'serviceAccount.automountServiceAccountToken',
    '100': 'extraArgs',
    '106': 'extraEnv',
    '110': 'resources',
    '117': 'securityContext',
    '118': 'securityContext.runAsNonRoot',
    '122': 'containerSecurityContext',
    '123': 'containerSecurityContext.allowPrivilegeEscalation',
    '131': 'volumes',
    '133': 'volumeMounts',
    '141': 'podLabels',
    '160': 'nodeSelector',
    '161': 'nodeSelector."kubernetes\\.io/os"',
    '163': 'ingressShim',
    '168': 'prometheus',
    '169': 'prometheus.enabled',
    '170': 'prometheus.servicemonitor',
    '171': 'prometheus.servicemonitor.enabled',
    '172': 'prometheus.servicemonitor.prometheusInstance',
    '173': 'prometheus.servicemonitor.targetPort',
    '174': 'prometheus.servicemonitor.path',
    '175': 'prometheus.servicemonitor.interval',
    '176': 'prometheus.servicemonitor.scrapeTimeout',
    '177': 'prometheus.servicemonitor.labels',
    '178': 'prometheus.servicemonitor.honorLabels',
    '196': 'affinity',
    '205': 'tolerations',
    '207': 'webhook',
    '208': 'webhook.replicaCount',
    '209': 'webhook.timeoutSeconds',
    '215': 'webhook.config',
    '228': 'webhook.strategy',
    '236': 'webhook.securityContext',
    '237': 'webhook.securityContext.runAsNonRoot',
    '241': 'webhook.containerSecurityContext',
    '242': 'webhook.containerSecurityContext.allowPrivilegeEscalation',
    '266': 'webhook.extraArgs',
    '270': 'webhook.resources',
    '278': 'webhook.livenessProbe',
    '279': 'webhook.livenessProbe.failureThreshold',
    '280': 'webhook.livenessProbe.initialDelaySeconds',
    '281': 'webhook.livenessProbe.periodSeconds',
    '282': 'webhook.livenessProbe.successThreshold',
    '283': 'webhook.livenessProbe.timeoutSeconds',
    '284': 'webhook.readinessProbe',
    '285': 'webhook.readinessProbe.failureThreshold',
    '286': 'webhook.readinessProbe.initialDelaySeconds',
    '287': 'webhook.readinessProbe.periodSeconds',
    '288': 'webhook.readinessProbe.successThreshold',
    '289': 'webhook.readinessProbe.timeoutSeconds',
    '291': 'webhook.nodeSelector',
    '292': 'webhook.nodeSelector."kubernetes\\.io/os"',
    '294': 'webhook.affinity',
    '296': 'webhook.tolerations',
    '299': 'webhook.podLabels',
    '302': 'webhook.serviceLabels',
    '304': 'webhook.image',
    '305': 'webhook.image.repository',
    '317': 'webhook.image.pullPolicy',
    '319': 'webhook.serviceAccount',
    '321': 'webhook.serviceAccount.create',
    '330': 'webhook.serviceAccount.automountServiceAccountToken',
    '340': 'webhook.securePort',
    '351': 'webhook.hostNetwork',
    '356': 'webhook.serviceType',
    '361': 'webhook.url',
    '364': 'cainjector',
    '365': 'cainjector.enabled',
    '366': 'cainjector.replicaCount',
    '368': 'cainjector.strategy',
    '376': 'cainjector.securityContext',
    '377': 'cainjector.securityContext.runAsNonRoot',
    '381': 'cainjector.containerSecurityContext',
    '382': 'cainjector.containerSecurityContext.allowPrivilegeEscalation',
    '398': 'cainjector.extraArgs',
    '402': 'cainjector.resources',
    '407': 'cainjector.nodeSelector',
    '408': 'cainjector.nodeSelector."kubernetes\\.io/os"',
    '410': 'cainjector.affinity',
    '412': 'cainjector.tolerations',
    '415': 'cainjector.podLabels',
    '417': 'cainjector.image',
    '418': 'cainjector.image.repository',
    '430': 'cainjector.image.pullPolicy',
    '432': 'cainjector.serviceAccount',
    '434': 'cainjector.serviceAccount.create',
    '443': 'cainjector.serviceAccount.automountServiceAccountToken',
    '455': 'startupapicheck',
    '456': 'startupapicheck.enabled',
    '460': 'startupapicheck.securityContext',
    '461': 'startupapicheck.securityContext.runAsNonRoot',
    '465': 'startupapicheck.containerSecurityContext',
    '466': 'startupapicheck.containerSecurityContext.allowPrivilegeEscalation',
    '474': 'startupapicheck.timeout',
    '477': 'startupapicheck.backoffLimit',
    '480': 'startupapicheck.jobAnnotations',
    '481': 'startupapicheck.jobAnnotations."helm\\.sh/hook"',
    '482': 'startupapicheck.jobAnnotations."helm\\.sh/hook-weight"',
    '483': 'startupapicheck.jobAnnotations."helm\\.sh/hook-delete-policy"',
    '490': 'startupapicheck.extraArgs',
    '492': 'startupapicheck.resources',
    '497': 'startupapicheck.nodeSelector',
    '498': 'startupapicheck.nodeSelector."kubernetes\\.io/os"',
    '500': 'startupapicheck.affinity',
    '502': 'startupapicheck.tolerations',
    '505': 'startupapicheck.podLabels',
    '507': 'startupapicheck.image',
    '508': 'startupapicheck.image.repository',
    '520': 'startupapicheck.image.pullPolicy',
    '522': 'startupapicheck.rbac',
    '524': 'startupapicheck.rbac.annotations',
    '525': 'startupapicheck.rbac.annotations."helm\\.sh/hook"',
    '526': 'startupapicheck.rbac.annotations."helm\\.sh/hook-weight"',
    '527': 'startupapicheck.rbac.annotations."helm\\.sh/hook-delete-policy"',
    '529': 'startupapicheck.serviceAccount',
    '531': 'startupapicheck.serviceAccount.create',
    '538': 'startupapicheck.serviceAccount.annotations',
    '539': 'startupapicheck.serviceAccount.annotations."helm\\.sh/hook"',
    '540': 'startupapicheck.serviceAccount.annotations."helm\\.sh/hook-weight"',
    '541': 'startupapicheck.serviceAccount.annotations."helm\\.sh/hook-delete-policy"',
    '544': 'startupapicheck.serviceAccount.automountServiceAccountToken',
  },
  normalizedName: 'cert-manager',
  searchUrlReferer: { pageNumber: 1, filters: {}, deprecated: false },
  updateUrl: updateUrlMock,
};

describe('ValuesView', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates snapshot', () => {
    const { asFragment } = render(<ValuesView {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('Render', () => {
    it('renders component', () => {
      render(<ValuesView {...defaultProps} />);

      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Copy to clipboard' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument();
    });

    it('renders component with empty values', () => {
      render(<ValuesView {...defaultProps} values=" " />);

      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Copy to clipboard' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Download' })).toBeDisabled();
    });

    it('clicks line', async () => {
      render(<ValuesView {...defaultProps} />);

      const line = screen.getByText('123').parentElement;
      expect(line).toHaveAttribute('data-active-line', 'false');
      await userEvent.click(line!);

      expect(line).toHaveAttribute('data-active-line', 'true');
    });

    it('updates url when visible path is not found', () => {
      jest.useFakeTimers();

      render(<ValuesView {...defaultProps} visibleValuesPath="not-found" />);

      expect(updateUrlMock).toHaveBeenCalledTimes(1);
      expect(updateUrlMock).toHaveBeenCalledWith({});

      jest.useRealTimers();
    });
  });
});
