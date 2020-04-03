import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useContext, useEffect, useState } from 'react';
import { FaStar } from 'react-icons/fa';

import { API } from '../../api';
import { AppCtx } from '../../context/AppCtx';
import alertDispatcher from '../../utils/alertDispatcher';
import prettifyNumber from '../../utils/prettifyNumber';
import styles from './StarButton.module.css';

interface Props {
  packageId: string;
  stars: number;
  starredByUser?: boolean;
  onSuccess: () => void;
}

const StarButton = (props: Props) => {
  const { ctx } = useContext(AppCtx);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(!isUndefined(ctx.user) && !isNull(ctx.user));
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const newLoggedInStatus = !isUndefined(ctx.user) && !isNull(ctx.user);
    if (isLoggedIn !== newLoggedInStatus) {
      setIsLoggedIn(newLoggedInStatus);
      if (newLoggedInStatus) {
        props.onSuccess();
      }
    }
  }, [ctx.user, props, isLoggedIn, setIsLoggedIn]);

  async function handleToggleStar() {
    try {
      setIsSending(true);
      await API.toggleStar(props.packageId);
      props.onSuccess();
      setIsSending(false);
    } catch {
      setIsSending(false);
      alertDispatcher.postAlert({
        type: 'danger',
        message: `An error occurred ${
          !isLoggedIn || (isLoggedIn && !isUndefined(props.starredByUser) && !props.starredByUser)
            ? 'staring'
            : 'unstaring'
        } the package, please try again later`,
      });
    }
  }

  return (
    <div className={`d-flex flex-row align-items-center ${styles.wrapper}`}>
      <button
        className={`btn btn-sm btn-primary px-3 ${styles.starBtn}`}
        type="button"
        disabled={!isLoggedIn}
        onClick={handleToggleStar}
      >
        <div className="d-flex align-items-center">
          <FaStar className="mr-2" />
          {!isLoggedIn || (isLoggedIn && !isUndefined(props.starredByUser) && !props.starredByUser) ? 'Star' : 'Unstar'}
        </div>
      </button>

      <span className={`badge badge-light text-center px-3 ${styles.starBadge}`}>{prettifyNumber(props.stars)}</span>

      {!isLoggedIn && (
        <div className={`tooltip bs-tooltip-bottom ${styles.tooltip}`} role="tooltip">
          <div className={`arrow ${styles.tooltipArrow}`}></div>
          <div className="tooltip-inner">You must be signed in to star a package</div>
        </div>
      )}

      {isSending && (
        <div className={`position-absolute ${styles.spinner}`}>
          <span className="spinner-border spinner-border-sm text-primary" />
        </div>
      )}
    </div>
  );
};

export default StarButton;
