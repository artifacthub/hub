import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { useContext, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { AppCtx, signOut, unselectOrg, updateOrg } from '../../context/AppCtx';
import { Section } from '../../types';
import alertDispatcher from '../../utils/alertDispatcher';
import { CONTROL_PANEL_SECTIONS } from '../../utils/data';
import isControlPanelSectionAvailable from '../../utils/isControlPanelSectionAvailable';
import scrollToTop from '../../utils/scrollToTop';
import styles from './ControlPanelView.module.css';
import MembersSection from './members';
import OrganizationsSection from './organizations';
import RepositoriesSection from './repositories';
import SettingsSection from './settings';
import UserContext from './UserContext';

const DEFAULT_SECTION = 'repositories';

const ControlPanelView = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { ctx, dispatch } = useContext(AppCtx);
  const { section, subsection } = useParams();
  const [activeSection, setActiveSection] = useState<string>(section || DEFAULT_SECTION);
  const [activeSubsection, setActiveSubsection] = useState<string | null>(subsection || null);
  const [context, setContext] = useState<'user' | 'org' | null>(
    isUndefined(ctx.user) || isNull(ctx.user) ? null : isUndefined(ctx.prefs.controlPanel.selectedOrg) ? 'user' : 'org'
  );
  const isLoggedIn = !isUndefined(ctx.user) && !isNull(ctx.user);
  const [lastSelectedOrg, setLastSelectedOrg] = useState<string | undefined>(ctx.prefs.controlPanel.selectedOrg);
  const userAlias = searchParams.get('user-alias');
  const organizationName = searchParams.get('org-name');
  const repoName = searchParams.get('repo-name');
  const activePageParam = searchParams.get('page');

  const onAuthError = (): void => {
    alertDispatcher.postAlert({
      type: 'danger',
      message: 'Sorry, you are not authorized to complete this action, please make sure you are signed in',
    });
    dispatch(signOut());
    navigate(
      `/?modal=login&redirect=/control-panel/${activeSection}${!isNull(activeSubsection) ? `/${activeSubsection}` : ''}`
    );
  };

  const checkIfAuthorizationIsActive = (newCtx: string): boolean => {
    if (
      newCtx === 'user' &&
      subsection === 'authorization' &&
      !isControlPanelSectionAvailable(newCtx, section, subsection) &&
      !isUndefined(lastSelectedOrg)
    ) {
      return true;
    }

    return false;
  };

  useEffect(() => {
    scrollToTop(0, 'instant');
  }, []);

  useEffect(() => {
    if (ctx.user) {
      let context: 'user' | 'org' = isUndefined(ctx.prefs.controlPanel.selectedOrg) ? 'user' : 'org';
      if (
        ctx.user.alias === userAlias &&
        !isNull(userAlias) &&
        userAlias !== '' &&
        !isUndefined(ctx.prefs.controlPanel.selectedOrg)
      ) {
        dispatch(unselectOrg());
        context = 'user';
      } else if (
        !isNull(organizationName) &&
        organizationName !== '' &&
        ctx.prefs.controlPanel.selectedOrg !== organizationName
      ) {
        dispatch(updateOrg(organizationName));
        context = 'org';
      }

      if (isNull(repoName) && (!isNull(userAlias) || !isNull(organizationName))) {
        navigate(
          {
            search: '',
          },
          { replace: true }
        );
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
  }, [ctx]);

  useEffect(() => {
    if (ctx.user && !isNull(context)) {
      if (isControlPanelSectionAvailable(context, section, subsection)) {
        if (!isUndefined(section)) {
          setActiveSection(section);
        }
        if (!isUndefined(subsection)) {
          setActiveSubsection(subsection);
        }
      } else {
        if (subsection !== 'authorization') {
          navigate(`/control-panel/${DEFAULT_SECTION}`, { replace: true });
        } else {
          if (isUndefined(lastSelectedOrg)) {
            navigate(`/control-panel/${DEFAULT_SECTION}`, { replace: true });
          }
        }
      }
    }
  }, [section, subsection, context]);

  if (!isUndefined(ctx.user) && isNull(ctx.user)) {
    navigate('/');
  }

  if (isNull(context)) return null;

  return (
    <main role="main" className="d-flex flex-column flex-grow-1 position-relative noFocus" id="content" tabIndex={-1}>
      <div className={`pt-3 position-relative navWrapper ${styles.navWrapper}`}>
        <div className="container-lg px-sm-4 px-lg-0">
          <div className="px-xs-0 px-sm-3 px-lg-0 d-flex flex-column-reverse flex-sm-row justify-content-between align-items-end">
            <ul className="me-auto me-md-0 nav nav-tabs" role="tablist">
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
                      aria-label={`Open ${section.displayName} section`}
                    >
                      <div className="d-flex flex-row align-items-center">
                        <span className={styles.icon}>{section.icon}</span>
                        <span className={`d-none d-md-inline ms-2 ${styles.navTitle}`}>{section.displayName}</span>
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
                  return (
                    <RepositoriesSection
                      repoName={repoName}
                      activePage={activePageParam}
                      visibleModal={searchParams.get('modal')}
                      onAuthError={onAuthError}
                    />
                  );
                case 'organizations':
                  return <OrganizationsSection activePage={activePageParam} onAuthError={onAuthError} />;
                case 'members':
                  return <MembersSection activePage={activePageParam} onAuthError={onAuthError} />;
                case 'settings':
                  return (
                    <SettingsSection
                      activePage={activePageParam}
                      context={context}
                      activeSection={activeSection}
                      subsection={subsection}
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
