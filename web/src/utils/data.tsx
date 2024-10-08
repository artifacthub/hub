import { FaKey, FaScroll, FaUserFriends } from 'react-icons/fa';
import { FiPackage } from 'react-icons/fi';
import { GrConnect } from 'react-icons/gr';
import { MdBusiness, MdNewReleases, MdNotificationsActive, MdSecurity, MdSettings } from 'react-icons/md';
import { TiWarning } from 'react-icons/ti';

import RepositoryIcon from '../layout/common/RepositoryIcon';
import {
  AuthorizationPolicy,
  AuthorizerAction,
  CVSSVectorMetric,
  EventKind,
  NavSection,
  PayloadKind,
  RepositoryKind,
  SearchTipItem,
  SeverityRatingList,
  VulnerabilitySeverity,
} from '../types';

export interface SubscriptionItem {
  kind: EventKind;
  icon: JSX.Element;
  name: string;
  title: string;
  shortTitle?: string;
  description: string;
  enabled: boolean;
}

export interface PayloadKindsItem {
  kind: PayloadKind;
  name: string;
  title: string;
}

export const PACKAGE_SUBSCRIPTIONS_LIST: SubscriptionItem[] = [
  {
    kind: EventKind.NewPackageRelease,
    icon: <MdNewReleases />,
    name: 'newRelease',
    title: 'New releases',
    description: 'Receive a notification when a new version of this package is released.',
    enabled: true,
  },
  {
    kind: EventKind.SecurityAlert,
    icon: <MdSecurity />,
    name: 'securityAlert',
    title: 'Security alerts',
    description:
      'Receive a notification when important security vulnerabilities are found in the latest version of this package.',
    enabled: true,
  },
];

export const REPOSITORY_SUBSCRIPTIONS_LIST: SubscriptionItem[] = [
  {
    kind: EventKind.RepositoryTrackingErrors,
    icon: <TiWarning />,
    name: 'trackingErrors',
    title: 'Tracking errors',
    shortTitle: 'Track',
    description: 'Receive a notification when repository tracking errors.',
    enabled: true,
  },
  {
    kind: EventKind.RepositoryScanningErrors,
    icon: <TiWarning />,
    name: 'scanningErrors',
    title: 'Scanning errors',
    shortTitle: 'Scan',
    description: 'Receive a notification when repository scanning for security vulnerabilities errors.',
    enabled: true,
  },
];

export interface RepoKindDef {
  kind: RepositoryKind;
  label: string;
  name: string;
  singular: string;
  plural: string;
  icon: JSX.Element;
  active: boolean;
}

