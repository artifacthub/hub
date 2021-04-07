import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useContext, useEffect, useState } from 'react';
import { FiHexagon } from 'react-icons/fi';
import { Link } from 'react-router-dom';

import { AppCtx } from '../../context/AppCtx';
import SearchBar from '../common/SearchBar';
import GuestDropdown from './GuestDropdown';
import LogIn from './LogIn';
import MobileSettings from './MobileSettings';
import styles from './Navbar.module.css';
import SignUp from './SignUp';
import UserAuthDropdown from './UserAuthDropdown';

interface Props {
  isSearching: boolean;
  fromHome?: boolean;
  searchText?: string;
  redirect?: string;
  privateRoute?: boolean;
  visibleModal?: string;
}

const Navbar = (props: Props) => {
  const { ctx } = useContext(AppCtx);
  const openLogInModal =
    (!isUndefined(props.redirect) && isNull(ctx.user)) ||
    (!isUndefined(props.visibleModal) && props.visibleModal === 'login');
  const [openSignUp, setOpenSignUp] = useState<boolean>(false);
  const [openLogIn, setOpenLogIn] = useState<boolean>(openLogInModal);
  useEffect(() => {
    if (!isUndefined(props.redirect) && isNull(ctx.user)) {
      setOpenLogIn(true);
    }
  }, [props.redirect]); /* eslint-disable-line react-hooks/exhaustive-deps */

  return (
    <>
      <nav
        className={classnames('navbar navbar-top navbar-expand-md navbar-dark', styles.navbar, {
          [styles.homeNavbar]: props.fromHome,
        })}
      >
        <div className="container-lg px-sm-4 px-lg-0">
          <div className={`d-flex flex-row ${styles.mobileWrapper}`}>
            <Link data-testid="brandLink" className="navbar-brand d-flex align-items-center" to="/">
              <FiHexagon className="mr-2" />
              <div className="d-flex align-items-start">
                <div className="d-flex align-items-baseline">
                  <span className="mr-1">Artifact</span>
                  <span className={styles.brand}>HUB</span>
                </div>
                <span
                  className={`text-uppercase badge badge-pill badge-secondary d-flex align-items-center ${styles.badge}`}
                >
                  Beta
                </span>
              </div>
            </Link>

            <MobileSettings
              setOpenSignUp={setOpenSignUp}
              setOpenLogIn={setOpenLogIn}
              privateRoute={props.privateRoute}
            />
          </div>

          {isUndefined(props.fromHome) && (
            <SearchBar
              size="normal"
              formClassName={`mx-2 mr-md-auto my-3 my-md-0 flex-grow-1 pr-4 ${styles.search}`}
              isSearching={props.isSearching}
              tsQueryWeb={props.searchText}
            />
          )}

          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav align-items-center ml-auto">
              <Link
                className={classnames(
                  'btn navbarBtn pl-0 pr-0 font-weight-bold text-uppercase position-relative text-nowrap',
                  styles.button
                )}
                to={{
                  pathname: '/stats',
                }}
              >
                Stats
              </Link>

              {isUndefined(ctx) || isUndefined(ctx.user) ? (
                <div className="spinner-grow spinner-grow-sm textLight pt-1 ml-4" role="status">
                  <span className="sr-only">Loading...</span>
                </div>
              ) : (
                <>
                  {isNull(ctx.user) ? (
                    <>
                      <li className="nav-item position-relative ml-4">
                        <button
                          type="button"
                          className={classnames(
                            'btn navbarBtn pl-0 pr-0 font-weight-bold text-uppercase position-relative text-nowrap',
                            styles.button
                          )}
                          onClick={() => setOpenSignUp(true)}
                        >
                          Sign up
                        </button>
                      </li>

                      <li className="nav-item ml-4 position-relative">
                        <button
                          type="button"
                          className={classnames(
                            'btn navbarBtn font-weight-bold pr-0 pl-0 text-uppercase position-relative text-nowrap',
                            styles.button
                          )}
                          onClick={() => setOpenLogIn(true)}
                        >
                          Sign in
                        </button>
                      </li>

                      <li className="nav-item ml-4 position-relative">
                        <GuestDropdown />
                      </li>
                    </>
                  ) : (
                    <li className="nav-item ml-4 position-relative">
                      <UserAuthDropdown privateRoute={props.privateRoute} />
                    </li>
                  )}
                </>
              )}
            </ul>
          </div>
        </div>
      </nav>

      {openSignUp && <SignUp openSignUp={openSignUp} setOpenSignUp={setOpenSignUp} />}

      {openLogIn && (
        <LogIn
          openLogIn={openLogIn}
          setOpenLogIn={setOpenLogIn}
          redirect={props.redirect}
          visibleModal={props.visibleModal}
        />
      )}
    </>
  );
};

export default Navbar;
