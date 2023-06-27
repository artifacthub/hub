import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { Dispatch, SetStateAction, useContext, useState } from 'react';
import { FaCog, FaEdit, FaSignInAlt, FaStar, FaUserCircle } from 'react-icons/fa';
import { HiChartSquareBar } from 'react-icons/hi';
import { ImBooks } from 'react-icons/im';
import { VscThreeBars } from 'react-icons/vsc';
import { Link } from 'react-router-dom';

import { AppCtx } from '../../context/AppCtx';
import getMetaTag from '../../utils/getMetaTag';
import ExternalLink from '../common/ExternalLink';
import Image from '../common/Image';
import Sidebar from '../common/Sidebar';
import LogOut from './LogOut';
import styles from './MobileSettings.module.css';
import ThemeMode from './ThemeMode';

interface Props {
  setOpenSignUp: Dispatch<SetStateAction<boolean>>;
  setOpenLogIn: Dispatch<SetStateAction<boolean>>;
  privateRoute?: boolean;
}

const MobileSettings = (props: Props) => {
  const { ctx } = useContext(AppCtx);
  const [openSideBarStatus, setOpenSideBarStatus] = useState(false);

  const allowUserSignUp: boolean = getMetaTag('allowUserSignUp', true);

  const getSidebarIcon = (): JSX.Element => {
    if (ctx.user) {
      if (ctx.user.profileImageId) {
        return (
          <Image
            imageId={ctx.user.profileImageId}
            alt="User profile"
            className={`rounded-circle mw-100 mh-100 h-auto border border-2 ${styles.profileImage}`}
            placeholderIcon={<FaUserCircle />}
          />
        );
      } else {
        return <FaUserCircle />;
      }
    } else {
      return <VscThreeBars />;
    }
  };

  return (
    <div className={`btn-group navbar-toggler pe-0 ms-auto border-0 fs-6 bg-transparent ${styles.navbarToggler}`}>
      {isUndefined(ctx.user) ? (
        <div className="spinner-grow spinner-grow-sm textLight pt-2" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      ) : (
        <Sidebar
          label="User settings"
          className="d-inline-block d-lg-none"
          buttonType="position-relative btn text-secondary pe-0 ps-3"
          buttonIcon={
            <div
              className={classnames(
                'rounded-circle d-flex align-items-center justify-content-center lh-1 bg-white',
                styles.iconWrapper
              )}
            >
              {getSidebarIcon()}
            </div>
          }
          direction="right"
          header={
            <>
              {!isNull(ctx.user) && (
                <div className="h6 mb-0 text-dark flex-grow-1">
                  Signed in as <span className="fw-bold">{ctx.user.alias}</span>
                </div>
              )}
            </>
          }
          open={openSideBarStatus}
          onOpenStatusChange={(status: boolean) => setOpenSideBarStatus(status)}
        >
          <>
            {!isUndefined(ctx.user) && (
              <>
                {!isNull(ctx.user) ? (
                  <>
                    <ThemeMode device="mobile" onSelection={() => setOpenSideBarStatus(false)} />

                    <div className="dropdown-divider my-3" />

                    <ExternalLink className="dropdown-item my-2" href="/docs" label="Open documentation" target="_self">
                      <div className="d-flex align-items-center">
                        <ImBooks className="me-2" />
                        <div>Documentation</div>
                      </div>
                    </ExternalLink>

                    <Link
                      className="dropdown-item my-2"
                      onClick={() => {
                        setOpenSideBarStatus(false);
                      }}
                      to={{
                        pathname: '/stats',
                      }}
                    >
                      <div className="d-flex align-items-center">
                        <HiChartSquareBar className="me-2" />
                        <div>Stats</div>
                      </div>
                    </Link>

                    <Link
                      className="dropdown-item my-2"
                      to={{
                        pathname: '/packages/starred',
                      }}
                      onClick={() => setOpenSideBarStatus(false)}
                    >
                      <div className="d-flex align-items-center">
                        <FaStar className="me-2" />
                        <div>Starred packages</div>
                      </div>
                    </Link>

                    <Link
                      className="dropdown-item my-2"
                      to={{
                        pathname: '/control-panel',
                      }}
                      onClick={() => setOpenSideBarStatus(false)}
                    >
                      <div className="d-flex align-items-center">
                        <FaCog className="me-2" />
                        <div>Control Panel</div>
                      </div>
                    </Link>

                    <LogOut
                      className="my-2"
                      onSuccess={() => setOpenSideBarStatus(false)}
                      privateRoute={props.privateRoute}
                    />
                  </>
                ) : (
                  <>
                    <ThemeMode device="mobile" onSelection={() => setOpenSideBarStatus(false)} />

                    <div className="dropdown-divider my-3" />

                    <ExternalLink className="dropdown-item my-2" href="/docs" label="Open documentation" target="_self">
                      <div className="d-flex align-items-center">
                        <ImBooks className="me-2" />
                        <div>Documentation</div>
                      </div>
                    </ExternalLink>

                    <Link
                      className="dropdown-item my-2"
                      onClick={() => {
                        setOpenSideBarStatus(false);
                      }}
                      to={{
                        pathname: '/stats',
                      }}
                    >
                      <div className="d-flex align-items-center">
                        <HiChartSquareBar className="me-2" />
                        <div>Stats</div>
                      </div>
                    </Link>

                    <button
                      className="dropdown-item my-2"
                      onClick={() => {
                        setOpenSideBarStatus(false);
                        props.setOpenLogIn(true);
                      }}
                      aria-label="Open sign in modal"
                    >
                      <div className="d-flex align-items-center">
                        <FaSignInAlt className="me-2" />
                        <div>Sign in</div>
                      </div>
                    </button>

                    {allowUserSignUp && (
                      <button
                        className="dropdown-item my-2"
                        onClick={() => {
                          setOpenSideBarStatus(false);
                          props.setOpenSignUp(true);
                        }}
                        aria-label="Open sign up modal"
                      >
                        <div className="d-flex align-items-center">
                          <FaEdit className="me-2" />
                          <div>Sign up</div>
                        </div>
                      </button>
                    )}
                  </>
                )}
              </>
            )}
          </>
        </Sidebar>
      )}
    </div>
  );
};

export default MobileSettings;
