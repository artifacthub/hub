import React, { useState, } from 'react';
import classnames from 'classnames';
import { GoThreeBars } from 'react-icons/go';
import { FaUserCircle } from 'react-icons/fa';
import isNull from 'lodash/isNull';
import { UserAuth } from '../../types';
import LogOut from './LogOut';
import styles from './MobileSettings.module.css';
import Sidebar from '../common/Sidebar';

interface Props {
  setOpenSignUp: React.Dispatch<React.SetStateAction<boolean>>;
  setOpenLogIn: React.Dispatch<React.SetStateAction<boolean>>;
  isAuth: null | UserAuth;
  setIsAuth: React.Dispatch<React.SetStateAction<UserAuth | null>>;
}

const MobileSettings = (props: Props) => {
  const [openSideBarStatus, setOpenSideBarStatus] = useState(false);

  return (
    <div className={`btn-group navbar-toggler ${styles.navbarToggler}`}>
      {isNull(props.isAuth) ? (
        <div className="spinner-grow spinner-grow-sm text-light" role="status">
          <span className="sr-only">Loading...</span>
        </div>
      ) : (
        <Sidebar
          className="d-inline-block d-md-none mr-2"
          buttonType="position-relative btn text-secondary pr-0 pl-3"
          buttonIcon={(
            <div className={classnames(
              'rounded-circle d-flex align-items-center justify-content-center',
              styles.iconWrapper,
              {'iconWrapperGeneral': props.isAuth.status},
            )}>
              {props.isAuth.status ? (
                <FaUserCircle />
              ) : (
                <GoThreeBars />
              )}
            </div>
          )}
          direction="right"
          header={(
            <>
              {props.isAuth.status && (
                <div className="h6 mb-0">Signed in as <span className="font-weight-bold">{props.isAuth.alias}</span></div>
              )}
            </>
          )}
          open={openSideBarStatus}
          onOpenStatusChange={(status: boolean) => setOpenSideBarStatus(status)}
        >
          <>
            {!isNull(props.isAuth) && (
              <>
                {props.isAuth.status ? (
                  <LogOut
                    setIsAuth={props.setIsAuth}
                    onSuccess={() => setOpenSideBarStatus(false)}
                  />
                ) : (
                  <>
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setOpenSideBarStatus(false);
                        props.setOpenLogIn(true);
                      }}
                    >
                      Sign in
                    </button>

                    <button
                      className="dropdown-item"
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
}

export default MobileSettings;
