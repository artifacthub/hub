import React, { useState, useRef } from 'react';
import classnames from 'classnames';
import { TiUser } from 'react-icons/ti';
import useOutsideClick from '../../hooks/useOutsideClick';

const Login = () => {
  const [openStatus, setOpenStatus] = useState(false);
  const ref = useRef(null);
  useOutsideClick([ref], (event: MouseEvent) => setOpenStatus(false));

  return (
    <>
      <button
        type="button"
        className="btn btn-outline-light btn-sm rounded-pill d-flex align-items-center text-uppercase"
        onClick={() => setOpenStatus(true)}
      >
        <TiUser className="mr-2" />
        Login
      </button>

      <form ref={ref} className={classnames(
        'dropdown-menu dropdown-menu-right p-4',
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
        <button type="submit" className="btn btn-primary">Sign in</button>
      </form>
    </>
  );
}

export default Login;
