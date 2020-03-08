import React, { useState } from 'react';
import { Route, Switch, BrowserRouter as Router } from 'react-router-dom';
import classnames from 'classnames';
import isNull from 'lodash/isNull';
import { FiHexagon } from 'react-icons/fi';
import Navbar from './navigation/Navbar';
import HomeView from './home';
import SearchView from './search';
import PackageView from './package';
import NotFound from './notFound';
import buildSearchParams from '../utils/buildSearchParams';
import styles from './App.module.css';
import './App.css';
import '../themes/default.scss';
import '../themes/theme2.scss';

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

  return (
    <Router>
      <div className="d-flex flex-column min-vh-100 position-relative">
        <Switch>
          <Route  path={['/', '/verifyEmail']} exact render={({location}) => (
            <>
              <Navbar isSearching={isSearching} fromHome />
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
          }} />

          <Route path="/package/chart/:repoName/:packageName/:version?" exact render={({location, match}) => (
            <>
              <Navbar isSearching={isSearching} />
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

          <Route render={() => (
            <>
              <Navbar isSearching={isSearching} />
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
