import './App.css';
import '../themes/default.scss';
import '../themes/theme2.scss';

import classnames from 'classnames';
import isNull from 'lodash/isNull';
import React, { useState } from 'react';
import { FiHexagon } from 'react-icons/fi';
import { Route, Router, Switch } from 'react-router-dom';

import { AppCtxProvider } from '../context/AppCtx';
import buildSearchParams from '../utils/buildSearchParams';
import history from '../utils/history';
import styles from './App.module.css';
import AlertController from './common/AlertController';
import Disclaimer from './common/Disclaimer';
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
  const [scrollPosition, setScrollPosition] = useState(0);

  return (
    <AppCtxProvider>
      <Router history={history}>
        <div className="d-flex flex-column min-vh-100 position-relative">
          <Disclaimer />
          <AlertController />
          <Switch>
            <Route
              path={['/', '/verify-email', '/login', '/accept-invitation']}
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
                    <Navbar isSearching={isSearching} searchText={searchParams.text} />
                    <div className="d-flex flex-column flex-grow-1">
                      <SearchView
                        {...searchParams}
                        isSearching={isSearching}
                        setIsSearching={setIsSearching}
                        scrollPosition={scrollPosition}
                        setScrollPosition={setScrollPosition}
                        fromDetail={location.state ? location.state.emailKey : undefined}
                      />
                    </div>
                  </>
                );
              }}
            />

            <Route
              path={['/package/chart/:repoName/:packageName/:version?', `/package/:packageKind/:packageName/:version?`]}
              exact
              render={({ location, match }) => (
                <>
                  <Navbar isSearching={isSearching} />
                  <div className="d-flex flex-column flex-grow-1">
                    <PackageView
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
              path="/control-panel/:section?"
              exact
              render={({ match }) => (
                <>
                  <Navbar isSearching={isSearching} privateRoute />
                  <div className="d-flex flex-column flex-grow-1">
                    <ControlPanelView {...match.params} />
                  </div>
                </>
              )}
            />

            <Route
              path="/user/packages/starred"
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
              <div className="d-flex flex-column align-items-center">
                <div className={`mb-3 d-flex align-items-center ${styles.brand}`}>
                  <FiHexagon className="mr-2" />
                  <div className="d-flex align-items-baseline">
                    <span className="mr-2">Artifact</span>
                    <span className={styles.hubFont}>HUB</span>
                  </div>
                </div>

                <div className="d-flex">
                  <span className="d-none d-sm-block mr-1">Copyright</span>© Artifact Hub 2020
                </div>
              </div>
            </div>
          </footer>
        </div>
      </Router>
    </AppCtxProvider>
  );
}
