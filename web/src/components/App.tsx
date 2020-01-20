import React, { useState } from 'react';
import { Route, BrowserRouter as Router, Switch } from 'react-router-dom';
import Navbar from './navigation/Navbar';
import Home from './home';
import Search from './search';
import Package from './package';
import NotFound from './notFound';
import Footer from './navigation/Footer';
import './App.css';
import '../styles/default.scss';

export default function App() {
  const [theme, setTheme] = useState('theme2'); /* eslint-disable-line @typescript-eslint/no-unused-vars */
  import(`../styles/${theme}.scss`).then(() => {
    return;
  });

  return (
    <Router>
      <div className="d-flex flex-column min-vh-100 position-relative">
        <Navbar />

        <div className="d-flex flex-column flex-grow-1">
          <Switch>
            <Route exact path="/">
              <Home />
            </Route>

            <Route path="/search">
              <Search />
            </Route>

            <Route path="/package/:packageId/:packageVersion?">
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
