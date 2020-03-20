import classnames from 'classnames';
import React, { useRef, useState } from 'react';
import { FaCaretDown, FaUserCircle } from 'react-icons/fa';
import { Link } from 'react-router-dom';

import useOutsideClick from '../../hooks/useOutsideClick';
import { UserAuth } from '../../types';
import LogOut from './LogOut';
import styles from './UserAuthDropdown.module.css';

interface Props {
  alias: string;
  setIsAuth: React.Dispatch<React.SetStateAction<UserAuth | null>>;
  privateRoute?: boolean;
}

const UserAuthDropdown = (props: Props) => {
  const [openStatus, setOpenStatus] = useState(false);
  const ref = useRef(null);
  useOutsideClick([ref], openStatus, () => setOpenStatus(false));

  return (
    <div className="btn-group">
      <button className="btn p-0 position-relative" type="button" onClick={() => setOpenStatus(true)}>
        <div className="d-flex flex-row align-items-center">
          <div
            className={`rounded-circle d-flex align-items-center justify-content-center text-secondary ${styles.iconWrapper}`}
          >
            <FaUserCircle />
          </div>
          <small className="ml-1 text-light">
            <FaCaretDown />
          </small>
        </div>
      </button>

      <div ref={ref} className={classnames('dropdown-menu dropdown-menu-right', styles.dropdown, { show: openStatus })}>
        <div className={`arrow ${styles.arrow}`} />

        <p className={`mt-2 mb-0 ${styles.signedInText}`}>
          Signed in as <span className="font-weight-bold">{props.alias}</span>
        </p>

        <div className="dropdown-divider my-3" />

        <Link
          className="dropdown-item"
          to={{
            pathname: '/admin',
          }}
          onClick={() => setOpenStatus(false)}
        >
          My packages
        </Link>

        <LogOut
          className="mb-2"
          setIsAuth={props.setIsAuth}
          onSuccess={() => setOpenStatus(false)}
          privateRoute={props.privateRoute}
        />
      </div>
    </div>
  );
};

export default UserAuthDropdown;
