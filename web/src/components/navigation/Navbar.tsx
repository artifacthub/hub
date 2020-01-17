import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiPackage } from 'react-icons/fi';
import SearchBar from '../common/SearchBar';
import Login from './Login';
import styles from './Navbar.module.css';

interface Props {
  location: {
    pathname: string;
  };
}

const Navbar = () => {
  const location = useLocation();

  return (
    <nav className="navbar navbar-top navbar-expand-md navbar-dark bg-primary">
      <div className="container-fluid">
        <Link className="navbar-brand d-flex align-items-center" to="/">
          <FiPackage className="mr-2" /> CNCF Hub
        </Link>

        {location.pathname !== '/' && <SearchBar size="normal" formClassName={`mr-auto ${styles.search}`} />}

        <div className="collapse navbar-collapse" id="navbarNav">
          {/* TODO - login */}
          <ul className="navbar-nav align-items-center ml-auto">
            <li className="nav-item">
              <Login />
            </li>
          </ul>
        </div>

        {/* <div className=" ml-2 d-md-none">
          <button className="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
            <span className="navbar-toggler-icon"></span>
          </button>
        </div> */}
      </div>
    </nav>
  );
};

export default Navbar;
