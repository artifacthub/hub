import './App.css';
import '../themes/default.scss';

import isNull from 'lodash/isNull';
import { useState } from 'react';
import { Route, Router, Switch } from 'react-router-dom';

import { AppCtxProvider } from '../context/AppCtx';
import buildSearchParams from '../utils/buildSearchParams';
import browserHistory from '../utils/history';
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
  const [viewedPackage, setViewedPackage] = useState<undefined | string>(undefined);

  return (
    <AppCtxProvider>
      <Router history={browserHistory}>
        <div className="d-flex flex-column min-vh-100 position-relative whiteBranded">
          <div className="visually-hidden visually-hidden-focusable">
            <a href="#content">Skip to Main Content</a>
          </div>
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
              render={(routeProps) => (
                <div className="d-flex flex-column flex-grow-1">
                  <Navbar
                    isSearching={isSearching}
                    redirect={getQueryParam(routeProps.location.search, 'redirect') || undefined}
                    visibleModal={getQueryParam(routeProps.location.search, 'modal') || undefined}
                    fromHome
                  />
                  <HomeView
                    isSearching={isSearching}
                    emailCode={
                      routeProps.location.pathname === '/verify-email'
                        ? getQueryParam(routeProps.location.search, 'code')
                        : undefined
                    }
                    deleteCode={
                      routeProps.location.pathname === '/delete-user'
                        ? getQueryParam(routeProps.location.search, 'code')
                        : undefined
                    }
                    resetPwdCode={
                      routeProps.location.pathname === '/reset-password'
                        ? getQueryParam(routeProps.location.search, 'code')
                        : undefined
                    }
                    orgToConfirm={
                      routeProps.location.pathname === '/accept-invitation'
                        ? getQueryParam(routeProps.location.search, 'org')
                        : undefined
                    }
                    onOauthFailed={routeProps.location.pathname === '/oauth-failed'}
                  />
                  <Footer />
                </div>
              )}
            />

            <Route
              path="/packages/search"
              exact
              render={(routeProps: any) => {
                const searchParams = buildSearchParams(routeProps.location.search);
                return (
                  <>
                    <Navbar
                      redirect={getQueryParam(routeProps.location.search, 'redirect') || undefined}
                      visibleModal={getQueryParam(routeProps.location.search, 'modal') || undefined}
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
                        viewedPackage={viewedPackage}
                        setViewedPackage={setViewedPackage}
                        fromDetail={
                          routeProps.location.state ? routeProps.location.state.hasOwnProperty('from-detail') : false
                        }
                        visibleModal={getQueryParam(routeProps.location.search, 'modal') || undefined}
                      />
                    </div>
                  </>
                );
              }}
            />

            <Route
              path="/packages/:repositoryKind/:repositoryName/:packageName/:version?"
              exact
              render={(routeProps) => {
                const state = routeProps.location.state ? (routeProps.location.state as Object) : {};
                return (
                  <>
                    <Navbar
                      isSearching={isSearching}
                      redirect={getQueryParam(routeProps.location.search, 'redirect') || undefined}
                      visibleModal={getQueryParam(routeProps.location.search, 'modal') || undefined}
                    />
                    <div className="d-flex flex-column flex-grow-1">
                      <PackageView
                        hash={routeProps.location.hash}
                        visibleModal={getQueryParam(routeProps.location.search, 'modal') || undefined}
                        visibleTemplate={getQueryParam(routeProps.location.search, 'template') || undefined}
                        visibleLine={getQueryParam(routeProps.location.search, 'line') || undefined}
                        compareVersionTo={getQueryParam(routeProps.location.search, 'compare-to') || undefined}
                        visibleExample={getQueryParam(routeProps.location.search, 'example') || undefined}
                        visibleFile={getQueryParam(routeProps.location.search, 'file') || undefined}
                        visibleVersion={getQueryParam(routeProps.location.search, 'version') || undefined}
                        visibleValuesPath={getQueryParam(routeProps.location.search, 'path') || undefined}
                        visibleImage={getQueryParam(routeProps.location.search, 'image') || undefined}
                        visibleTarget={getQueryParam(routeProps.location.search, 'target') || undefined}
                        visibleSection={getQueryParam(routeProps.location.search, 'section') || undefined}
                        eventId={getQueryParam(routeProps.location.search, 'event-id') || undefined}
                        {...state}
                        {...routeProps.match.params}
                      />
                    </div>
                  </>
                );
              }}
            />

            <Route
              path="/control-panel/:section?/:subsection?"
              exact
              render={(routeProps) => (
                <>
                  <Navbar isSearching={isSearching} privateRoute />
                  <div className="d-flex flex-column flex-grow-1">
                    <ControlPanelView
                      {...routeProps.match.params}
                      visibleModal={getQueryParam(routeProps.location.search, 'modal') || undefined}
                      userAlias={getQueryParam(routeProps.location.search, 'user-alias') || undefined}
                      organizationName={getQueryParam(routeProps.location.search, 'org-name') || undefined}
                      repoName={getQueryParam(routeProps.location.search, 'repo-name') || undefined}
                      activePage={getQueryParam(routeProps.location.search, 'page') || undefined}
                    />
                  </div>
                  <Footer />
                </>
              )}
            />

            <Route
              path="/packages/starred"
              exact
              render={(routeProps) => (
                <>
                  <Navbar isSearching={isSearching} privateRoute />
                  <div className="d-flex flex-column flex-grow-1">
                    <StarredPackagesView activePage={getQueryParam(routeProps.location.search, 'page') || undefined} />
                  </div>
                  <Footer />
                </>
              )}
            />

            <Route
              path="/stats"
              exact
              render={(routeProps) => (
                <>
                  <Navbar
                    isSearching={isSearching}
                    redirect={getQueryParam(routeProps.location.search, 'redirect') || undefined}
                    visibleModal={getQueryParam(routeProps.location.search, 'modal') || undefined}
                  />
                  <div className="d-flex flex-column flex-grow-1">
                    <StatsView hash={routeProps.location.hash} />
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
