import React from 'react';

import { PackageKind } from '../../../types';
import { SectionItem } from '../../../utils/data';
import PackageIcon from '../../common/PackageIcon';
import SectionPanel from '../../common/SectionPanel';
import ChartRepository from './chartRepository';

interface Props {
  onAuthError: () => void;
}

export const PACKAGES: SectionItem[] = [
  {
    index: PackageKind.Chart,
    name: 'Chart repositories',
    shortName: 'Chart',
    icon: <PackageIcon kind={PackageKind.Chart} className="mw-100" />,
    disabled: false,
  },
  {
    index: PackageKind.Falco,
    name: 'Falco rules',
    shortName: 'Falco',
    icon: <PackageIcon kind={PackageKind.Falco} className="mw-100" />,
    disabled: true,
  },
  {
    index: PackageKind.Opa,
    name: 'OPA policies',
    shortName: 'OPA',
    icon: <PackageIcon kind={PackageKind.Opa} className="mw-100" />,
    disabled: true,
  },
];

const PackagesSection = (props: Props) => (
  <SectionPanel
    sections={PACKAGES}
    content={{
      0: <ChartRepository {...props} />,
    }}
  />
);

export default PackagesSection;
