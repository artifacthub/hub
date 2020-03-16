import React, { useState, useEffect } from 'react';
import { Route, Switch, Router } from 'react-router-dom';
import classnames from 'classnames';
import isNull from 'lodash/isNull';
import { FiHexagon } from 'react-icons/fi';
import Navbar from './navigation/Navbar';
import HomeView from './home';
import SearchView from './search';
import PackageView from './package';
import AdminView from './admin';
import NotFound from './notFound';
import Disclaimer from './common/Disclaimer';
import buildSearchParams from '../utils/buildSearchParams';
import styles from './App.module.css';
import './App.css';
import '../themes/default.scss';
import '../themes/theme2.scss';
import { UserAuth, Alias } from '../types';
import { API } from '../api';
import isUndefined from 'lodash/isUndefined';
import history from '../utils/history';

const getQueryParam = (query: string, param: string): string | undefined => {
  let result;
  const p = new URLSearchParams(query);
  if (p.has(param) && !isNull(p.get(param))) {
    result = p.get(param) as string;
  }
  return result;
}

export default function App() {
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingPackage, setIsLoadingPackage] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isAuth, setIsAuth] = useState<UserAuth | null>(null);

  useEffect(() => {
    async function isUserAuth() {
      try {
        const user: Alias = await API.getUserAlias();
        setIsAuth({status: true, alias: user.alias});
      } catch(err) {
        setIsAuth({status: false});
      }
    };
    if (isNull(isAuth) || (isAuth.status && isUndefined(isAuth.alias))) {
      isUserAuth();
    }
  }, [isAuth]);

  return (
    <Router history={history}>
      <Disclaimer />
      <div className="d-flex flex-column min-vh-100 position-relative">
        <Switch>
          <Route  path={['/', '/verifyEmail', '/login']} exact render={({location}) => (
            <>
              <Navbar
                isAuth={isAuth}
                setIsAuth={setIsAuth}
                isSearching={isSearching}
                redirect={getQueryParam(location.search, 'redirect') || undefined}
                fromHome
              />
              <div className="d-flex flex-column flex-grow-1">
                <HomeView
                  isSearching={isSearching}
                  emailCode={getQueryParam(location.search, 'code')}
                />
              </div>
            </>
          )} />

          <Route path="/search" exact render={({location}) => {
            const searchParams = buildSearchParams(location.search);
            return (
              <>
                <Navbar isAuth={isAuth} setIsAuth={setIsAuth} isSearching={isSearching} searchText={searchParams.text} />
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
          }} />

          <Route path="/package/chart/:repoName/:packageName/:version?" exact render={({location, match}) => (
            <>
              <Navbar isAuth={isAuth} setIsAuth={setIsAuth} isSearching={isSearching} />
              <div className="d-flex flex-column flex-grow-1">
                <PackageView
                  isLoadingPackage={isLoadingPackage}
                  setIsLoadingPackage={setIsLoadingPackage}
                  searchUrlReferer={location.state || null}
                  {...match.params}
                />
              </div>
            </>
          )} />

          <Route path="/admin" exact render={() => (
            <>
              <Navbar isAuth={isAuth} setIsAuth={setIsAuth} isSearching={isSearching} privateRoute />
              <div className="d-flex flex-column flex-grow-1">
                <AdminView isAuth={isAuth} setIsAuth={setIsAuth} />
              </div>
            </>
          )} />

          <Route render={() => (
            <>
              <Navbar isAuth={isAuth} setIsAuth={setIsAuth} isSearching={isSearching} />
              <NotFound />
            </>
          )} />
        </Switch>

        <footer className={classnames(
          'position-relative',
          styles.footer,
          {[styles.invisibleFooter]: isSearching || isLoadingPackage},
        )}>
          <div className={classnames(
            'container',
            {'invisible': isSearching || isLoadingPackage},
          )}>
            <div className="d-flex flex-column align-items-center">
              <div className={`mb-3 d-flex align-items-center ${styles.brand}`}>
                <FiHexagon className="mr-2" />
                HUB
              </div>

              <div className="d-flex">
                <span className="d-none d-sm-block mr-1">Copyright</span>
                © CNCF 2020
              </div>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}
