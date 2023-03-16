import isUndefined from 'lodash/isUndefined';

import { Section } from '../../../../types';
import { CONTROL_PANEL_SECTIONS } from '../../../../utils/data';
import SectionPanel from '../../../common/SectionPanel';
import WebhooksSection from '../webhooks';
import APIKeysSection from './apiKeys';
import ProfileSection from './profile';
import SubscriptionsSection from './subscriptions';

interface Props {
  activePage: string | null;
  activeSection?: string;
  subsection?: string;
  onAuthError: () => void;
}

const UserSettingsSection = (props: Props) => {
  const section = CONTROL_PANEL_SECTIONS['user'].find((sect: Section) => sect.name === 'settings');
  if (isUndefined(section) || isUndefined(section.subsections)) return null;

  return (
    <SectionPanel
      defaultSection={props.subsection || 'profile'}
      pathPrefix={`/control-panel${!isUndefined(props.activeSection) ? `/${props.activeSection}` : ''}`}
      activeSection={props.subsection}
      sections={section.subsections}
      content={{
        profile: <ProfileSection {...props} />,
        subscriptions: <SubscriptionsSection {...props} />,
        webhooks: <WebhooksSection {...props} />,
        'api-keys': <APIKeysSection {...props} />,
      }}
    />
  );
};

export default UserSettingsSection;
