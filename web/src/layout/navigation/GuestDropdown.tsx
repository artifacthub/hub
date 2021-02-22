import classnames from 'classnames';
import React, { useRef, useState } from 'react';
import { FaCaretDown, FaCog } from 'react-icons/fa';

import useOutsideClick from '../../hooks/useOutsideClick';
import styles from './GuestDropdown.module.css';
import ThemeMode from './ThemeMode';

const GuestDropdown = () => {
  const [openStatus, setOpenStatus] = useState(false);
  const ref = useRef(null);
  useOutsideClick([ref], openStatus, () => setOpenStatus(false));

  return (
    <div className="btn-group">
      <button
        data-testid="guestDropdownBtn"
        className={`btn p-0 position-relative ${styles.btn}`}
        type="button"
        onClick={() => setOpenStatus(true)}
      >
        <div className="d-flex flex-row align-items-center justify-content-center">
          <div
            className={classnames(
              'rounded-circle d-flex align-items-center justify-content-center textLight',
              styles.imageWrapper,
              styles.iconWrapper
            )}
          >
            <FaCog data-testid="settingsIcon" className="rounded-circle" />
          </div>
          <small className="ml-1 textLight">
            <FaCaretDown />
          </small>
        </div>
      </button>

      <div
        data-testid="guestDropdown"
        ref={ref}
        className={classnames('dropdown-menu dropdown-menu-right', styles.dropdown, { show: openStatus })}
      >
        <div className={`arrow ${styles.arrow}`} />

        <div className="my-3">
          <ThemeMode onSelection={() => setOpenStatus(false)} />
        </div>
      </div>
    </div>
  );
};

export default GuestDropdown;
