import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useContext, useState } from 'react';
import { FaCog, FaEdit, FaSignInAlt, FaStar, FaUserCircle } from 'react-icons/fa';
import { GoThreeBars } from 'react-icons/go';
import { HiChartSquareBar } from 'react-icons/hi';
import { Link } from 'react-router-dom';

import { AppCtx } from '../../context/AppCtx';
import Image from '../common/Image';
import Sidebar from '../common/Sidebar';
import LogOut from './LogOut';
import styles from './MobileSettings.module.css';
import ThemeMode from './ThemeMode';

interface Props {
  setOpenSignUp: React.Dispatch<React.SetStateAction<boolean>>;
  setOpenLogIn: React.Dispatch<React.SetStateAction<boolean>>;
  privateRoute?: boolean;
}

const MobileSettings = (props: Props) => {
  const { ctx } = useContext(AppCtx);
  const [openSideBarStatus, setOpenSideBarStatus] = useState(false);

  const getSidebarIcon = (): JSX.Element => {
    if (ctx.user) {
      if (ctx.user.profileImageId) {
        return (
          <Image
            imageId={ctx.user.profileImageId}
            alt="User profile"
            className={`rounded-circle mw-100 mh-100 ${styles.profileImage}`}
            placeholderIcon={<FaUserCircle />}
          />
        );
      } else {
        return <FaUserCircle />;
      }
    } else {
      return <GoThreeBars />;
    }
  };

  return (
    <div className={`btn-group navbar-toggler pr-0 ml-auto ${styles.navbarToggler}`}>
      {isUndefined(ctx.user) ? (
        <div className="spinner-grow spinner-grow-sm textLight pt-2" role="status">
          <span className="sr-only">Loading...</span>
        </div>
      ) : (
        <Sidebar
          className="d-inline-block d-md-none"
          buttonType="position-relative btn text-secondary pr-0 pl-3"
          buttonIcon={
            <div
              className={classnames(
                'rounded-circle d-flex align-items-center justify-content-center',
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
                  Signed in as <span className="font-weight-bold">{ctx.user.alias}</span>
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
                    <ThemeMode onSelection={() => setOpenSideBarStatus(false)} />

                    <div className="dropdown-divider my-3" />

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
                        <HiChartSquareBar className="mr-2" />
                        <div>Stats</div>
                      </div>
                    </Link>

                    <Link
                      data-testid="starredPackagesLink"
                      className="dropdown-item my-2"
                      to={{
                        pathname: '/packages/starred',
                      }}
                      onClick={() => setOpenSideBarStatus(false)}
                    >
                      <div className="d-flex align-items-center">
                        <FaStar className="mr-2" />
                        <div>Starred packages</div>
                      </div>
                    </Link>

                    <Link
                      data-testid="controlPanelLink"
                      className="dropdown-item my-2"
                      to={{
                        pathname: '/control-panel',
                      }}
                      onClick={() => setOpenSideBarStatus(false)}
                    >
                      <div className="d-flex align-items-center">
                        <FaCog className="mr-2" />
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
                    <ThemeMode onSelection={() => setOpenSideBarStatus(false)} />

                    <div className="dropdown-divider my-3" />

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
                        <HiChartSquareBar className="mr-2" />
                        <div>Stats</div>
                      </div>
                    </Link>

                    <button
                      className="dropdown-item my-2"
                      onClick={() => {
                        setOpenSideBarStatus(false);
                        props.setOpenLogIn(true);
                      }}
                    >
                      <div className="d-flex align-items-center">
                        <FaSignInAlt className="mr-2" />
                        <div>Sign in</div>
                      </div>
                    </button>

                    <button
                      className="dropdown-item my-2"
                      onClick={() => {
                        setOpenSideBarStatus(false);
                        props.setOpenSignUp(true);
                      }}
                    >
                      <div className="d-flex align-items-center">
                        <FaEdit className="mr-2" />
                        <div>Sign up</div>
                      </div>
                    </button>
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
