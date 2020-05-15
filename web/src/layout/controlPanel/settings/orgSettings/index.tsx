import React from 'react';
import { MdBusiness } from 'react-icons/md';

import { SectionItem } from '../../../../utils/data';
import SectionPanel from '../../../common/SectionPanel';
import ProfileSection from './profile';

interface Props {
  subsection?: string;
  onAuthError: () => void;
  onSubMenuItemClick: (name: string) => void;
}

const ORG_SECTIONS: SectionItem[] = [
  { index: 0, name: 'Profile', label: 'profile', icon: <MdBusiness />, disabled: false },
];

const OrganizationSettingsSection = (props: Props) => (
  <SectionPanel
    defaultSection={props.subsection || 'profile'}
    onSectionChange={props.onSubMenuItemClick}
    sections={ORG_SECTIONS}
    content={{ profile: <ProfileSection {...props} /> }}
  />
);

export default OrganizationSettingsSection;
