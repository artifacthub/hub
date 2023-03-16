import isUndefined from 'lodash/isUndefined';

import { Section } from '../../../../types';
import { CONTROL_PANEL_SECTIONS } from '../../../../utils/data';
import SectionPanel from '../../../common/SectionPanel';
import WebhooksSection from '../webhooks';
import AuthorizationSection from './authorization';
import ProfileSection from './profile';

interface Props {
  activePage: string | null;
  activeSection?: string;
  subsection?: string;
  onAuthError: () => void;
}

const OrganizationSettingsSection = (props: Props) => {
  const section = CONTROL_PANEL_SECTIONS['org'].find((sect: Section) => sect.name === 'settings');
  if (isUndefined(section) || isUndefined(section.subsections)) return null;

  return (
    <SectionPanel
      defaultSection={props.subsection || 'profile'}
      pathPrefix={`/control-panel${!isUndefined(props.activeSection) ? `/${props.activeSection}` : ''}`}
      activeSection={props.subsection}
      sections={section.subsections}
      content={{
        profile: <ProfileSection {...props} />,
        webhooks: <WebhooksSection {...props} />,
        authorization: <AuthorizationSection {...props} />,
      }}
    />
  );
};

export default OrganizationSettingsSection;
