import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useContext, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';

import { AppCtx, signOut } from '../../context/AppCtx';
import { Section } from '../../types';
import alertDispatcher from '../../utils/alertDispatcher';
import { CONTROL_PANEL_SECTIONS } from '../../utils/data';
import isControlPanelSectionAvailable from '../../utils/isControlPanelSectionAvailable';
import styles from './ControlPanelView.module.css';
import MembersSection from './members';
import OrganizationsSection from './organizations';
import PackagesSection from './packages';
import SettingsSection from './settings';
import UserContext from './UserContext';

interface Props {
  section?: string;
  subsection?: string;
  orgToConfirm?: string;
}

const DEFAULT_SECTION = 'packages';

const ControlPanelView = (props: Props) => {
  const history = useHistory();
  const { ctx, dispatch } = useContext(AppCtx);
  const [activeSection, setActiveSection] = useState<string>(DEFAULT_SECTION);
  const [activeSubsection, setActiveSubsection] = useState<string | null>(null);
  const [context, setContext] = useState<'user' | 'org'>(
    isUndefined(ctx.prefs.controlPanel.selectedOrg) ? 'user' : 'org'
  );
  const isLoggedIn = !isUndefined(ctx.user) && !isNull(ctx.user);

  const onAuthError = (): void => {
    dispatch(signOut());
    history.push(
      `/login?redirect=/control-panel/${activeSection}${!isNull(activeSubsection) ? `/${activeSubsection}` : ''}`
    );
    alertDispatcher.postAlert({
      type: 'danger',
      message: 'Sorry, you are not authorized to complete this action, please make sure you are signed in',
    });
  };

  const onMenuItemClick = (name: string) => {
    history.replace(`/control-panel/${name}`);
    setActiveSection(name);
    setActiveSubsection(null);
  };

  const onSubMenuItemClick = (name: string) => {
    history.replace(`/control-panel/${activeSection}/${name}`);
    setActiveSubsection(name);
  };

  useEffect(() => {
    setContext(isUndefined(ctx.prefs.controlPanel.selectedOrg) ? 'user' : 'org');
  }, [ctx.prefs.controlPanel.selectedOrg]);

  useEffect(() => {
    if (isControlPanelSectionAvailable(context, props.section, props.subsection)) {
      if (!isUndefined(props.section)) {
        setActiveSection(props.section);
      }
      if (!isUndefined(props.subsection)) {
        setActiveSubsection(props.subsection);
      }
    } else {
      history.replace(`/control-panel/${DEFAULT_SECTION}`);
    }
  }, [props.section, props.subsection]); /* eslint-disable-line react-hooks/exhaustive-deps */

  if (!isUndefined(ctx.user) && isNull(ctx.user)) {
    history.push('/');
  }

  return (
    <main role="main" className="d-flex flex-column flex-grow-1 position-relative">
      <div className={`pt-3 position-relative ${styles.navWrapper}`}>
        <div className="container">
          <div className="d-flex flex-row justify-content-between align-items-end">
            <ul className="nav nav-tabs" role="tablist">
              {CONTROL_PANEL_SECTIONS[context].map((section: Section) => {
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
                  return (
                    <PackagesSection {...props} onAuthError={onAuthError} onSubMenuItemClick={onSubMenuItemClick} />
                  );
                case 'organizations':
                  return <OrganizationsSection {...props} onAuthError={onAuthError} />;
                case 'members':
                  return <MembersSection {...props} onAuthError={onAuthError} />;
                case 'settings':
                  return (
                    <SettingsSection
                      {...props}
                      context={context}
                      onAuthError={onAuthError}
                      onSubMenuItemClick={onSubMenuItemClick}
                    />
                  );
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
