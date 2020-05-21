import React from 'react';

import { CONTROL_PANEL_PACKAGES_SUBSECTIONS } from '../../../utils/data';
import SectionPanel from '../../common/SectionPanel';
import ChartRepository from './chartRepository';

interface Props {
  subsection?: string;
  onAuthError: () => void;
  onSubMenuItemClick: (name: string) => void;
}

const PackagesSection = (props: Props) => (
  <SectionPanel
    defaultSection={props.subsection || 'chart'}
    onSectionChange={props.onSubMenuItemClick}
    sections={CONTROL_PANEL_PACKAGES_SUBSECTIONS}
    content={{
      chart: <ChartRepository {...props} />,
    }}
  />
);

export default PackagesSection;
