import React, { useState } from 'react';
import { Route, Switch, BrowserRouter as Router } from 'react-router-dom';
import Navbar from './navigation/Navbar';
import Home from './home';
import Search from './search';
import Package from './package';
import NotFound from './notFound';
import Footer from './navigation/Footer';
import ScrollToTop from './common/ScrollToTop';
import './App.css';
import '../styles/default.scss';

export default function App() {
  const [theme, setTheme] = useState('theme2'); /* eslint-disable-line @typescript-eslint/no-unused-vars */
  import(`../styles/${theme}.scss`).then(() => {
    return;
  });

  const [isSearching, setIsSearching] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);

  return (
    <Router>
      <ScrollToTop />

      <div className="d-flex flex-column min-vh-100 position-relative">
        <Navbar isSearching={isSearching} />

        <div className="d-flex flex-column flex-grow-1">
          <Switch>
            <Route path="/" exact>
              <Home isSearching={isSearching} />
            </Route>

            <Route path="/search" exact>
              <Search
                isSearching={isSearching}
                setIsSearching={setIsSearching}
                scrollPosition={scrollPosition}
                setScrollPosition={setScrollPosition}
              />
            </Route>

            <Route path="/package/:packageId/:packageVersion?" exact>
              <Package />
            </Route>

            <Route component={NotFound} />
          </Switch>
        </div>

        <Footer />
      </div>
    </Router>
  );
}