// Sorted alphabetically
export const REPOSITORY_KINDS: RepoKindDef[] = [
  {
    kind: RepositoryKind.ArgoTemplate,
    label: 'argo-template',
    name: 'Argo templates',
    singular: 'Argo templates',
    plural: 'Argo templates',
    icon: <RepositoryIcon kind={RepositoryKind.ArgoTemplate} className="mw-100 mh-100" />,
    active: true,
  },
  {
    kind: RepositoryKind.Backstage,
    label: 'backstage',
    name: 'Backstage plugins',
    singular: 'Backstage plugin',
    plural: 'Backstage plugins',
    icon: <RepositoryIcon kind={RepositoryKind.Backstage} className="mw-100 mh-100" />,
    active: true,
  },
  {
    kind: RepositoryKind.Container,
    label: 'container',
    name: 'Container images',
    singular: 'Container image',
    plural: 'Container images',
    icon: <RepositoryIcon kind={RepositoryKind.Container} className="mw-100 mh-100" />,
    active: true,
  },
  {
    kind: RepositoryKind.CoreDNS,
    label: 'coredns',
    name: 'CoreDNS plugins',
    singular: 'CoreDNS plugin',
    plural: 'CoreDNS plugins',
    icon: <RepositoryIcon kind={RepositoryKind.CoreDNS} className="mw-100 mh-100" />,
    active: true,
  },
  {
    kind: RepositoryKind.Falco,
    label: 'falco',
    name: 'Falco rules',
    singular: 'Falco rules',
    plural: 'Falco rules',
    icon: <RepositoryIcon kind={RepositoryKind.Falco} className="mw-100 mh-100" />,
    active: true,
  },
  {
    kind: RepositoryKind.Gatekeeper,
    label: 'gatekeeper',
    name: 'Gatekeeper policies',
    singular: 'Gatekeeper policy',
    plural: 'Gatekeeper policies',
    icon: <RepositoryIcon kind={RepositoryKind.Gatekeeper} className="mw-100 mh-100" />,
    active: true,
  },
  {
    kind: RepositoryKind.Headlamp,
    label: 'headlamp',
    name: 'Headlamp plugins',
    singular: 'Headlamp plugin',
    plural: 'Headlamp plugins',
    icon: <RepositoryIcon kind={RepositoryKind.Headlamp} className="mw-100 mh-100" />,
    active: true,
  },
  {
    kind: RepositoryKind.Helm,
    label: 'helm',
    name: 'Helm charts',
    singular: 'Helm chart',
    plural: 'Helm charts',
    icon: <RepositoryIcon kind={RepositoryKind.Helm} className="mw-100 mh-100" />,
    active: true,
  },
  {
    kind: RepositoryKind.HelmPlugin,
    label: 'helm-plugin',
    name: 'Helm plugins',
    singular: 'Helm plugin',
    plural: 'Helm plugins',
    icon: <RepositoryIcon kind={RepositoryKind.Helm} className="mw-100 mh-100" />,
    active: true,
  },
  {
    kind: RepositoryKind.InspektorGadget,
    label: 'inspektor-gadget',
    name: 'Inspektor gadgets',
    singular: 'Inspektor gadget',
    plural: 'Inspektor gadgets',
    icon: <RepositoryIcon kind={RepositoryKind.InspektorGadget} className="mw-100 mh-100" />,
    active: true,
  },
  {
    kind: RepositoryKind.KCL,
    label: 'kcl',
    name: 'KCL modules',
    singular: 'KCL module',
    plural: 'KCL modules',
    icon: <RepositoryIcon kind={RepositoryKind.KCL} className="mw-100 mh-100" />,
    active: true,
  },
  {
    kind: RepositoryKind.KedaScaler,
    label: 'keda-scaler',
    name: 'KEDA scalers',
    singular: 'KEDA scaler',
    plural: 'KEDA scalers',
    icon: <RepositoryIcon kind={RepositoryKind.KedaScaler} className="mw-100 mh-100" />,
    active: true,
  },
  {
    kind: RepositoryKind.Keptn,
    label: 'keptn',
    name: 'Keptn integrations',
    singular: 'Keptn integration',
    plural: 'Keptn integrations',
    icon: <RepositoryIcon kind={RepositoryKind.Keptn} className="mw-100 mh-100" />,
    active: true,
  },
  {
    kind: RepositoryKind.KnativeClientPlugin,
    label: 'knative-client-plugin',
    name: 'Knative client plugins',
    singular: 'Knative client plugin',
    plural: 'Knative client plugins',
    icon: <RepositoryIcon kind={RepositoryKind.KnativeClientPlugin} className="mw-100 mh-100" />,
    active: true,
  },
  {
    kind: RepositoryKind.Krew,
    label: 'krew',
    name: 'Krew kubectl plugins',
    singular: 'Kubectl plugin',
    plural: 'Kubectl plugins',
    icon: <RepositoryIcon kind={RepositoryKind.Krew} className="mw-100 mh-100" />,
    active: true,
  },
  {
    kind: RepositoryKind.KubeArmor,
    label: 'kubearmor',
    name: 'KubeArmor policies',
    singular: 'KubeArmor policies',
    plural: 'KubeArmor policies',
    icon: <RepositoryIcon kind={RepositoryKind.KubeArmor} className="mw-100 mh-100" />,
    active: true,
  },
  {
    kind: RepositoryKind.Kubewarden,
    label: 'kubewarden',
    name: 'Kubewarden policies',
    singular: 'Kubewarden policy',
    plural: 'Kubewarden policies',
    icon: <RepositoryIcon kind={RepositoryKind.Kubewarden} className="mw-100 mh-100" />,
    active: true,
  },
  {
    kind: RepositoryKind.Kyverno,
    label: 'kyverno',
    name: 'Kyverno policies',
    singular: 'Kyverno policy',
    plural: 'Kyverno policies',
    icon: <RepositoryIcon kind={RepositoryKind.Kyverno} className="mw-100 mh-100" />,
    active: true,
  },
  {
    kind: RepositoryKind.MesheryDesign,
    label: 'meshery',
    name: 'Meshery designs',
    singular: 'Meshery design',
    plural: 'Meshery designs',
    icon: <RepositoryIcon kind={RepositoryKind.MesheryDesign} className="mw-100 mh-100" />,
    active: true,
  },
  {
    kind: RepositoryKind.OLM,
    label: 'olm',
    name: 'OLM operators',
    singular: 'OLM operator',
    plural: 'OLM operators',
    icon: <RepositoryIcon kind={RepositoryKind.OLM} className="mw-100 mh-100" />,
    active: true,
  },
  {
    kind: RepositoryKind.OPA,
    label: 'opa',
    name: 'OPA policies',
    singular: 'OPA policies',
    plural: 'OPA policies',
    icon: <RepositoryIcon kind={RepositoryKind.OPA} className="mw-100 mh-100" />,
    active: true,
  },
  {
    kind: RepositoryKind.OpenCost,
    label: 'opencost',
    name: 'OpenCost plugins',
    singular: 'OpenCost plugin',
    plural: 'OpenCost plugins',
    icon: <RepositoryIcon kind={RepositoryKind.OpenCost} className="mw-100 mh-100" />,
    active: true,
  },
  {
    kind: RepositoryKind.RadiusRecipe,
    label: 'radius',
    name: 'Radius recipes',
    singular: 'Radius recipe',
    plural: 'Radius recipes',
    icon: <RepositoryIcon kind={RepositoryKind.RadiusRecipe} className="mw-100 mh-100" />,
    active: true,
  },
  {
    kind: RepositoryKind.TektonPipeline,
    label: 'tekton-pipeline',
    name: 'Tekton pipelines',
    singular: 'Tekton pipeline',
    plural: 'Tekton pipelines',
    icon: <RepositoryIcon kind={RepositoryKind.TektonPipeline} className="mw-100 mh-100" />,
    active: true,
  },
  {
    kind: RepositoryKind.TektonStepAction,
    label: 'tekton-stepaction',
    name: 'Tekton stepactions',
    singular: 'Tekton stepaction',
    plural: 'Tekton stepactions',
    icon: <RepositoryIcon kind={RepositoryKind.TektonStepAction} className="mw-100 mh-100" />,
    active: true,
  },
  {
    kind: RepositoryKind.TektonTask,
    label: 'tekton-task',
    name: 'Tekton tasks',
    singular: 'Tekton task',
    plural: 'Tekton tasks',
    icon: <RepositoryIcon kind={RepositoryKind.TektonTask} className="mw-100 mh-100" />,
    active: true,
  },
  {
    kind: RepositoryKind.TBAction,
    label: 'tbaction',
    name: 'Tinkerbell actions',
    singular: 'Tinkerbell action',
    plural: 'Tinkerbell actions',
    icon: <RepositoryIcon kind={RepositoryKind.TBAction} className="mw-100 mh-100" />,
    active: true,
  },
];

