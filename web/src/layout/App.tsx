import './App.css';
import '../themes/default.scss';

import isNull from 'lodash/isNull';
import { useState } from 'react';
import { Route, Router, Switch } from 'react-router-dom';

import { AppCtxProvider } from '../context/AppCtx';
import buildSearchParams from '../utils/buildSearchParams';
import history from '../utils/history';
import AlertController from './common/AlertController';
import UserNotificationsController from './common/userNotifications';
import ControlPanelView from './controlPanel';
import HomeView from './home';
import BannerMOTD from './navigation/BannerMOTD';
import Footer from './navigation/Footer';
import Navbar from './navigation/Navbar';
import NotFound from './notFound';
import PackageView from './package';
import SearchView from './search';
import StarredPackagesView from './starredPackages';
import StatsView from './stats';

const ScrollMemory = require('react-router-scroll-memory');

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
  const [scrollPosition, setScrollPosition] = useState<undefined | number>(undefined);

  return (
    <AppCtxProvider>
      <Router history={history}>
        <div className="d-flex flex-column min-vh-100 position-relative whiteBranded">
          <div className="sr-only sr-only-focusable">
            <a href="#content">Skip to Main Content</a>
          </div>
          <ScrollMemory />
          <AlertController />
          <BannerMOTD />
          <UserNotificationsController />
          <Switch>
            <Route
              path={[
                '/',
                '/verify-email',
                '/login',
                '/accept-invitation',
                '/oauth-failed',
                '/reset-password',
                '/delete-user',
              ]}
              exact
              render={({ location }) => (
                <div className="d-flex flex-column flex-grow-1">
                  <Navbar
                    isSearching={isSearching}
                    redirect={getQueryParam(location.search, 'redirect') || undefined}
                    visibleModal={getQueryParam(location.search, 'modal') || undefined}
                    fromHome
                  />
                  <HomeView
                    isSearching={isSearching}
                    emailCode={
                      location.pathname === '/verify-email' ? getQueryParam(location.search, 'code') : undefined
                    }
                    deleteCode={
                      location.pathname === '/delete-user' ? getQueryParam(location.search, 'code') : undefined
                    }
                    resetPwdCode={
                      location.pathname === '/reset-password' ? getQueryParam(location.search, 'code') : undefined
                    }
                    orgToConfirm={
                      location.pathname === '/accept-invitation' ? getQueryParam(location.search, 'org') : undefined
                    }
                    onOauthFailed={location.pathname === '/oauth-failed'}
                  />
                  <Footer />
                </div>
              )}
            />

            <Route
              path="/packages/search"
              exact
              render={({ location }: any) => {
                const searchParams = buildSearchParams(location.search);
                return (
                  <>
                    <Navbar
                      redirect={getQueryParam(location.search, 'redirect') || undefined}
                      visibleModal={getQueryParam(location.search, 'modal') || undefined}
                      isSearching={isSearching}
                      searchText={searchParams.tsQueryWeb}
                    />
                    <div className="d-flex flex-column flex-grow-1">
                      <SearchView
                        {...searchParams}
                        isSearching={isSearching}
                        setIsSearching={setIsSearching}
                        scrollPosition={scrollPosition}
                        setScrollPosition={setScrollPosition}
                        fromDetail={location.state ? location.state.hasOwnProperty('from-detail') : false}
                        visibleModal={getQueryParam(location.search, 'modal') || undefined}
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
                  <Navbar
                    isSearching={isSearching}
                    redirect={getQueryParam(location.search, 'redirect') || undefined}
                    visibleModal={getQueryParam(location.search, 'modal') || undefined}
                  />
                  <div className="d-flex flex-column flex-grow-1">
                    <PackageView
                      hash={location.hash}
                      visibleModal={getQueryParam(location.search, 'modal') || undefined}
                      visibleTemplate={getQueryParam(location.search, 'template') || undefined}
                      visibleFile={getQueryParam(location.search, 'file') || undefined}
                      visibleVersion={getQueryParam(location.search, 'version') || undefined}
                      visibleValuesPath={getQueryParam(location.search, 'path') || undefined}
                      visibleImage={getQueryParam(location.search, 'image') || undefined}
                      visibleTarget={getQueryParam(location.search, 'target') || undefined}
                      visibleSection={getQueryParam(location.search, 'section') || undefined}
                      eventId={getQueryParam(location.search, 'event-id') || undefined}
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
                      visibleModal={getQueryParam(location.search, 'modal') || undefined}
                      userAlias={getQueryParam(location.search, 'user-alias') || undefined}
                      organizationName={getQueryParam(location.search, 'org-name') || undefined}
                      repoName={getQueryParam(location.search, 'repo-name') || undefined}
                      activePage={getQueryParam(location.search, 'page') || undefined}
                    />
                  </div>
                  <Footer />
                </>
              )}
            />

            <Route
              path="/packages/starred"
              exact
              render={({ location }) => (
                <>
                  <Navbar isSearching={isSearching} privateRoute />
                  <div className="d-flex flex-column flex-grow-1">
                    <StarredPackagesView activePage={getQueryParam(location.search, 'page') || undefined} />
                  </div>
                  <Footer />
                </>
              )}
            />

            <Route
              path="/stats"
              exact
              render={({ location }) => (
                <>
                  <Navbar
                    isSearching={isSearching}
                    redirect={getQueryParam(location.search, 'redirect') || undefined}
                    visibleModal={getQueryParam(location.search, 'modal') || undefined}
                  />
                  <div className="d-flex flex-column flex-grow-1">
                    <StatsView hash={location.hash} />
                  </div>
                  <Footer />
                </>
              )}
            />

            <Route
              render={() => (
                <>
                  <Navbar isSearching={isSearching} />
                  <NotFound />
                  <Footer />
                </>
              )}
            />
          </Switch>
        </div>
      </Router>
    </AppCtxProvider>
  );
}
