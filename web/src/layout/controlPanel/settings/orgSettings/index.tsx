import React from 'react';
import { MdBusiness } from 'react-icons/md';

import { SectionItem } from '../../../../utils/data';
import SectionPanel from '../../../common/SectionPanel';
import DetailsSection from './details';

interface Props {
  onAuthError: () => void;
}

const ORG_SECTIONS: SectionItem[] = [
  { index: 0, name: 'Details', shortName: 'details', icon: <MdBusiness />, disabled: false },
];

const OrganizationSettingsSection = (props: Props) => (
  <SectionPanel sections={ORG_SECTIONS} content={{ 0: <DetailsSection {...props} /> }} />
);

export default OrganizationSettingsSection;