export const PAYLOAD_KINDS_LIST: PayloadKindsItem[] = [
  {
    kind: PayloadKind.default,
    name: 'defaultPayload',
    title: 'Default payload',
  },
  {
    kind: PayloadKind.custom,
    name: 'customPayload',
    title: 'Custom payload',
  },
];

export const CONTROL_PANEL_SECTIONS: NavSection = {
  user: [
    {
      name: 'repositories',
      displayName: 'Repositories',
      disabled: false,
      icon: <FiPackage />,
    },
    {
      name: 'organizations',
      displayName: 'Organizations',
      disabled: false,
      icon: <MdBusiness />,
    },
    {
      name: 'settings',
      displayName: 'Settings',
      disabled: false,
      icon: <MdSettings />,
      subsections: [
        { displayName: 'Profile', name: 'profile', icon: <MdBusiness />, disabled: false },
        { displayName: 'Subscriptions', name: 'subscriptions', icon: <MdNotificationsActive />, disabled: false },
        { displayName: 'Webhooks', name: 'webhooks', icon: <GrConnect />, disabled: false },
        { displayName: 'API keys', name: 'api-keys', icon: <FaKey />, disabled: false },
      ],
    },
  ],
  org: [
    {
      name: 'repositories',
      displayName: 'Repositories',
      disabled: false,
      icon: <FiPackage />,
    },
    {
      name: 'members',
      displayName: 'Members',
      disabled: false,
      icon: <FaUserFriends />,
    },
    {
      name: 'settings',
      displayName: 'Settings',
      disabled: false,
      icon: <MdSettings />,
      subsections: [
        { displayName: 'Profile', name: 'profile', icon: <MdBusiness />, disabled: false },
        { displayName: 'Webhooks', name: 'webhooks', icon: <GrConnect />, disabled: false },
        {
          displayName: 'Authorization',
          name: 'authorization',
          icon: <FaScroll />,
          disabled: false,
          onlyDesktop: true,
        },
      ],
    },
  ],
};

