import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import isUndefined from 'lodash/isUndefined';
import { FiHexagon } from 'react-icons/fi';
import classnames from 'classnames';
import SearchBar from '../common/SearchBar';
import MobileSettings from './MobileSettings';
import SignUp from './SignUp';
import { UserAuth } from '../../types';
import isNull from 'lodash/isNull';
import UserAuthDropdown from './UserAuthDropdown';
import LogIn from './LogIn';
import styles from './Navbar.module.css';

interface Props {
  isSearching: boolean;
  isAuth: null | UserAuth;
  setIsAuth: React.Dispatch<React.SetStateAction<UserAuth | null>>;
  fromHome?: boolean;
  searchText?: string;
  redirect?: string;
  privateRoute?: boolean;
}

const Navbar = (props: Props) => {
  const openLogInModal = !isUndefined(props.redirect) && (!isNull(props.isAuth) && !props.isAuth.status);
  const [openSignUp, setOpenSignUp] = useState<boolean>(false);
  const [openLogIn, setOpenLogIn] = useState<boolean>(openLogInModal);
  useEffect(() => {
    if (!isUndefined(props.redirect) && (!isNull(props.isAuth) && !props.isAuth.status)) {
      setOpenLogIn(true);
    }
  }, [props.redirect]); /* eslint-disable-line react-hooks/exhaustive-deps */

  return (
    <nav className={classnames(
      'navbar navbar-top navbar-expand-md navbar-dark',
      styles.navbar,
      {[styles.homeNavbar]: props.fromHome}
    )}>
      <div className="container">
        <Link className="navbar-brand d-flex align-items-center" to="/">
          <FiHexagon className="mr-2" />
          <div className="d-flex align-items-start">
            <div className="d-flex align-items-baseline">
              <span className="mr-1">Artifact</span>
              <span className={styles.brand}>HUB</span>
            </div>
            <span className={`text-uppercase badge badge-pill badge-secondary d-flex align-items-center ${styles.badge}`}>Alpha</span>
          </div>
        </Link>

        {openSignUp && (
          <SignUp openSignUp={openSignUp} setOpenSignUp={setOpenSignUp} />
        )}

        {openLogIn && (
          <LogIn
            openLogIn={openLogIn}
            setOpenLogIn={setOpenLogIn}
            setIsAuth={props.setIsAuth}
            redirect={props.redirect}
          />
        )}

        <MobileSettings
          setOpenSignUp={setOpenSignUp}
          setOpenLogIn={setOpenLogIn}
          isAuth={props.isAuth}
          setIsAuth={props.setIsAuth}
          privateRoute={props.privateRoute}
        />

        {isUndefined(props.fromHome) && (
          <SearchBar
            size="normal"
            formClassName={`mx-2 mr-md-auto my-3 my-md-0 flex-grow-1 pr-4 ${styles.search}`}
            isSearching={props.isSearching}
            text={props.searchText}
          />
        )}

        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav align-items-center ml-auto">
            {(isNull(props.isAuth) || !props.isAuth.status) && (
              <li className="nav-item position-relative ml-4">
                <button
                  type="button"
                  className={classnames(
                    'btn btn-disabled pl-0 pr-0 font-weight-bold text-uppercase position-relative text-nowrap',
                    styles.button,
                  )}
                  onClick={() => setOpenSignUp(true)}
                >
                  Sign up
                </button>
              </li>
            )}

            <li className="nav-item ml-4 position-relative">
              {isNull(props.isAuth) ? (
                <div className="spinner-grow spinner-grow-sm text-light" role="status">
                  <span className="sr-only">Loading...</span>
                </div>
              ) : (
                <>
                  {props.isAuth.status ? (
                    <UserAuthDropdown
                      alias={props.isAuth.alias!}
                      setIsAuth={props.setIsAuth}
                      privateRoute={props.privateRoute}
                    />
                  ) : (
                    <button
                      type="button"
                      className={classnames(
                        'btn font-weight-bold pr-0 pl-0 text-uppercase position-relative text-nowrap',
                        styles.button,
                      )}
                      onClick={() => setOpenLogIn(true)}
                    >
                      Sign in
                    </button>
                  )}
                </>
              )}
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
