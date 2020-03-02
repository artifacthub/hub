import React, { useState } from 'react';
import { Route, Switch, BrowserRouter as Router } from 'react-router-dom';
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

export default function App() {
  const [isSearching, setIsSearching] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);

  return (
    <Router>
      <div className="d-flex flex-column min-vh-100 position-relative">
        <Switch>
          <Route path="/" exact render={() => (
            <>
              <Navbar isSearching={isSearching} fromHome />
              <div className="d-flex flex-column flex-grow-1">
                <HomeView
                  isSearching={isSearching}
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
                    fromDetail={location.state ? location.state.fromDetail : false}
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
                  searchUrlReferer={location.state || null}
                  {...match.params}
                />
              </div>
            </>
          )} />

          <Route component={NotFound} />
        </Switch>

        <footer className={styles.footer}>
          <div className="container">
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
