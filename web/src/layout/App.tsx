import React, { useState } from 'react';
import { Route, Switch, BrowserRouter as Router } from 'react-router-dom';
import { FiHexagon } from 'react-icons/fi';
import isUndefined from 'lodash/isUndefined';
import Navbar from './navigation/Navbar';
import HomeView from './home';
import SearchView from './search';
import PackageView from './package';
import NotFound from './notFound';
import styles from './App.module.css';
import './App.css';
import '../themes/default.scss';

export default function App() {
  const [theme, setTheme] = useState('theme2'); /* eslint-disable-line @typescript-eslint/no-unused-vars */
  import(`../themes/${theme}.scss`).then(() => {
    return;
  });

  const [isSearching, setIsSearching] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);

  return (
    <Router>
      <div className="d-flex flex-column min-vh-100 position-relative">
        <Navbar isSearching={isSearching} />

        <div className="d-flex flex-column flex-grow-1">
          <Switch>
            <Route path="/" exact render={({location}) => (
              <HomeView
                isSearching={isSearching}
                pathname={location.pathname}
                search={location.search}
              />
            )} />

            <Route path="/search" exact render={({location}) => (
              <SearchView
                isSearching={isSearching}
                setIsSearching={setIsSearching}
                scrollPosition={scrollPosition}
                setScrollPosition={setScrollPosition}
                pathname={location.pathname}
                search={location.search}
                fromDetail={!isUndefined(location.state) ? location.state.fromDetail : false}
              />
            )} />

            <Route path="/package/:packageId/:packageVersion?" exact render={({location, match}) => (
              <PackageView
                searchUrlReferer={location.state}
                {...match.params}
              />
            )} />

            <Route component={NotFound} />
          </Switch>
        </div>

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
