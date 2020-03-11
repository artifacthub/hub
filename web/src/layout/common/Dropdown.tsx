import React, { useState, useRef } from 'react';
import classnames from 'classnames';
import useOutsideClick from '../../hooks/useOutsideClick';
import styles from './Dropdown.module.css';

interface Props {
  children: JSX.Element | JSX.Element[];
  button: string;
  formAction?: () => void;
}

const Dropdown = (props: Props) => {
  const [openStatus, setOpenStatus] = useState(false);
  const ref = useRef(null);
  useOutsideClick([ref], openStatus, () => setOpenStatus(false));

  return (
    <>
      <button
        type="button"
        className={classnames(
          'btn font-weight-bold text-uppercase position-relative',
          styles.button,
          {[styles.active]: openStatus},
        )}
        onClick={() => setOpenStatus(true)}
      >
        {props.button}
      </button>

      <form ref={ref} className={classnames(
        'dropdown-menu p-4',
        styles.dropdown,
        {'show': openStatus},
      )}>
        {props.children}
      </form>
    </>
  );
}

export default Dropdown;
