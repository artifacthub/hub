import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useContext, useEffect, useState } from 'react';
import { FaRegStar, FaStar } from 'react-icons/fa';

import { API } from '../../api';
import { AppCtx } from '../../context/AppCtx';
import { PackageStars } from '../../types';
import alertDispatcher from '../../utils/alertDispatcher';
import prettifyNumber from '../../utils/prettifyNumber';
import styles from './StarButton.module.css';

interface Props {
  packageId: string;
  mobileVersion?: boolean;
}

const StarButton = (props: Props) => {
  const { ctx } = useContext(AppCtx);
  const [packageStars, setPackageStars] = useState<PackageStars | undefined | null>(undefined);
  const [isSending, setIsSending] = useState(false);
  const [isGettingIfStarred, setIsGettingIfStarred] = useState<boolean | undefined>(undefined);

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
      !isUndefined(ctx.user) &&
      (isUndefined(packageStars) ||
        (!isNull(ctx.user) && isNull(packageStars!.starredByUser)) ||
        (isNull(ctx.user) && !isNull(packageStars!.starredByUser)))
    ) {
      getPackageStars();
    }
  }, [ctx.user]); /* eslint-disable-line react-hooks/exhaustive-deps */

  const notStarred =
    !isUndefined(ctx.user) &&
    (isNull(ctx.user) ||
      (!isNull(ctx.user) && !isUndefined(packageStars) && !isNull(packageStars) && !packageStars.starredByUser));

  async function handleToggleStar() {
    try {
      setIsSending(true);
      await API.toggleStar(props.packageId);
      getPackageStars();
      setIsSending(false);
    } catch {
      setIsSending(false);
      alertDispatcher.postAlert({
        type: 'danger',
        message: `An error occurred ${notStarred ? 'staring' : 'unstaring'} the package, please try again later`,
      });
    }
  }

  if (isUndefined(ctx.user) || isUndefined(packageStars) || isNull(packageStars)) return null;

  return (
    <div className={`d-flex flex-row align-items-center ${styles.wrapper}`}>
      <button
        data-testid="toggleStarBtn"
        className={`btn btn-sm btn-primary px-3 ${styles.starBtn}`}
        type="button"
        disabled={isUndefined(ctx.user) || isNull(ctx.user) || isGettingIfStarred}
        onClick={handleToggleStar}
      >
        <div className="d-flex align-items-center">
          {notStarred ? <FaStar /> : <FaRegStar />}
          <span className="d-none d-md-inline ml-2">{notStarred ? 'Star' : 'Unstar'}</span>
        </div>
      </button>

      <span className={`badge badge-light text-center px-3 ${styles.starBadge}`}>
        {isNull(packageStars.stars) ? '-' : prettifyNumber(packageStars.stars)}
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
  );
};

export default StarButton;
