import React from 'react';
import { FaKey, FaUserFriends } from 'react-icons/fa';
import { GoPackage } from 'react-icons/go';
import { GrConnect } from 'react-icons/gr';
import { MdBusiness, MdNewReleases, MdNotificationsActive, MdSettings } from 'react-icons/md';

import PackageIcon from '../layout/common/PackageIcon';
import { EventKind, NavSection, PackageKind, PayloadKind, Section } from '../types';

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

export interface PackageKindDef {
  kind: PackageKind;
  name: string;
}

export const PACKAGE_KINDS: PackageKindDef[] = [
  {
    kind: PackageKind.Chart,
    name: 'Helm charts',
  },
  {
    kind: PackageKind.Falco,
    name: 'Falco rules',
  },
  {
    kind: PackageKind.Opa,
    name: 'OPA policies',
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

export const CONTROL_PANEL_PACKAGES_SUBSECTIONS: Section[] = [
  {
    name: 'chart',
    displayName: 'Chart repositories',
    shortName: 'Chart',
    icon: <PackageIcon kind={PackageKind.Chart} className="mw-100" />,
    disabled: false,
  },
  {
    name: 'falco',
    displayName: 'Falco rules',
    shortName: 'Falco',
    icon: <PackageIcon kind={PackageKind.Falco} className="mw-100" />,
    disabled: true,
  },
  {
    name: 'opa',
    displayName: 'OPA policies',
    shortName: 'OPA',
    icon: <PackageIcon kind={PackageKind.Opa} className="mw-100" />,
    disabled: true,
  },
];

export const CONTROL_PANEL_SECTIONS: NavSection = {
  user: [
    {
      name: 'packages',
      displayName: 'Packages',
      disabled: false,
      icon: <GoPackage />,
      subsections: CONTROL_PANEL_PACKAGES_SUBSECTIONS,
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
        { displayName: 'API keys', name: 'apiKeys', icon: <FaKey />, disabled: false },
      ],
    },
  ],
  org: [
    {
      name: 'packages',
      displayName: 'Packages',
      disabled: false,
      icon: <GoPackage />,
      subsections: CONTROL_PANEL_PACKAGES_SUBSECTIONS,
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
