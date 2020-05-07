import classnames from 'classnames';
import React, { useContext, useRef, useState } from 'react';
import { FaCaretDown, FaCog, FaStar, FaUser } from 'react-icons/fa';
import { MdNotificationsActive } from 'react-icons/md';
import { Link } from 'react-router-dom';

import { AppCtx } from '../../context/AppCtx';
import useOutsideClick from '../../hooks/useOutsideClick';
import LogOut from './LogOut';
import styles from './UserAuthDropdown.module.css';

interface Props {
  privateRoute?: boolean;
}

const UserAuthDropdown = (props: Props) => {
  const { ctx } = useContext(AppCtx);
  const [openStatus, setOpenStatus] = useState(false);
  const ref = useRef(null);
  useOutsideClick([ref], openStatus, () => setOpenStatus(false));

  return (
    <div className="btn-group">
      <button
        data-testid="userAuthBtn"
        className="btn p-0 position-relative"
        type="button"
        onClick={() => setOpenStatus(true)}
      >
        <div className="d-flex flex-row align-items-center justify-content-center">
          <div
            className={`rounded-circle d-flex align-items-center justify-content-center text-light ${styles.iconWrapper}`}
          >
            <FaUser className="rounded-circle" />
          </div>
          <small className="ml-1 text-light">
            <FaCaretDown />
          </small>
        </div>
      </button>

      <div ref={ref} className={classnames('dropdown-menu dropdown-menu-right', styles.dropdown, { show: openStatus })}>
        <div className={`arrow ${styles.arrow}`} />

        <p className={`mt-2 mb-0 ${styles.signedInText}`}>
          Signed in as <span className="font-weight-bold">{ctx.user!.alias}</span>
        </p>

        <div className="dropdown-divider my-3" />

        <Link
          data-testid="starredPackagesLink"
          className="dropdown-item"
          to={{
            pathname: '/user/packages/starred',
          }}
          onClick={() => setOpenStatus(false)}
        >
          <div className="d-flex align-items-center">
            <FaStar className="mr-2" />
            <div>Starred packages</div>
          </div>
        </Link>

        <Link
          data-testid="subscriptionsLink"
          className="dropdown-item"
          to={{
            pathname: '/user/subscriptions',
          }}
          onClick={() => setOpenStatus(false)}
        >
          <div className="d-flex align-items-center">
            <MdNotificationsActive className="mr-2" />
            <div>Subscriptions</div>
          </div>
        </Link>

        <Link
          data-testid="controlPanelLink"
          className="dropdown-item"
          to={{
            pathname: '/control-panel',
          }}
          onClick={() => setOpenStatus(false)}
        >
          <div className="d-flex align-items-center">
            <FaCog className="mr-2" />
            <div>Control Panel</div>
          </div>
        </Link>

        <LogOut className="mb-2" onSuccess={() => setOpenStatus(false)} privateRoute={props.privateRoute} />
      </div>
    </div>
  );
};

export default UserAuthDropdown;
