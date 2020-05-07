import React from 'react';
import { MdNewReleases } from 'react-icons/md';

import { NotificationKind, PackageKind } from '../types';

export interface SubscriptionItem {
  kind: NotificationKind;
  icon: JSX.Element;
  name: string;
  title: string;
  description: string;
  enabled: boolean;
}

export const SUBSCRIPTIONS_LIST: SubscriptionItem[] = [
  {
    kind: NotificationKind.NewPackageRelease,
    icon: <MdNewReleases />,
    name: 'newRelease',
    title: 'New releases',
    description: 'Receive a notification when a new version of this package is released.',
    enabled: true,
  },
];

export interface PackageItem {
  kind: PackageKind;
  name: string;
  shortName: string;
  disabled: boolean;
}

export const PACKAGES: PackageItem[] = [
  {
    kind: PackageKind.Chart,
    name: 'Chart repositories',
    shortName: 'Chart',
    disabled: false,
  },
  {
    kind: PackageKind.Falco,
    name: 'Falco rules',
    shortName: 'Falco',
    disabled: true,
  },
  {
    kind: PackageKind.Opa,
    name: 'OPA policies',
    shortName: 'OPA',
    disabled: true,
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
