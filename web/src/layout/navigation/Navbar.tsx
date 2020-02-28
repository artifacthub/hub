import React from 'react';
import { Link } from 'react-router-dom';
import { FiHexagon } from 'react-icons/fi';
import classnames from 'classnames';
import SearchBar from '../common/SearchBar';
import styles from './Navbar.module.css';
import isUndefined from 'lodash/isUndefined';

interface Props {
  isSearching: boolean;
  fromHome?: boolean;
  searchText?: string;
}

const Navbar = (props: Props) => (
  <nav className={classnames(
    'navbar navbar-top navbar-expand-sm navbar-dark',
    styles.navbar,
    {[styles.homeNavbar]: props.fromHome}
  )}>
    <div className="container">
      <Link className="navbar-brand d-flex align-items-center" to="/">
        <FiHexagon className="mr-2" />
        <div className="d-flex align-items-start">
          <span className={styles.brand}>HUB</span>
          <span className={`ml-2 text-uppercase badge badge-pill badge-secondary d-flex align-items-center ${styles.badge}`}>Beta</span>
        </div>
      </Link>

      {isUndefined(props.fromHome) && (
        <SearchBar
          size="normal"
          formClassName={`mr-auto flex-grow-1 pr-4 ${styles.search}`}
          isSearching={props.isSearching}
          text={props.searchText}
        />
      )}

      <div className="collapse navbar-collapse" id="navbarNav">
        {/* TODO - login */}
        <ul className="navbar-nav align-items-center ml-auto">
          <li className="nav-item position-relative ml-4">
            <button
              type="button"
              className={classnames(
                'btn btn-disabled pl-0 pr-0 font-weight-bold text-uppercase position-relative text-nowrap',
                styles.button,
              )}
              data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"
            >
              Sign up
            </button>
          </li>

          <li className="nav-item ml-4 position-relative">
            <button
              type="button"
              className={classnames(
                'btn btn-disabled pl-0 pr-0 font-weight-bold text-uppercase position-relative text-nowrap',
                styles.button,
              )}
              data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"              >
              Login
            </button>
          </li>
        </ul>
      </div>
    </div>
  </nav>
);

export default Navbar;
