import './App.css';
import '../themes/default.scss';

import classnames from 'classnames';
import { isUndefined } from 'lodash';
import isNull from 'lodash/isNull';
import React, { useEffect, useState } from 'react';
import { FaGithub, FaSlack, FaTwitter } from 'react-icons/fa';
import { FiExternalLink, FiHexagon } from 'react-icons/fi';
import { Route, Router, Switch } from 'react-router-dom';

import { AppCtxProvider, updateActiveStyleSheet } from '../context/AppCtx';
import buildSearchParams from '../utils/buildSearchParams';
import detectActiveThemeMode from '../utils/detectActiveThemeMode';
import history from '../utils/history';
import lsPreferences from '../utils/localStoragePreferences';
import styles from './App.module.css';
import AlertController from './common/AlertController';
import ExternalLink from './common/ExternalLink';
import ControlPanelView from './controlPanel';
import HomeView from './home';
import Navbar from './navigation/Navbar';
import NotFound from './notFound';
import PackageView from './package';
import SearchView from './search';
import StarredPackagesView from './starredPackages';

const getQueryParam = (query: string, param: string): string | undefined => {
  let result;
  const p = new URLSearchParams(query);
  if (p.has(param) && !isNull(p.get(param))) {
    result = p.get(param) as string;
  }
  return result;
};

