import { isNumber } from 'lodash';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useContext, useEffect, useState } from 'react';
import { FaRegStar, FaStar } from 'react-icons/fa';

import { API } from '../../api';
import { AppCtx, signOut } from '../../context/AppCtx';
import { ErrorKind, PackageStars } from '../../types';
import alertDispatcher from '../../utils/alertDispatcher';
import prettifyNumber from '../../utils/prettifyNumber';
import StarBadge from '../common/StarBadge';
import styles from './StarButton.module.css';

interface Props {
  packageId: string;
}

const StarButton = (props: Props) => {
  const { ctx, dispatch } = useContext(AppCtx);
  const [packageStars, setPackageStars] = useState<PackageStars | undefined | null>(undefined);
  const [isSending, setIsSending] = useState(false);
  const [isGettingIfStarred, setIsGettingIfStarred] = useState<boolean | undefined>(undefined);
  const [pkgId, setPkgId] = useState<string>(props.packageId);

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
      let errMessage = `An error occurred ${
        notStarred ? 'starring' : 'unstarring'
      } the package, please try again later.`;
      setIsSending(false);

      // On unauthorized, we force sign out
      if (err.kind === ErrorKind.Unauthorized) {
        errMessage = `You must be signed in to ${notStarred ? 'star' : 'unstar'} a package`;
        dispatch(signOut());
      }

      alertDispatcher.postAlert({
        type: 'danger',
        message: errMessage,
      });
    }
  }

  if (isUndefined(ctx.user) || isUndefined(packageStars) || isNull(packageStars)) return null;

  return (
    <>
      <StarBadge className="d-inline d-md-none" starsNumber={packageStars.stars} />

      <div className={`d-none d-md-flex flex-row align-items-center position-relative ${styles.wrapper}`}>
        <button
          data-testid="toggleStarBtn"
          className={`btn btn-sm btn-primary px-3 ${styles.starBtn}`}
          type="button"
          disabled={isUndefined(ctx.user) || isNull(ctx.user) || isGettingIfStarred}
          onClick={handleToggleStar}
        >
          <div className="d-flex align-items-center">
            {notStarred ? <FaRegStar /> : <FaStar />}
            <span className="ml-2">{notStarred ? 'Star' : 'Unstar'}</span>
          </div>
        </button>

        <span className={`badge badge-light text-center px-3 ${styles.starBadge}`}>
          {isNumber(packageStars.stars) ? prettifyNumber(packageStars.stars) : '-'}
        </span>

        {isNull(ctx.user) && (
          <div className={`tooltip bs-tooltip-bottom ${styles.tooltip}`} role="tooltip">
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
