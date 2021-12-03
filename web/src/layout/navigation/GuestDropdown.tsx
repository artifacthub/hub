import classnames from 'classnames';
import { useRef, useState } from 'react';
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
        className={`btn p-0 position-relative ${styles.btn}`}
        type="button"
        onClick={() => setOpenStatus(true)}
        aria-label="Guest dropdown button"
        aria-expanded={openStatus}
      >
        <div className="d-flex flex-row align-items-center justify-content-center">
          <div
            className={classnames(
              'rounded-circle d-flex align-items-center justify-content-center textLight border border-2 overflow-hidden lh-1 fs-5',
              styles.imageWrapper,
              styles.iconWrapper
            )}
          >
            <FaCog data-testid="settingsIcon" className="rounded-circle" />
          </div>
          <small className="ms-1 textLight">
            <FaCaretDown />
          </small>
        </div>
      </button>

      <div
        role="menu"
        ref={ref}
        className={classnames('dropdown-menu dropdown-menu-end', styles.dropdown, { show: openStatus })}
      >
        <div className={`dropdown-arrow ${styles.arrow}`} />

        <div className="my-3">
          <ThemeMode device="desktop" onSelection={() => setOpenStatus(false)} />
        </div>
      </div>
    </div>
  );
};

export default GuestDropdown;
