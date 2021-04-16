import classnames from 'classnames';
import { isNumber } from 'lodash';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useContext, useEffect, useState } from 'react';
import { FaRegStar, FaStar } from 'react-icons/fa';
import { useHistory } from 'react-router';

import { API } from '../../api';
import { AppCtx, signOut } from '../../context/AppCtx';
import useBreakpointDetect from '../../hooks/useBreakpointDetect';
import { ErrorKind, PackageStars } from '../../types';
import alertDispatcher from '../../utils/alertDispatcher';
import prettifyNumber from '../../utils/prettifyNumber';
import styles from './StarButton.module.css';

interface Props {
  packageId: string;
}

const StarButton = (props: Props) => {
  const { ctx, dispatch } = useContext(AppCtx);
  const history = useHistory();
  const [packageStars, setPackageStars] = useState<PackageStars | undefined | null>(undefined);
  const [isSending, setIsSending] = useState(false);
  const [isGettingIfStarred, setIsGettingIfStarred] = useState<boolean | undefined>(undefined);
  const [pkgId, setPkgId] = useState<string>(props.packageId);
  const point = useBreakpointDetect();
  const notLoginUser = isUndefined(ctx.user) || isNull(ctx.user);
  const [enabledTooltip, setEnabledTooltip] = useState<boolean>(false);

  async function getPackageStars() {
    try {
      setIsGettingIfStarred(true);
      setPackageStars(await API.getStars(props.packageId));
      setIsGettingIfStarred(false);
    } catch {
      setPackageStars(null);
      setIsGettingIfStarred(false);
    }
  }

  useEffect(() => {
    if (
      (!isUndefined(ctx.user) &&
        (isUndefined(packageStars) ||
          (!isNull(ctx.user) && isUndefined(packageStars!.starredByUser)) ||
          (isNull(ctx.user) && packageStars!.starredByUser))) ||
      props.packageId !== pkgId
    ) {
      setPkgId(props.packageId);
      getPackageStars();
    }
  }, [ctx.user, props.packageId]); /* eslint-disable-line react-hooks/exhaustive-deps */

  const notStarred =
    !isUndefined(ctx.user) &&
    (isNull(ctx.user) ||
      (!isNull(ctx.user) &&
        !isUndefined(packageStars) &&
        !isNull(packageStars) &&
        !isUndefined(packageStars.starredByUser) &&
        !packageStars.starredByUser));

  async function handleToggleStar() {
    try {
      setIsSending(true);
      await API.toggleStar(props.packageId);
      getPackageStars();
      setIsSending(false);
    } catch (err) {
      setIsSending(false);

      // On unauthorized, we force sign out
      if (err.kind === ErrorKind.Unauthorized) {
        dispatch(signOut());
        history.push(`${window.location.pathname}?modal=login&redirect=${window.location.pathname}`);
      } else {
        let errMessage = `An error occurred ${
          notStarred ? 'starring' : 'unstarring'
        } the package, please try again later.`;
        alertDispatcher.postAlert({
          type: 'danger',
          message: errMessage,
        });
      }
    }
  }

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (enabledTooltip) {
      // Hide tooltip after 2s
      timeout = setTimeout(() => setEnabledTooltip(false), 2 * 1000);
    }

    return () => {
      if (!isUndefined(timeout)) {
        clearTimeout(timeout);
      }
    };
  }, [enabledTooltip]);

  if (isUndefined(ctx.user) || isUndefined(packageStars) || isNull(packageStars)) return null;

  return (
    <>
      <div className={`ml-auto d-flex flex-row align-items-center position-relative ${styles.wrapper}`}>
        <button
          data-testid="toggleStarBtn"
          className={classnames('btn btn-sm btn-primary px-1 px-md-3', styles.starBtn, {
            [`disabled ${styles.disabled}`]: notLoginUser,
          })}
          type="button"
          disabled={isGettingIfStarred}
          onClick={() => {
            if (notLoginUser) {
              if ([point && 'xs', 'sm'].includes(point)) {
                setEnabledTooltip(true);
              }
            } else {
              handleToggleStar();
            }
          }}
        >
          <div className="d-flex align-items-center">
            {notStarred ? <FaRegStar className={styles.icon} /> : <FaStar className={styles.icon} />}
            <span className="ml-2">{notStarred ? 'Star' : 'Unstar'}</span>
          </div>
        </button>

        <span className={`badge badge-light text-center px-3 ${styles.starBadge}`}>
          {isNumber(packageStars.stars) ? prettifyNumber(packageStars.stars) : '-'}
        </span>

        {isNull(ctx.user) && (
          <div
            className={classnames('tooltip bs-tooltip-bottom', styles.tooltip, {
              [styles.visibleTooltip]: enabledTooltip,
            })}
            role="tooltip"
          >
            <div className={`arrow ${styles.tooltipArrow}`}></div>
            <div className="tooltip-inner">You must be signed in to star a package</div>
          </div>
        )}

        {(isSending || isGettingIfStarred) && (
          <div className={`position-absolute ${styles.spinner}`} role="status">
            <span className="spinner-border spinner-border-sm text-primary" />
          </div>
        )}
      </div>
    </>
  );
};

export default StarButton;
