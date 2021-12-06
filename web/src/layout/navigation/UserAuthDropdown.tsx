import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { useContext, useRef, useState } from 'react';
import { FaCaretDown, FaCog, FaStar, FaUser } from 'react-icons/fa';
import { Link } from 'react-router-dom';

import { AppCtx } from '../../context/AppCtx';
import useOutsideClick from '../../hooks/useOutsideClick';
import Image from '../common/Image';
import LogOut from './LogOut';
import ThemeMode from './ThemeMode';
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
        className={`btn p-0 position-relative ${styles.btn}`}
        type="button"
        onClick={() => setOpenStatus(true)}
        aria-label="Open menu"
      >
        <div className="d-flex flex-row align-items-center justify-content-center">
          <div
            className={classnames(
              'rounded-circle d-flex align-items-center justify-content-center textLight userAuth overflow-hidden position-relative border border-2 overflow-hidden lh-1 fs-5 bg-white',
              styles.imageWrapper,
              { [styles.iconWrapper]: isUndefined(ctx.user!.profileImageId) || isNull(ctx.user!.profileImageId) }
            )}
          >
            {ctx.user && ctx.user.profileImageId ? (
              <Image
                imageId={ctx.user.profileImageId}
                alt="User profile"
                className="mw-100 h-auto"
                classNameForSquare={`position-absolute top-0 start-0 w-100 h-100 ${styles.imageAsBg}`}
              />
            ) : (
              <FaUser data-testid="profileIcon" className="rounded-circle" />
            )}
          </div>
          <small className="ms-1 textLight">
            <FaCaretDown />
          </small>
        </div>
      </button>

      <div ref={ref} className={classnames('dropdown-menu dropdown-menu-end', styles.dropdown, { show: openStatus })}>
        <div className={`dropdown-arrow ${styles.arrow}`} />

        <p className={`mt-2 mb-0 text-break ${styles.signedInText}`}>
          Signed in as <span className="fw-bold">{ctx.user!.alias}</span>
        </p>

        <div className="dropdown-divider my-3" />

        <ThemeMode device="desktop" onSelection={() => setOpenStatus(false)} />

        <div className="dropdown-divider my-3" />

        <Link
          className="dropdown-item"
          to={{
            pathname: '/packages/starred',
          }}
          onClick={() => setOpenStatus(false)}
        >
          <div className="d-flex align-items-center">
            <FaStar className="me-2" />
            <div>Starred packages</div>
          </div>
        </Link>

        <Link
          className="dropdown-item"
          to={{
            pathname: '/control-panel',
          }}
          onClick={() => setOpenStatus(false)}
        >
          <div className="d-flex align-items-center">
            <FaCog className="me-2" />
            <div>Control Panel</div>
          </div>
        </Link>

        <LogOut className="mb-2" onSuccess={() => setOpenStatus(false)} privateRoute={props.privateRoute} />
      </div>
    </div>
  );
};

export default UserAuthDropdown;
