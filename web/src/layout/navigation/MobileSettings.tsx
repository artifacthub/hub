import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useCallback, useContext, useState } from 'react';
import { FaCog, FaStar, FaUserCircle } from 'react-icons/fa';
import { GoThreeBars } from 'react-icons/go';
import { Link } from 'react-router-dom';

import { AppCtx } from '../../context/AppCtx';
import Image from '../common/Image';
import Sidebar from '../common/Sidebar';
import LogOut from './LogOut';
import styles from './MobileSettings.module.css';
import ThemeMode from './ThemeMode';

interface Props {
  setOpenSignUp: (status: boolean) => void;
  setOpenLogIn: (status: boolean) => void;
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

  const onOpenStatusChange = useCallback((status: boolean) => setOpenSideBarStatus(status), []);

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
          onOpenStatusChange={onOpenStatusChange}
        >
          <>
            {!isUndefined(ctx.user) && (
              <>
                {!isNull(ctx.user) ? (
                  <>
                    <ThemeMode onSelection={() => setOpenSideBarStatus(false)} />

                    <div className="dropdown-divider my-3" />

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

                    <button
                      className="dropdown-item my-2"
                      onClick={() => {
                        setOpenSideBarStatus(false);
                        props.setOpenLogIn(true);
                      }}
                    >
                      Sign in
                    </button>

                    <button
                      className="dropdown-item my-2"
                      onClick={() => {
                        setOpenSideBarStatus(false);
                        props.setOpenSignUp(true);
                      }}
                    >
                      Sign up
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

export default React.memo(MobileSettings);
