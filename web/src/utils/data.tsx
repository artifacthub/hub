import React from 'react';
import { FaKey, FaScroll, FaUserFriends } from 'react-icons/fa';
import { GoPackage } from 'react-icons/go';
import { GrConnect } from 'react-icons/gr';
import { MdBusiness, MdNewReleases, MdNotificationsActive, MdSettings } from 'react-icons/md';
import { TiWarning } from 'react-icons/ti';

import RepositoryIcon from '../layout/common/RepositoryIcon';
import {
  AuthorizationPolicy,
  AuthorizerAction,
  EventKind,
  NavSection,
  PayloadKind,
  RepositoryKind,
  SearchTipItem,
  TsQuery,
} from '../types';

export interface SubscriptionItem {
  kind: EventKind;
  icon: JSX.Element;
  name: string;
  title: string;
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
];

export const REPOSITORY_SUBSCRIPTIONS_LIST: SubscriptionItem[] = [
  {
    kind: EventKind.RepositoryTrackingErrors,
    icon: <TiWarning />,
    name: 'trackingErrors',
    title: 'Tracking errors',
    description: 'Receive a notification when repository tracking errors.',
    enabled: true,
  },
];

export interface RepoKindDef {
  kind: RepositoryKind;
  label: string;
  name: string;
  icon: JSX.Element;
  active: boolean;
}

export const REPOSITORY_KINDS: RepoKindDef[] = [
  {
    kind: RepositoryKind.Helm,
    label: 'helm',
    name: 'Helm charts',
    icon: <RepositoryIcon kind={RepositoryKind.Helm} className="mw-100 mh-100" />,
    active: true,
  },
  {
    kind: RepositoryKind.Falco,
    label: 'falco',
    name: 'Falco rules',
    icon: <RepositoryIcon kind={RepositoryKind.Falco} className="mw-100 mh-100" />,
    active: true,
  },
  {
    kind: RepositoryKind.OPA,
    label: 'opa',
    name: 'OPA policies',
    icon: <RepositoryIcon kind={RepositoryKind.OPA} className="mw-100 mh-100" />,
    active: true,
  },
  {
    kind: RepositoryKind.OLM,
    label: 'olm',
    name: 'OLM operators',
    icon: <RepositoryIcon kind={RepositoryKind.OLM} className="mw-100 mh-100" />,
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
      icon: <GoPackage />,
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
      icon: <GoPackage />,
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

export const TS_QUERY: TsQuery[] = [
  {
    name: 'Database',
    label: 'database',
    value: '(database)',
  },
  {
    name: 'Integration and Delivery',
    label: 'integration-and-delivery',
    value: '(integration | delivery)',
  },
  {
    name: 'Logging and Tracing',
    label: 'logging-and-tracing',
    value: '(logging | tracing)',
  },
  {
    name: 'Machine learning',
    label: 'machine-learning',
    value: '(machine <-> learning)',
  },
  {
    name: 'Monitoring',
    label: 'monitoring',
    value: '(monitoring)',
  },
  {
    name: 'Networking',
    label: 'networking',
    value: '(networking)',
  },
  {
    name: 'Security',
    label: 'security',
    value: '(security | falco)',
  },
  {
    name: 'Storage',
    label: 'storage',
    value: '(storage | (big <-> data))',
  },
  {
    name: 'Streaming and Messaging',
    label: 'streaming-messaging',
    value: '(streaming | messaging)',
  },
  {
    name: 'Web applications',
    label: 'web-applications',
    value: '(web <-> application)',
  },
];

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
        Use <span className="font-weight-bold">multiple words</span> to refine your search.
      </>
    ),
    example: 'kafka operator',
  },
  {
    content: (
      <>
        Use <span className="font-weight-bold">-</span> to exclude words from your search.
      </>
    ),
    example: 'apache -solr -hadoop',
  },
  {
    content: (
      <>
        Put a phrase inside <span className="font-weight-bold">double quotes</span> for an exact match.
      </>
    ),
    example: `"monitoring system"`,
  },
  {
    content: (
      <>
        Use <span className="font-weight-bold">or</span> to combine multiple searches.
      </>
    ),
    example: 'postgresql or mysql',
  },
];