export const PREDEFINED_POLICIES: AuthorizationPolicy[] = [
  {
    name: 'rbac.v1',
    label: 'rbac.v1',
    policy: `package artifacthub.authz

# Get user allowed actions
allowed_actions[action] {
  # Owner can perform all actions
  user_roles[_] == "owner"
  action := "all"
}
allowed_actions[action] {
  # Users can perform actions allowed for their roles
  action := data.roles[role].allowed_actions[_]
  user_roles[_] == role
}

# Get user roles
user_roles[role] {
  data.roles[role].users[_] == input.user
}`,
    data: {
      roles: {
        owner: {
          users: ['user1'],
        },
        customRole1: {
          users: [],
          allowed_actions: [
            AuthorizerAction.AddOrganizationMember,
            AuthorizerAction.AddOrganizationRepository,
            AuthorizerAction.DeleteOrganization,
            AuthorizerAction.DeleteOrganizationMember,
            AuthorizerAction.DeleteOrganizationRepository,
            AuthorizerAction.GetAuthorizationPolicy,
            AuthorizerAction.TransferOrganizationRepository,
            AuthorizerAction.UpdateAuthorizationPolicy,
            AuthorizerAction.UpdateOrganization,
            AuthorizerAction.UpdateOrganizationRepository,
          ],
        },
      },
    },
  },
];

export const OPERATOR_CAPABILITIES = [
  'basic install',
  'seamless upgrades',
  'full lifecycle',
  'deep insights',
  'auto pilot',
];

export const SEARH_TIPS: SearchTipItem[] = [
  {
    content: (
      <>
        Use <span className="fw-semibold">multiple words</span> to refine your search.
      </>
    ),
    example: 'kafka operator',
  },
  {
    content: (
      <>
        Use <span className="fw-semibold">-</span> to exclude words from your search.
      </>
    ),
    example: 'apache -solr -hadoop',
  },
  {
    content: (
      <>
        Put a phrase inside <span className="fw-semibold">double quotes</span> for an exact match.
      </>
    ),
    example: `"monitoring system"`,
  },
  {
    content: (
      <>
        Use <span className="fw-semibold">or</span> to combine multiple searches.
      </>
    ),
    example: 'postgresql or mysql',
  },
];

export const SEVERITY_ORDER = [
  VulnerabilitySeverity.Critical,
  VulnerabilitySeverity.High,
  VulnerabilitySeverity.Medium,
  VulnerabilitySeverity.Low,
  VulnerabilitySeverity.UnKnown,
];

export const SEVERITY_RATING: SeverityRatingList = {
  [VulnerabilitySeverity.Critical]: {
    color: '#960003',
    level: 'F',
  },
  [VulnerabilitySeverity.High]: {
    color: '#DF2A19',
    level: 'D',
  },
  [VulnerabilitySeverity.Medium]: {
    color: '#F7860F',
    level: 'C',
  },
  [VulnerabilitySeverity.Low]: {
    color: '#F4BD0C',
    level: 'B',
  },
  [VulnerabilitySeverity.UnKnown]: {
    color: '#b2b2b2',
    level: '-',
  },
  default: {
    color: '#47A319',
    level: 'A',
  },
};

