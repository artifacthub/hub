import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import some from 'lodash/some';
import React, { useContext, useEffect, useState } from 'react';
import { FaUserFriends } from 'react-icons/fa';
import { GoPackage } from 'react-icons/go';
import { MdBusiness, MdSettings } from 'react-icons/md';
import { useHistory } from 'react-router-dom';

import { AppCtx, signOut } from '../../context/AppCtx';
import alertDispatcher from '../../utils/alertDispatcher';
import styles from './ControlPanelView.module.css';
import MembersSection from './members';
import OrganizationsSection from './organizations';
import PackagesSection from './packages';
import SettingsSection from './settings';
import UserContext from './UserContext';

interface Section {
  name: string;
  displayName: string;
  disabled: boolean;
  icon: JSX.Element;
}

interface NavSection {
  user: Section[];
  org: Section[];
}

const navSections: NavSection = {
  user: [
    {
      name: 'packages',
      displayName: 'Packages',
      disabled: false,
      icon: <GoPackage />,
    },
    {
      name: 'organizations',
      displayName: 'Organizations',
      disabled: false,
      icon: <MdBusiness />,
    },
    {
      name: 'settings',
      displayName: 'Settings',
      disabled: false,
      icon: <MdSettings />,
    },
  ],
  org: [
    {
      name: 'packages',
      displayName: 'Packages',
      disabled: false,
      icon: <GoPackage />,
    },
    {
      name: 'members',
      displayName: 'Members',
      disabled: false,
      icon: <FaUserFriends />,
    },
    {
      name: 'settings',
      displayName: 'Settings',
      disabled: false,
      icon: <MdSettings />,
    },
  ],
};

interface Props {
  section?: string;
  orgToConfirm?: string;
}

const DEFAULT_SECTION = 'packages';

const ControlPanelView = (props: Props) => {
  const history = useHistory();
  const { ctx, dispatch } = useContext(AppCtx);
  const [activeSection, setActiveSection] = useState<string>(DEFAULT_SECTION);
  const context = isNull(ctx.org) ? 'user' : 'org';
  const isLoggedIn = !isUndefined(ctx.user) && !isNull(ctx.user);

  const onAuthError = (): void => {
    dispatch(signOut());
    history.push(`/login?redirect=/control-panel/${activeSection}`);
    alertDispatcher.postAlert({
      type: 'danger',
      message: 'Sorry, you are not authorized to complete this action, please make sure you are signed in',
    });
  };

  const onMenuItemClick = (name: string) => {
    history.replace(`/control-panel/${name}`);
    setActiveSection(name);
  };

  useEffect(() => {
    const isSectionAvailable = (sectionToCheck: string): boolean => {
      return some(navSections[context], (sect: Section) => sect.name === sectionToCheck);
    };

    if (!isUndefined(props.section) && isSectionAvailable(props.section)) {
      setActiveSection(props.section);
    } else {
      history.replace(`/control-panel/${DEFAULT_SECTION}`);
    }
  }, [props.section]); /* eslint-disable-line react-hooks/exhaustive-deps */

  if (!isUndefined(ctx.user) && isNull(ctx.user)) {
    history.push('/');
  }

  return (
    <main role="main" className="d-flex flex-column flex-grow-1 position-relative">
      <div className={`pt-3 position-relative ${styles.navWrapper}`}>
        <div className="container">
          <div className="d-flex flex-row justify-content-between align-items-end">
            <ul className="nav nav-tabs" role="tablist">
              {navSections[context].map((section: Section) => {
                return (
                  <li key={`section_${section.name}`} className="nav-item mx-1" role="tab">
                    <button
                      type="button"
                      className={classnames(
                        'btn btn-link rounded-0 text-reset nav-link position-relative',
                        styles.section,
                        { [`active ${styles.activeSection}`]: activeSection === section.name },
                        { disabled: section.disabled }
                      )}
                      onClick={() => onMenuItemClick(section.name)}
                    >
                      <div className="d-flex flex-row align-items-center">
                        {section.icon}
                        <span className="ml-2">{section.displayName}</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>

            {isLoggedIn && <UserContext />}
          </div>
        </div>
      </div>

      {isLoggedIn && (
        <div className="py-4 flex-grow-1 position-relative">
          <div className="container">
            {(() => {
              switch (activeSection) {
                case 'packages':
                  return <PackagesSection {...props} onAuthError={onAuthError} />;
                case 'organizations':
                  return <OrganizationsSection {...props} onAuthError={onAuthError} />;
                case 'members':
                  return <MembersSection {...props} onAuthError={onAuthError} />;
                case 'settings':
                  return <SettingsSection {...props} context={context} onAuthError={onAuthError} />;
                default:
                  return null;
              }
            })()}
          </div>
        </div>
      )}
    </main>
  );
};

export default ControlPanelView;
