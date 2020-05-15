import React from 'react';
import { MdNewReleases } from 'react-icons/md';

import { EventKind, PackageKind } from '../types';

export interface SubscriptionItem {
  kind: EventKind;
  icon: JSX.Element;
  name: string;
  title: string;
  description: string;
  enabled: boolean;
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

export interface SectionItem {
  index: number;
  label: string;
  name: string;
  shortName?: string;
  disabled: boolean;
  icon?: JSX.Element;
}

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
