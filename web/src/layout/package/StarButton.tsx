import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isNumber from 'lodash/isNumber';
import isUndefined from 'lodash/isUndefined';
import { useContext, useEffect, useState } from 'react';
import { FaRegStar, FaStar } from 'react-icons/fa';
import { useLocation, useNavigate } from 'react-router';

import API from '../../api';
import { AppCtx, signOut } from '../../context/AppCtx';
import useBreakpointDetect from '../../hooks/useBreakpointDetect';
import { ErrorKind, PackageStars } from '../../types';
import alertDispatcher from '../../utils/alertDispatcher';
import prettifyNumber from '../../utils/prettifyNumber';
import ElementWithTooltip from '../common/ElementWithTooltip';
import Loading from '../common/Loading';
import styles from './StarButton.module.css';

interface Props {
  packageId: string;
}

const StarButton = (props: Props) => {
  const { ctx, dispatch } = useContext(AppCtx);
  const navigate = useNavigate();
  const location = useLocation();
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
  }, [ctx.user, props.packageId]);

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setIsSending(false);

      // On unauthorized, we force sign out
      if (err.kind === ErrorKind.Unauthorized) {
        dispatch(signOut());
        navigate(`${location.pathname}?modal=login&redirect=${location.pathname}`);
      } else {
        const errMessage = `An error occurred ${
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
      <div className={`ms-auto d-flex flex-row align-items-center position-relative ${styles.wrapper}`}>
        <ElementWithTooltip
          active
          className={styles.starBtnWrapper}
          element={
            <button
              className={classnames('btn btn-sm btn-primary px-1 px-md-3 position-relative starBtn', styles.starBtn, {
                [`disabled ${styles.disabled}`]: notLoginUser || isGettingIfStarred,
              })}
              type="button"
              onClick={() => {
                if (!isGettingIfStarred) {
                  if (notLoginUser) {
                    if ([point && 'xs', 'sm'].includes(point)) {
                      setEnabledTooltip(true);
                    }
                  } else {
                    handleToggleStar();
                  }
                }
              }}
              aria-label={`${notStarred ? 'Star' : 'Unstar'} package`}
            >
              <div className="d-flex align-items-center">
                {notStarred ? <FaRegStar className={styles.icon} /> : <FaStar className={styles.icon} />}
                <span className="ms-2">{notStarred ? 'Star' : 'Unstar'}</span>
              </div>
            </button>
          }
          tooltipMessage="You must be signed in to star a package"
          visibleTooltip={isNull(ctx.user)}
        />

        <span
          className={`badge bg-light text-dark text-center px-3 border border-1 border-start-0 lh-base ${styles.starBadge}`}
        >
          {isNumber(packageStars.stars) ? prettifyNumber(packageStars.stars) : '-'}
        </span>

        {(isSending || isGettingIfStarred) && (
          <Loading spinnerClassName={`position-absolute ${styles.spinner}`} noWrapper smallSize />
        )}
      </div>
    </>
  );
};

export default StarButton;
