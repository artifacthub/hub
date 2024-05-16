import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { useContext, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { AppCtx } from '../../context/AppCtx';
import getMetaTag from '../../utils/getMetaTag';
import ExternalLink from '../common/ExternalLink';
import SearchBar from '../common/SearchBar';
import SearchTipsModal from '../common/SearchTipsModal';
import GuestDropdown from './GuestDropdown';
import LogIn from './LogIn';
import MobileSettings from './MobileSettings';
import styles from './Navbar.module.css';
import SignUp from './SignUp';
import UserAuthDropdown from './UserAuthDropdown';

interface Props {
  isSearching: boolean;
  inHome: boolean;
  privateRoute?: boolean;
}

const Navbar = (props: Props) => {
  const { ctx } = useContext(AppCtx);
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect');
  const visibleModal = searchParams.get('modal');
  const openLogInModal = (!isNull(redirect) && isNull(ctx.user)) || (!isNull(visibleModal) && visibleModal === 'login');
  const [openSignUp, setOpenSignUp] = useState<boolean>(false);
  const [openLogIn, setOpenLogIn] = useState<boolean>(openLogInModal);
  const [openTips, setOpenTips] = useState<boolean>(false);
  useEffect(() => {
    if (!isNull(redirect) && isNull(ctx.user)) {
      setOpenLogIn(true);
    }
  }, [redirect]);

  const logo = getMetaTag('websiteLogo');
  const siteName = getMetaTag('siteName');
  const allowUserSignUp: boolean = getMetaTag('allowUserSignUp', true);

  return (
    <>
      <nav
        className={classnames('navbar navbar-top navbar-expand-lg navbar-dark border-top-0 p-2 p-sm-3', styles.navbar, {
          [`bg-transparent w-100 position-absolute ${styles.homeNavbar}`]: props.inHome,
        })}
      >
        <div className="container-lg px-0 px-sm-4 px-lg-0">
          <div className={`d-flex flex-row ps-1 ps-sm-0 pe-1 ${styles.mobileWrapper}`}>
            <Link data-testid="brandLink" className="navbar-brand d-flex align-items-center" to="/">
              <div className="d-flex align-items-start">
                <img className={`w-auto ${styles.logo}`} src={logo} alt={`Logo ${siteName}`} />
              </div>
            </Link>

            <MobileSettings
              setOpenSignUp={setOpenSignUp}
              setOpenLogIn={setOpenLogIn}
              privateRoute={props.privateRoute}
            />
          </div>

          {!props.inHome && (
            <SearchBar
              size="normal"
              formClassName={`mx-2 me-md-auto my-3 my-md-0 flex-grow-1 pe-0 pe-sm-4 ${styles.search}`}
              isSearching={props.isSearching}
              openTips={openTips}
              setOpenTips={setOpenTips}
            />
          )}

          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav align-items-center ms-auto">
              <li className="nav-item ms-4 position-relative">
                <ExternalLink
                  className={classnames(
                    'btn navbarBtn ps-0 pe-0 fw-bold text-uppercase position-relative text-nowrap text-decoration-none text-white',
                    styles.button
                  )}
                  href="/docs"
                  label="Open documentation"
                  target="_self"
                >
                  Docs
                </ExternalLink>
              </li>

              <li className="nav-item ms-4 position-relative">
                <Link
                  className={classnames(
                    'btn navbarBtn ps-0 pe-0 fw-bold text-uppercase position-relative text-nowrap text-decoration-none text-white',
                    styles.button
                  )}
                  to={{
                    pathname: '/stats',
                  }}
                >
                  Stats
                </Link>
              </li>

              {isUndefined(ctx) || isUndefined(ctx.user) ? (
                <div className="spinner-grow spinner-grow-sm textLight pt-1 ms-4" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              ) : (
                <>
                  {isNull(ctx.user) ? (
                    <>
                      {allowUserSignUp && (
                        <li className="nav-item position-relative ms-4">
                          <button
                            type="button"
                            className={classnames(
                              'btn navbarBtn ps-0 pe-0 fw-bold text-uppercase text-white position-relative text-nowrap',
                              styles.button
                            )}
                            onClick={() => setOpenSignUp(true)}
                            aria-label="Open sign up modal"
                          >
                            Sign up
                          </button>
                        </li>
                      )}

                      <li className="nav-item ms-4 position-relative">
                        <button
                          type="button"
                          className={classnames(
                            'btn navbarBtn fw-bold pe-0 ps-0 text-uppercase text-white position-relative text-nowrap',
                            styles.button
                          )}
                          onClick={() => setOpenLogIn(true)}
                          aria-label="Open sign in modal"
                        >
                          Sign in
                        </button>
                      </li>

                      <li className="nav-item ms-4 position-relative">
                        <GuestDropdown />
                      </li>
                    </>
                  ) : (
                    <li className="nav-item ms-4 position-relative">
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
        <LogIn openLogIn={openLogIn} setOpenLogIn={setOpenLogIn} redirect={redirect} visibleModal={visibleModal} />
      )}

      {!props.inHome && <SearchTipsModal size="normal" openTips={openTips} setOpenTips={setOpenTips} />}
    </>
  );
};

export default Navbar;
