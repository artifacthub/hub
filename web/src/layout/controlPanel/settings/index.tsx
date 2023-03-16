import OrganizationSettingsSection from './orgSettings';
import UserSettingsSection from './userSettings';

interface Props {
  activePage: string | null;
  context: 'user' | 'org';
  subsection?: string;
  activeSection?: string;
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
