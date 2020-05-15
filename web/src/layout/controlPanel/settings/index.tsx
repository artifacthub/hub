import React from 'react';

import OrganizationSettingsSection from './orgSettings';
import UserSettingsSection from './userSettings';

interface Props {
  context: 'user' | 'org';
  subsection?: string;
  onSubMenuItemClick: (name: string) => void;
  onAuthError: () => void;
}

const SettingsSection = (props: Props) => (
  <>
    {(() => {
      switch (props.context) {
        case 'user':
          return <UserSettingsSection {...props} />;
        case 'org':
          return <OrganizationSettingsSection {...props} />;
        default:
          return null;
      }
    })()}
  </>
);

export default SettingsSection;
