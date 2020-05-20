import isUndefined from 'lodash/isUndefined';
import React from 'react';

import { Section } from '../../../../types';
import { CONTROL_PANEL_SECTIONS } from '../../../../utils/data';
import SectionPanel from '../../../common/SectionPanel';
import WebhooksSection from '../webhooks';
import ProfileSection from './profile';
import SubscriptionsSection from './subscriptions';

interface Props {
  subsection?: string;
  onAuthError: () => void;
  onSubMenuItemClick: (name: string) => void;
}

const UserSettingsSection = (props: Props) => {
  const section = CONTROL_PANEL_SECTIONS['user'].find((sect: Section) => sect.name === 'settings');
  if (isUndefined(section) || isUndefined(section.subsections)) return null;

  return (
    <SectionPanel
      onSectionChange={props.onSubMenuItemClick}
      defaultSection={props.subsection || 'profile'}
      sections={section.subsections}
      content={{
        profile: <ProfileSection {...props} />,
        subscriptions: <SubscriptionsSection {...props} />,
        webhooks: <WebhooksSection {...props} />,
      }}
    />
  );
};

export default UserSettingsSection;
