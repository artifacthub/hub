import React, { useState } from 'react';
import { Route, BrowserRouter as Router, match } from 'react-router-dom';
import isNull from 'lodash/isNull';
import Navbar from './navigation/Navbar';
import Home from './home';
import Search from './search';
import Package from './package';
import NotFound from './notFound';
import Footer from './navigation/Footer';
import './App.css';
import '../styles/default.scss';

interface Props {
  root: HTMLElement | null;
}

export default function App(props: Props) {
  const [theme, setTheme] = useState('theme2'); /* eslint-disable-line @typescript-eslint/no-unused-vars */
  import(`../styles/${theme}.scss`).then(() => {
    return;
  });

  let foundPage = false;
  const isVisible = (routeMatch: match<any> | null): boolean => {
    const isExact = !isNull(routeMatch) && routeMatch.isExact;
    if (isExact) {
      foundPage = true;
      if (!isNull(props.root)) {
        props.root.scrollTo(0, 0); // Reset scroll position when a new page is rendered
      }
    }
    return isExact;
  }

  return (
    <Router>
      <div className="d-flex flex-column min-vh-100 position-relative">
        <Navbar />

        <div className="d-flex flex-column flex-grow-1">
          <Route path="/" children={({match}) => (
            <Home isVisible={isVisible(match)} />
          )} />

          <Route path="/search" children={({match}) => (
            <Search isVisible={isVisible(match)} root={props.root} />
          )} />

          <Route path="/package/:packageId/:packageVersion?" children={({match}) => (
            <Package isVisible={isVisible(match)} />
          )} />

          <Route path="/not-found" children={() => {
            return !foundPage ? <NotFound /> : null;
          }} />
        </div>

        <Footer />
      </div>
    </Router>
  );
}