export const CVSS_V2_VECTORS: { [key: string]: CVSSVectorMetric[] } = {
  'Exploitability Metrics': [
    {
      value: 'AV',
      label: 'Access Vector',
      options: [
        {
          value: 'L',
          label: 'Local',
          level: 1,
        },
        {
          value: 'A',
          label: 'Adjacent Network',
          level: 2,
        },
        {
          value: 'N',
          label: 'Network',
          level: 3,
        },
      ],
    },
    {
      value: 'AC',
      label: 'Access Complexity',
      options: [
        {
          value: 'H',
          label: 'High',
          level: 1,
        },
        {
          value: 'M',
          label: 'Medium',
          level: 2,
        },
        {
          value: 'L',
          label: 'Low',
          level: 3,
        },
      ],
    },
    {
      value: 'Au',
      label: 'Authentication',
      options: [
        {
          value: 'M',
          label: 'Multiple',
          level: 1,
        },
        {
          value: 'S',
          label: 'Single',
          level: 2,
        },
        {
          value: 'N',
          label: 'None',
          level: 3,
        },
      ],
    },
  ],
  'Impact Metrics': [
    {
      value: 'C',
      label: 'Confidentiality',
      options: [
        {
          value: 'N',
          label: 'None',
          level: 0,
        },
        {
          value: 'P',
          label: 'Partial',
          level: 2,
        },
        {
          value: 'C',
          label: 'Complete',
          level: 3,
        },
      ],
    },
    {
      value: 'I',
      label: 'Integrity',
      options: [
        {
          value: 'N',
          label: 'None',
          level: 0,
        },
        {
          value: 'P',
          label: 'Partial',
          level: 2,
        },
        {
          value: 'C',
          label: 'Complete',
          level: 3,
        },
      ],
    },
    {
      value: 'A',
      label: 'Availability',
      options: [
        {
          value: 'N',
          label: 'None',
          level: 0,
        },
        {
          value: 'P',
          label: 'Partial',
          level: 2,
        },
        {
          value: 'C',
          label: 'Complete',
          level: 3,
        },
      ],
    },
  ],
};

export const CVSS_V3_VECTORS: { [key: string]: CVSSVectorMetric[] } = {
  'Exploitability Metrics': [
    {
      value: 'AV',
      label: 'Attack Vector',
      options: [
        {
          value: 'P',
          label: 'Physical',
          level: 1,
        },
        {
          value: 'L',
          label: 'Local',
          level: 2,
        },
        {
          value: 'A',
          label: 'Adjacent Network',
          level: 3,
        },
        {
          value: 'N',
          label: 'Network',
          level: 4,
        },
      ],
    },
    {
      value: 'AC',
      label: 'Attack Complexity',
      options: [
        {
          value: 'H',
          label: 'High',
          level: 1,
        },
        {
          value: 'L',
          label: 'Low',
          level: 3,
        },
      ],
    },
    {
      value: 'PR',
      label: 'Privileges Required',
      options: [
        {
          value: 'H',
          label: 'High',
          level: 1,
        },
        {
          value: 'L',
          label: 'Low',
          level: 2,
        },
        {
          value: 'N',
          label: 'None',
          level: 3,
        },
      ],
    },
    {
      value: 'UI',
      label: 'User Interaction',
      options: [
        {
          value: 'R',
          label: 'Required',
          level: 1,
        },
        {
          value: 'N',
          label: 'None',
          level: 3,
        },
      ],
    },
    {
      value: 'S',
      label: 'Scope',
      options: [
        {
          value: 'U',
          label: 'Unchanged',
          level: 1,
        },
        {
          value: 'C',
          label: 'Changed',
          level: 3,
        },
      ],
    },
  ],
  'Impact Metrics': [
    {
      value: 'C',
      label: 'Confidentiality',
      options: [
        {
          value: 'N',
          label: 'None',
          level: 0,
        },
        {
          value: 'L',
          label: 'Low',
          level: 2,
        },
        {
          value: 'H',
          label: 'High',
          level: 3,
        },
      ],
    },
    {
      value: 'I',
      label: 'Integrity',
      options: [
        {
          value: 'N',
          label: 'None',
          level: 0,
        },
        {
          value: 'L',
          label: 'Low',
          level: 2,
        },
        {
          value: 'H',
          label: 'High',
          level: 3,
        },
      ],
    },
    {
      value: 'A',
      label: 'Availability',
      options: [
        {
          value: 'N',
          label: 'None',
          level: 0,
        },
        {
          value: 'L',
          label: 'Low',
          level: 2,
        },
        {
          value: 'H',
          label: 'High',
          level: 3,
        },
      ],
    },
  ],
};

export const OCI_PREFIX = 'oci://';

export const PKG_DETAIL_PATH =
  /^\/packages\/(helm|falco|opa|olm|tbaction|krew|helm-plugin|tekton-task|keda-scaler|coredns|keptn|tekton-pipeline|kubewarden|gatekeeper|kyverno|knative-client-plugin|backstage|argo-template|kubearmor|kcl|headlamp|inspektor-gadget|tekton-stepaction|meshery|opencost|radius|container)\//;

export const HOME_ROUTES = [
  '/verify-email',
  '/login',
  '/accept-invitation',
  '/oauth-failed',
  '/reset-password',
  '/delete-user',
];
