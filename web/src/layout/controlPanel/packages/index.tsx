import React from 'react';

import { PackageKind } from '../../../types';
import { SectionItem } from '../../../utils/data';
import PackageIcon from '../../common/PackageIcon';
import SectionPanel from '../../common/SectionPanel';
import ChartRepository from './chartRepository';

interface Props {
  subsection?: string;
  onAuthError: () => void;
  onSubMenuItemClick: (name: string) => void;
}

export const PACKAGES: SectionItem[] = [
  {
    index: PackageKind.Chart,
    label: 'chart',
    name: 'Chart repositories',
    shortName: 'Chart',
    icon: <PackageIcon kind={PackageKind.Chart} className="mw-100" />,
    disabled: false,
  },
  {
    index: PackageKind.Falco,
    label: 'falco',
    name: 'Falco rules',
    shortName: 'Falco',
    icon: <PackageIcon kind={PackageKind.Falco} className="mw-100" />,
    disabled: true,
  },
  {
    index: PackageKind.Opa,
    label: 'opa',
    name: 'OPA policies',
    shortName: 'OPA',
    icon: <PackageIcon kind={PackageKind.Opa} className="mw-100" />,
    disabled: true,
  },
];

const PackagesSection = (props: Props) => (
  <SectionPanel
    defaultSection={props.subsection || 'chart'}
    onSectionChange={props.onSubMenuItemClick}
    sections={PACKAGES}
    content={{
      chart: <ChartRepository {...props} />,
    }}
  />
);

export default PackagesSection;
