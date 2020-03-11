import React, { useState, useRef } from 'react';
import classnames from 'classnames';
import { TiUser } from 'react-icons/ti';
import useOutsideClick from '../../hooks/useOutsideClick';
import styles from './MobileSettings.module.css';

interface Props {
  setOpenSignUp: React.Dispatch<React.SetStateAction<boolean>>;
}

const MobileSettings = (props: Props) => {
  const [openStatus, setOpenStatus] = useState(false);
  const ref = useRef(null);
  useOutsideClick([ref], openStatus, () => setOpenStatus(false));

  return (
    <div className="btn-group dropleft">
      <button
        className={`navbar-toggler btn rounded-circle p-0 position-relative ${styles.btnSettings}`}
        type="button"
        onClick={() => setOpenStatus(true)}
      >
        <TiUser />
      </button>

      <div ref={ref} className={classnames(
        'dropdown-menu',
        styles.dropdown,
        {'show': openStatus},
      )}>
        <button
          className="dropdown-item"
          onClick={() => props.setOpenSignUp(true)}
        >
          Sign Up
        </button>

        <button
          className="dropdown-item"
          onClick={() => setOpenStatus(false)}
        >
          Login
        </button>
      </div>
    </div>
  );
}

export default MobileSettings;
