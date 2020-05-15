import React from 'react';
import { FaUserCircle } from 'react-icons/fa';
import { MdNotificationsActive } from 'react-icons/md';

import { SectionItem } from '../../../../utils/data';
import SectionPanel from '../../../common/SectionPanel';
import ProfileSection from './profile';
import SubscriptionsSection from './subscriptions';

interface Props {
  subsection?: string;
  onAuthError: () => void;
  onSubMenuItemClick: (name: string) => void;
}

const USER_SECTIONS: SectionItem[] = [
  { index: 0, name: 'Profile', label: 'profile', icon: <FaUserCircle />, disabled: false },
  { index: 1, name: 'Subscriptions', label: 'subscriptions', icon: <MdNotificationsActive />, disabled: false },
];

const UserSettingsSection = (props: Props) => (
  <SectionPanel
    onSectionChange={props.onSubMenuItemClick}
    defaultSection={props.subsection || 'profile'}
    sections={USER_SECTIONS}
    content={{
      profile: <ProfileSection {...props} />,
      subscriptions: <SubscriptionsSection {...props} />,
    }}
  />
);

export default UserSettingsSection;
