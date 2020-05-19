import React from 'react';
import { GrConnect } from 'react-icons/gr';
import { MdBusiness } from 'react-icons/md';

import { SectionItem } from '../../../../utils/data';
import SectionPanel from '../../../common/SectionPanel';
import WebhooksSection from '../webhooks';
import ProfileSection from './profile';

interface Props {
  subsection?: string;
  onAuthError: () => void;
  onSubMenuItemClick: (name: string) => void;
}

const ORG_SECTIONS: SectionItem[] = [
  { index: 0, name: 'Profile', label: 'profile', icon: <MdBusiness />, disabled: false },
  { index: 1, name: 'Webhooks', label: 'webhooks', icon: <GrConnect />, disabled: false },
];

const OrganizationSettingsSection = (props: Props) => (
  <SectionPanel
    defaultSection={props.subsection || 'profile'}
    onSectionChange={props.onSubMenuItemClick}
    sections={ORG_SECTIONS}
    content={{ profile: <ProfileSection {...props} />, webhooks: <WebhooksSection {...props} /> }}
  />
);

export default OrganizationSettingsSection;
