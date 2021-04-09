import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useContext, useEffect, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';

import { AppCtx, signOut, unselectOrg, updateOrg } from '../../context/AppCtx';
import { Section } from '../../types';
import alertDispatcher from '../../utils/alertDispatcher';
import { CONTROL_PANEL_SECTIONS } from '../../utils/data';
import isControlPanelSectionAvailable from '../../utils/isControlPanelSectionAvailable';
import styles from './ControlPanelView.module.css';
import MembersSection from './members';
import OrganizationsSection from './organizations';
import RepositoriesSection from './repositories';
import SettingsSection from './settings';
import UserContext from './UserContext';

interface Props {
  section?: string;
  subsection?: string;
  userAlias?: string;
  organizationName?: string;
  repoName?: string;
  visibleModal?: string;
}

const DEFAULT_SECTION = 'repositories';

const ControlPanelView = (props: Props) => {
  const history = useHistory();
  const { ctx, dispatch } = useContext(AppCtx);
  const [activeSection, setActiveSection] = useState<string>(props.section || DEFAULT_SECTION);
  const [activeSubsection, setActiveSubsection] = useState<string | null>(props.subsection || null);
  const [context, setContext] = useState<'user' | 'org' | null>(
    isUndefined(ctx.user) || isNull(ctx.user) ? null : isUndefined(ctx.prefs.controlPanel.selectedOrg) ? 'user' : 'org'
  );
  const isLoggedIn = !isUndefined(ctx.user) && !isNull(ctx.user);
  const [lastSelectedOrg, setLastSelectedOrg] = useState<string | undefined>(ctx.prefs.controlPanel.selectedOrg);

  const onAuthError = (): void => {
    alertDispatcher.postAlert({
      type: 'danger',
      message: 'Sorry, you are not authorized to complete this action, please make sure you are signed in',
    });
    dispatch(signOut());
    history.push(
      `/?modal=login&redirect=/control-panel/${activeSection}${!isNull(activeSubsection) ? `/${activeSubsection}` : ''}`
    );
  };

  const checkIfAuthorizationIsActive = (newCtx: string): boolean => {
    if (
      newCtx === 'user' &&
      props.subsection === 'authorization' &&
      !isControlPanelSectionAvailable(newCtx, props.section, props.subsection) &&
      !isUndefined(lastSelectedOrg)
    ) {
      return true;
    }

    return false;
  };

  useEffect(() => {
    if (ctx.user) {
      let context: 'user' | 'org' = isUndefined(ctx.prefs.controlPanel.selectedOrg) ? 'user' : 'org';
      if (
        ctx.user.alias === props.userAlias &&
        !isUndefined(props.userAlias) &&
        props.userAlias !== '' &&
        !isUndefined(ctx.prefs.controlPanel.selectedOrg)
      ) {
        dispatch(unselectOrg());
        context = 'user';
      } else if (
        !isUndefined(props.organizationName) &&
        props.organizationName !== '' &&
        ctx.prefs.controlPanel.selectedOrg !== props.organizationName
      ) {
        dispatch(updateOrg(props.organizationName));
        context = 'org';
      }

      if (isUndefined(props.repoName) && (!isUndefined(props.userAlias) || !isUndefined(props.organizationName))) {
        history.replace({
          search: '',
        });
      }

      if (ctx.prefs.controlPanel.selectedOrg) {
        setLastSelectedOrg(ctx.prefs.controlPanel.selectedOrg);
      }

      // On /settings/authorization, if user doesn't want to lose unsaved changes
      if (lastSelectedOrg && checkIfAuthorizationIsActive(context)) {
        dispatch(updateOrg(lastSelectedOrg));
      } else {
        setContext(context);
      }
    }
  }, [ctx]); /* eslint-disable-line react-hooks/exhaustive-deps */

  useEffect(() => {
    if (ctx.user && !isNull(context)) {
      if (isControlPanelSectionAvailable(context, props.section, props.subsection)) {
        if (!isUndefined(props.section)) {
          setActiveSection(props.section);
        }
        if (!isUndefined(props.subsection)) {
          setActiveSubsection(props.subsection);
        }
      } else {
        if (props.subsection !== 'authorization') {
          history.replace(`/control-panel/${DEFAULT_SECTION}`);
        } else {
          if (isUndefined(lastSelectedOrg)) {
            history.replace(`/control-panel/${DEFAULT_SECTION}`);
          }
        }
      }
    }
  }, [props.section, props.subsection, context]); /* eslint-disable-line react-hooks/exhaustive-deps */

  if (!isUndefined(ctx.user) && isNull(ctx.user)) {
    history.push('/');
  }

  if (isNull(context)) return null;

  return (
    <main role="main" className="d-flex flex-column flex-grow-1 position-relative">
      <div className={`pt-3 position-relative navWrapper ${styles.navWrapper}`}>
        <div className="container-lg px-sm-4 px-lg-0">
          <div className="px-xs-0 px-sm-3 px-lg-0 d-flex flex-column-reverse flex-sm-row justify-content-between align-items-end">
            <ul className="mr-auto mr-md-0 nav nav-tabs" role="tablist">
              {CONTROL_PANEL_SECTIONS[context].map((section: Section) => {
                return (
                  <li key={`section_${section.name}`} className={`nav-item ${styles.navItem}`} role="tab">
                    <Link
                      to={{
                        pathname: `/control-panel/${section.name}`,
                      }}
                      className={classnames(
                        'btn btn-link rounded-0 text-reset nav-link position-relative',
                        styles.section,
                        { [`active activeSection ${styles.activeSection}`]: activeSection === section.name },
                        { disabled: section.disabled }
                      )}
                    >
                      <div className="d-flex flex-row align-items-center">
                        <span className={styles.icon}>{section.icon}</span>
                        <span className={`d-none d-md-inline ml-2 ${styles.navTitle}`}>{section.displayName}</span>
                      </div>
                    </Link>
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
          <div className="container-lg px-sm-4 px-lg-0">
            {(() => {
              switch (activeSection) {
                case 'repositories':
                  return <RepositoriesSection {...props} onAuthError={onAuthError} />;
                case 'organizations':
                  return <OrganizationsSection {...props} onAuthError={onAuthError} />;
                case 'members':
                  return <MembersSection {...props} onAuthError={onAuthError} />;
                case 'settings':
                  return (
                    <SettingsSection
                      {...props}
                      context={context}
                      activeSection={activeSection}
                      onAuthError={onAuthError}
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