export default function App() {
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingPackage, setIsLoadingPackage] = useState(false);
  const [activeInitialTheme, setActiveInitialTheme] = useState<string | null>(null);
  const [scrollPosition, setScrollPosition] = useState<undefined | number>(undefined);

  useEffect(() => {
    const activeProfile = lsPreferences.getActiveProfile();
    const theme = activeProfile.theme.automatic
      ? detectActiveThemeMode()
      : activeProfile.theme.efective || activeProfile.theme.configured;
    if (!isUndefined(theme)) {
      updateActiveStyleSheet(theme);
      setActiveInitialTheme(theme);
    }
  }, []);

  if (isNull(activeInitialTheme)) return null;

  return (
    <AppCtxProvider>
      <Router history={history}>
        <div className="d-flex flex-column min-vh-100 position-relative">
          <AlertController />
          <Switch>
            <Route
              path={['/', '/verify-email', '/login', '/accept-invitation', '/oauth-failed']}
              exact
              render={({ location }) => (
                <div className="d-flex flex-column flex-grow-1">
                  <Navbar
                    isSearching={isSearching}
                    redirect={getQueryParam(location.search, 'redirect') || undefined}
                    fromHome
                  />
                  <HomeView
                    isSearching={isSearching}
                    emailCode={getQueryParam(location.search, 'code')}
                    orgToConfirm={getQueryParam(location.search, 'org')}
                    onOauthFailed={location.pathname === '/oauth-failed'}
                  />
                </div>
              )}
            />

            <Route
              path="/packages/search"
              exact
              render={({ location }) => {
                const searchParams = buildSearchParams(location.search);
                return (
                  <>
                    <Navbar isSearching={isSearching} searchText={searchParams.tsQueryWeb} />
                    <div className="d-flex flex-column flex-grow-1">
                      <SearchView
                        {...searchParams}
                        isSearching={isSearching}
                        setIsSearching={setIsSearching}
                        scrollPosition={scrollPosition}
                        setScrollPosition={setScrollPosition}
                        fromDetail={location.state ? location.state.hasOwnProperty('fromDetail') : false}
                      />
                    </div>
                  </>
                );
              }}
            />

            <Route
              path="/packages/:repositoryKind/:repositoryName/:packageName/:version?"
              exact
              render={({ location, match }) => (
                <>
                  <Navbar isSearching={isSearching} />
                  <div className="d-flex flex-column flex-grow-1">
                    <PackageView
                      hash={location.hash}
                      channel={getQueryParam(location.search, 'channel')}
                      isLoadingPackage={isLoadingPackage}
                      setIsLoadingPackage={setIsLoadingPackage}
                      {...location.state}
                      {...match.params}
                    />
                  </div>
                </>
              )}
            />

            <Route
              path="/control-panel/:section?/:subsection?"
              exact
              render={({ location, match }) => (
                <>
                  <Navbar isSearching={isSearching} privateRoute />
                  <div className="d-flex flex-column flex-grow-1">
                    <ControlPanelView
                      {...match.params}
                      userAlias={getQueryParam(location.search, 'user-alias') || undefined}
                      organizationName={getQueryParam(location.search, 'org-name') || undefined}
                      repoName={getQueryParam(location.search, 'repo-name') || undefined}
                    />
                  </div>
                </>
              )}
            />

            <Route
              path="/packages/starred"
              exact
              render={() => (
                <>
                  <Navbar isSearching={isSearching} privateRoute />
                  <div className="d-flex flex-column flex-grow-1">
                    <StarredPackagesView />
                  </div>
                </>
              )}
            />

            <Route
              render={() => (
                <>
                  <Navbar isSearching={isSearching} />
                  <NotFound />
                </>
              )}
            />
          </Switch>

          <footer
            className={classnames('position-relative', styles.footer, {
              [styles.invisibleFooter]: isSearching || isLoadingPackage,
            })}
          >
            <div className={classnames('container', { invisible: isSearching || isLoadingPackage })}>
              <div
                className={`d-flex flex-row flex-wrap align-items-stretch justify-content-between ${styles.footerContent}`}
              >
                <div>
                  <div className="h6 font-weight-bold text-uppercase">Project</div>
                  <div className="d-flex flex-column text-left">
                    <ExternalLink className="text-muted mb-1" href="https://github.com/artifacthub/hub#getting-started">
                      Getting started
                    </ExternalLink>
                    <ExternalLink className="text-muted mb-1" href="https://artifacthub.github.io/hub/api/">
                      API docs
                    </ExternalLink>
                    <ExternalLink
                      className="text-muted mb-1"
                      href="https://github.com/cncf/foundation/blob/master/code-of-conduct.md"
                    >
                      Code of conduct
                    </ExternalLink>
                    <ExternalLink
                      className="text-muted mb-1"
                      href="https://github.com/artifacthub/hub/blob/master/CONTRIBUTING.md"
                    >
                      Contributing
                    </ExternalLink>
                  </div>
                </div>

                <div>
                  <div className="h6 font-weight-bold text-uppercase">Community</div>
                  <div className="d-flex flex-column text-left">
                    <ExternalLink className="text-muted mb-1" href="https://github.com/cncf/hub">
                      <div className="d-flex align-items-center">
                        <FaGithub className="mr-2" />
                        GitHub
                      </div>
                    </ExternalLink>
                    <ExternalLink
                      className="text-muted mb-1"
                      href="https://cloud-native.slack.com/channels/artifact-hub"
                    >
                      <div className="d-flex align-items-center">
                        <FaSlack className="mr-2" />
                        Slack
                      </div>
                    </ExternalLink>
                    <ExternalLink className="text-muted mb-1" href="https://twitter.com/cncfartifacthub">
                      <div className="d-flex align-items-center">
                        <FaTwitter className="mr-2" />
                        Twitter
                      </div>
                    </ExternalLink>
                  </div>
                </div>

                <div className={styles.fullMobileSection}>
                  <div className="h6 font-weight-bold text-uppercase">About</div>
                  <div className={`text-muted ${styles.copyrightContent}`}>
                    Artifact Hub is an <b className="d-inline-block">Open Source</b> project licensed under the{' '}
                    <ExternalLink
                      className="d-inline-block text-muted mb-1"
                      href="https://www.apache.org/licenses/LICENSE-2.0"
                    >
                      <div className="d-flex align-items-center">
                        Apache License 2.0
                        <span className={styles.smallIcon}>
                          <FiExternalLink className="ml-1" />
                        </span>
                      </div>
                    </ExternalLink>
                  </div>
                </div>

                <div className={`ml-0 ml-lg-auto mt-3 mt-lg-0 text-center ${styles.fullMobileSection}`}>
                  <div className="d-flex flex-column align-items-center h-100">
                    <div className={styles.hexagon}>
                      <FiHexagon />
                    </div>
                    <div className="mt-2 mt-lg-auto">
                      <small>
                        <span className="d-none d-sm-inline mr-1">Copyright</span>© The Artifact Hub Authors
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </Router>
    </AppCtxProvider>
  );
}
