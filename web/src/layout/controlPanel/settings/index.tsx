import React from 'react';

import OrganizationSettings from './OrgSettings';
import UserSettings from './UserSettings';

interface Props {
  context: 'user' | 'org';
  onAuthError: () => void;
}

const SettingsSection = (props: Props) => (
  <>
    {(() => {
      switch (props.context) {
        case 'user':
          return <UserSettings />;
        case 'org':
          return <OrganizationSettings {...props} />;
        default:
          return null;
      }
    })()}
  </>
);

export default SettingsSection;
