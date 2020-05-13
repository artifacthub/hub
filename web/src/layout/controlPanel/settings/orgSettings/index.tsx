import React from 'react';
import { MdBusiness } from 'react-icons/md';

import { SectionItem } from '../../../../utils/data';
import SectionPanel from '../../../common/SectionPanel';
import ProfileSection from './profile';

interface Props {
  onAuthError: () => void;
}

const ORG_SECTIONS: SectionItem[] = [
  { index: 0, name: 'Profile', shortName: 'profile', icon: <MdBusiness />, disabled: false },
];

const OrganizationSettingsSection = (props: Props) => (
  <SectionPanel sections={ORG_SECTIONS} content={{ 0: <ProfileSection {...props} /> }} />
);

export default OrganizationSettingsSection;
