import React from 'react';
import { FaKey, FaUserFriends } from 'react-icons/fa';
import { GoPackage } from 'react-icons/go';
import { GrConnect } from 'react-icons/gr';
import { MdBusiness, MdNewReleases, MdNotificationsActive, MdSettings } from 'react-icons/md';

import RepositoryIcon from '../layout/common/RepositoryIcon';
import { EventKind, NavSection, PayloadKind, RepositoryKind, TsQuery } from '../types';

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

export const SUBSCRIPTIONS_LIST: SubscriptionItem[] = [
  {
    kind: EventKind.NewPackageRelease,
    icon: <MdNewReleases />,
    name: 'newRelease',
    title: 'New releases',
    description: 'Receive a notification when a new version of this package is released.',
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
