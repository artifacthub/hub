import React from 'react';
import { FaUserCircle } from 'react-icons/fa';
import { MdNotificationsActive } from 'react-icons/md';

import { SectionItem } from '../../../../utils/data';
import SectionPanel from '../../../common/SectionPanel';
import ProfileSection from './profile';
import SubscriptionsSection from './subscriptions';

interface Props {
  onAuthError: () => void;
}

const USER_SECTIONS: SectionItem[] = [
  { index: 0, name: 'Profile', shortName: 'profile', icon: <FaUserCircle />, disabled: false },
  { index: 1, name: 'Subscriptions', shortName: 'subscriptions', icon: <MdNotificationsActive />, disabled: false },
];

const UserSettingsSection = (props: Props) => (
  <SectionPanel
    sections={USER_SECTIONS}
    content={{
      0: <ProfileSection {...props} />,
      1: <SubscriptionsSection {...props} />,
    }}
  />
);

export default UserSettingsSection;
