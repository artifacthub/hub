import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { useContext, useEffect, useRef, useState } from 'react';
import { FaRegCheckCircle, FaRegCircle } from 'react-icons/fa';
import { MdNotificationsActive, MdNotificationsOff } from 'react-icons/md';
import { useLocation, useNavigate } from 'react-router';

import API from '../../api';
import { AppCtx, signOut } from '../../context/AppCtx';
import useOutsideClick from '../../hooks/useOutsideClick';
import { ErrorKind, EventKind, Subscription } from '../../types';
import alertDispatcher from '../../utils/alertDispatcher';
import { PACKAGE_SUBSCRIPTIONS_LIST, SubscriptionItem } from '../../utils/data';
import ElementWithTooltip from '../common/ElementWithTooltip';
import Loading from '../common/Loading';
import styles from './SubscriptionsButton.module.css';

interface Props {
  packageId: string;
}

const SubscriptionsButton = (props: Props) => {
  const { ctx, dispatch } = useContext(AppCtx);
  const navigate = useNavigate();
  const location = useLocation();
  const [openStatus, setOpenStatus] = useState(false);
  const [activeSubscriptions, setActiveSubscriptions] = useState<Subscription[] | undefined | null>(undefined);
  const [isLoading, setIsLoading] = useState<boolean | null>(null);
  const [activePkgId, setActivePkgId] = useState(props.packageId);

  const ref = useRef(null);
  useOutsideClick([ref], openStatus, () => setOpenStatus(false));

  const getNotification = (kind: EventKind): SubscriptionItem | undefined => {
    const notif = PACKAGE_SUBSCRIPTIONS_LIST.find((subs: SubscriptionItem) => subs.kind === kind);
    return notif;
  };

  const updateOptimisticallyActiveSubscriptions = (kind: EventKind, isActive: boolean) => {
    if (isActive) {
      setActiveSubscriptions(activeSubscriptions!.filter((subs) => subs.eventKind !== kind));
    } else {
      const newSubs = activeSubscriptions ? [...activeSubscriptions] : [];
      newSubs.push({ eventKind: kind });
      setActiveSubscriptions(newSubs);
    }
  };

  const isActiveNotification = (kind: EventKind): boolean => {
    let isActive = false;
    if (activeSubscriptions) {
      for (const activeSubs of activeSubscriptions) {
        if (activeSubs.eventKind === kind) {
          isActive = true;
          break;
        }
      }
    }

    return isActive;
  };

  async function getSubscriptions(visibleLoading: boolean = false) {
    if (isNull(ctx.user)) {
      setActiveSubscriptions(undefined);
    } else {
      try {
        if (visibleLoading) {
          setIsLoading(true);
        }
        setActivePkgId(props.packageId);
        setActiveSubscriptions(await API.getPackageSubscriptions(props.packageId));
        if (visibleLoading) {
          setIsLoading(false);
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        setActiveSubscriptions(null);

        if (visibleLoading) {
          setIsLoading(false);
          if (err.kind !== ErrorKind.Unauthorized) {
            alertDispatcher.postAlert({
              type: 'danger',
              message: 'An error occurred getting your subscriptions, please try again later.',
            });
          }
        } else {
          dispatch(signOut());
          navigate(`${location.pathname}?modal=login&redirect=${location.pathname}`);
        }
      }
    }
  }

  useEffect(() => {
    if (
      (!isUndefined(ctx.user) &&
        ((!isNull(ctx.user) && isUndefined(activeSubscriptions)) ||
          (isNull(ctx.user) && !isUndefined(activeSubscriptions)))) ||
      props.packageId !== activePkgId
    ) {
      getSubscriptions();
    }
  }, [ctx.user, props.packageId]);

  async function changeSubscription(kind: EventKind, isActive: boolean) {
    updateOptimisticallyActiveSubscriptions(kind, isActive);

    try {
      if (isActive) {
        await API.deleteSubscription(props.packageId, kind);
      } else {
        await API.addSubscription(props.packageId, kind);
      }
      // We don't need to get subscriptions after changing it due to we are closing the dropdown
      // and we get them again every time we open the dropdown
      setOpenStatus(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      if (err.kind !== ErrorKind.Unauthorized) {
        const notif = getNotification(kind);
        const title = !isUndefined(notif) ? notif.title : '';

        alertDispatcher.postAlert({
          type: 'danger',
          message: `An error occurred ${
            isActive ? 'unsubscribing from' : 'subscribing to'
          } ${title} notification, please try again later.`,
        });
        getSubscriptions(true); // Get subscriptions if changeSubscription fails
      }
    }
  }

  if (isUndefined(ctx.user)) {
    return null;
  }

  const isDisabled = isNull(ctx.user) || isNull(activeSubscriptions) || isUndefined(activeSubscriptions);

  return (
    <div className="d-none d-lg-block position-relative ms-2">
      <ElementWithTooltip
        active
        tooltipClassName={styles.tooltip}
        element={
          <button
            className={classnames(
              'btn btn-outline-primary p-0 position-relative lh-1 fs-5',
              styles.subsBtn,
              styles.iconWrapper,
              {
                disabled: isDisabled,
              }
            )}
            type="button"
            onClick={() => {
              if (!isDisabled) {
                getSubscriptions();
                setOpenStatus(true);
              }
            }}
            aria-label="Open subscriptions menu"
            aria-expanded={openStatus}
          >
            <div className="d-flex align-items-center justify-content-center">
              {isLoading && (
                <div className={styles.loading}>
                  <Loading noWrapper spinnerClassName={`position-absolute start-0 ${styles.spinner}`} />
                </div>
              )}
              {activeSubscriptions && activeSubscriptions.length > 0 ? (
                <MdNotificationsActive />
              ) : (
                <MdNotificationsOff className={`offNotifications ${styles.offNotifications}`} />
              )}
            </div>
          </button>
        }
        tooltipMessage="You must be signed in to subscribe to this package"
        visibleTooltip={isNull(ctx.user)}
      />

      <div
        ref={ref}
        role="menu"
        className={classnames('dropdown-menu dropdown-menu-end p-0', styles.dropdown, { show: openStatus })}
      >
        <div className={`dropdown-arrow ${styles.arrow}`} />

        {PACKAGE_SUBSCRIPTIONS_LIST.map((subs: SubscriptionItem) => {
          const isActive = isActiveNotification(subs.kind);
          return (
            <button
              className={classnames(styles.dropdownItem, 'dropdownItem btn p-3 rounded-0 w-100', {
                [`disabled ${styles.isDisabled}`]: !subs.enabled,
              })}
              onClick={() => changeSubscription(subs.kind, isActive)}
              key={`subs_${subs.kind}`}
              aria-label={`Change ${subs.title} subscription`}
            >
              <div className="d-flex flex-row align-items-center w-100 justify-content-between">
                <div className="me-3">
                  {isActive ? (
                    <FaRegCheckCircle className="text-success" data-testid="checkedSubsBtn" />
                  ) : (
                    <FaRegCircle data-testid="uncheckedSubsBtn" />
                  )}
                </div>
                <div className="d-flex flex-column flex-grow-1">
                  <div className="h6 mb-2 d-flex flex-row align-items-center">
                    {subs.icon}
                    <span className="ms-2">{subs.title}</span>
                  </div>
                  <small className="text-muted text-start">
                    {subs.description}
                    {!subs.enabled && (
                      <i>
                        <br />
                        (Coming soon)
                      </i>
                    )}
                  </small>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SubscriptionsButton;
