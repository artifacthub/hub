import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useContext, useEffect, useState } from 'react';
import { FaRegStar, FaStar } from 'react-icons/fa';

import { API } from '../../api';
import { AppCtx } from '../../context/AppCtx';
import alertDispatcher from '../../utils/alertDispatcher';
import prettifyNumber from '../../utils/prettifyNumber';
import styles from './StarButton.module.css';

interface Props {
  packageId: string;
  stars: number;
  onSuccess: () => void;
  mobileVersion?: boolean;
}

const StarButton = (props: Props) => {
  const { ctx } = useContext(AppCtx);
  const [starredByUser, setStarredByUser] = useState<boolean | undefined>(undefined);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(!isUndefined(ctx.user) && !isNull(ctx.user));
  const [isSending, setIsSending] = useState(false);
  const [isGettingIfStarred, setIsGettingIfStarred] = useState<boolean | undefined>(undefined);

  async function fetchStarredByUser() {
    try {
      await API.starredByUser(props.packageId);
      setStarredByUser(true);
      setIsGettingIfStarred(false);
    } catch {
      setStarredByUser(false);
      setIsGettingIfStarred(false);
    }
  }

  useEffect(() => {
    if (isLoggedIn && isUndefined(starredByUser)) {
      fetchStarredByUser();
    }
  }, [isLoggedIn]); /* eslint-disable-line react-hooks/exhaustive-deps */

  useEffect(() => {
    const newLoggedInStatus = !isUndefined(ctx.user) && !isNull(ctx.user);
    if (isLoggedIn !== newLoggedInStatus) {
      setIsLoggedIn(newLoggedInStatus);
      fetchStarredByUser();
      if (newLoggedInStatus) {
        props.onSuccess();
      }
    }
  }, [ctx.user, props, isLoggedIn, setIsLoggedIn]); /* eslint-disable-line react-hooks/exhaustive-deps */

  async function handleToggleStar() {
    try {
      setIsSending(true);
      await API.toggleStar(props.packageId);
      props.onSuccess();
      setStarredByUser(!starredByUser);
      setIsSending(false);
    } catch {
      setIsSending(false);
      alertDispatcher.postAlert({
        type: 'danger',
        message: `An error occurred ${
          !isLoggedIn || (isLoggedIn && !isUndefined(starredByUser) && !starredByUser) ? 'staring' : 'unstaring'
        } the package, please try again later`,
      });
    }
  }

  return (
    <div className={`d-flex flex-row align-items-center ${styles.wrapper}`}>
      <button
        data-testid="toggleStarBtn"
        className={`btn btn-sm btn-primary px-3 ${styles.starBtn}`}
        type="button"
        disabled={!isLoggedIn || isGettingIfStarred}
        onClick={handleToggleStar}
      >
        <div className="d-flex align-items-center">
          {isGettingIfStarred ? (
            <span className="spinner-border spinner-border-sm text-ligth" role="status" />
          ) : (
            <>
              {!isLoggedIn || (isLoggedIn && !isUndefined(starredByUser) && !starredByUser) ? (
                <FaStar />
              ) : (
                <FaRegStar />
              )}
              <span className="d-none d-md-inline ml-2">
                {!isLoggedIn || (isLoggedIn && !isUndefined(starredByUser) && !starredByUser) ? 'Star' : 'Unstar'}
              </span>
            </>
          )}
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
        <div className={`position-absolute ${styles.spinner}`} role="status">
          <span className="spinner-border spinner-border-sm text-primary" />
        </div>
      )}
    </div>
  );
};

export default StarButton;
