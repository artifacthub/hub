import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { FaRegCheckCircle, FaRegCircle } from 'react-icons/fa';
import { MdNotificationsActive, MdNotificationsOff } from 'react-icons/md';
import { useHistory } from 'react-router';

import { API } from '../../api';
import { AppCtx, signOut } from '../../context/AppCtx';
import useOutsideClick from '../../hooks/useOutsideClick';
import { ErrorKind, EventKind, Subscription } from '../../types';
import alertDispatcher from '../../utils/alertDispatcher';
import { PACKAGE_SUBSCRIPTIONS_LIST, SubscriptionItem } from '../../utils/data';
import styles from './SubscriptionsButton.module.css';

interface Props {
  packageId: string;
}

const SubscriptionsButton = (props: Props) => {
  const { ctx, dispatch } = useContext(AppCtx);
  const history = useHistory();
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
      } catch (err) {
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
          history.push(`${window.location.pathname}?modal=login&redirect=${window.location.pathname}`);
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
  }, [ctx.user, props.packageId]); /* eslint-disable-line react-hooks/exhaustive-deps */

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
    } catch (err) {
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

  if (isUndefined(ctx.user) || isNull(ctx.user) || isNull(activeSubscriptions) || isUndefined(activeSubscriptions)) {
    return null;
  }

  return (
    <div className="d-none d-md-block position-relative ml-2">
      <button
        data-testid="subscriptionsBtn"
        className="btn p-0 position-relative"
        type="button"
        onClick={() => {
          getSubscriptions();
          setOpenStatus(true);
        }}
      >
        <div
          className={`rounded-circle d-flex align-items-center justify-content-center text-primary iconSubsWrapper ${styles.iconWrapper}`}
        >
          {isLoading && (
            <div className={styles.loading}>
              <div className={`spinner-border text-primary ${styles.spinner}`} role="status">
                <span className="sr-only">Loading...</span>
              </div>
            </div>
          )}
          {!isUndefined(activeSubscriptions) && activeSubscriptions.length > 0 ? (
            <MdNotificationsActive className="rounded-circle" />
          ) : (
            <MdNotificationsOff className="rounded-circle text-muted" />
          )}
        </div>
      </button>

      <div
        ref={ref}
        data-testid="subsBtnDropdown"
        className={classnames('dropdown-menu dropdown-menu-right p-0', styles.dropdown, { show: openStatus })}
      >
        <div className={`arrow ${styles.arrow}`} />

        {PACKAGE_SUBSCRIPTIONS_LIST.map((subs: SubscriptionItem) => {
          const isActive = isActiveNotification(subs.kind);
          return (
            <button
              data-testid={`${subs.name}Btn`}
              className={classnames(styles.dropdownItem, 'dropdownItem btn p-3 rounded-0 w-100', {
                [`disabled ${styles.isDisabled}`]: !subs.enabled,
              })}
              onClick={() => changeSubscription(subs.kind, isActive)}
              key={`subs_${subs.kind}`}
            >
              <div className="d-flex flex-row align-items-center w-100 justify-content-between">
                <div className="mr-3">
                  {isActive ? (
                    <FaRegCheckCircle className="text-success" data-testid="checkedSubsBtn" />
                  ) : (
                    <FaRegCircle data-testid="uncheckedSubsBtn" />
                  )}
                </div>
                <div className="d-flex flex-column flex-grow-1">
                  <div className="h6 mb-2 d-flex flex-row align-items-center">
                    {subs.icon}
                    <span className="ml-2">{subs.title}</span>
                  </div>
                  <small className="text-muted text-left">
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
