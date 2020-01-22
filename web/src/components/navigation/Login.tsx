import React, { useState, useRef } from 'react';
import classnames from 'classnames';
import useOutsideClick from '../../hooks/useOutsideClick';
import styles from './Login.module.css';

const Login = () => {
  const [openStatus, setOpenStatus] = useState(false);
  const ref = useRef(null);
  useOutsideClick([ref], (event: MouseEvent) => setOpenStatus(false));

  return (
    <>
      <button
        type="button"
        className={classnames(
          'btn font-weight-bold pr-0 pl-0 text-uppercase position-relative text-nowrap',
          styles.button,
          {[styles.active]: openStatus},
        )}
        data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"
        onClick={() => setOpenStatus(true)}
      >
        Log in
      </button>

      <form ref={ref} className={classnames(
        'dropdown-menu dropdown-menu-right p-4',
        styles.dropdown,
        {'show': openStatus},
      )}>
        <div className="form-group">
          <label htmlFor="email">Email address</label>
          <input type="email" className="form-control" id="email" placeholder="email@example.com" />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input type="password" className="form-control" id="password" placeholder="Password" />
        </div>

        <div className="form-group">
          <div className="form-check">
            <input type="checkbox" className="form-check-input" id="rememberMe" />
            <label className="form-check-label" htmlFor="rememberMe">
              Remember me
            </label>
          </div>
        </div>

        <div className="text-right">
          <button type="submit" className="btn btn-secondary">Log in</button>
        </div>
      </form>
    </>
  );
}

export default Login;
