import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { FaCaretDown, FaRegCheckCircle, FaRegCircle } from 'react-icons/fa';
import { MdNotificationsActive, MdNotificationsOff } from 'react-icons/md';

import { API } from '../../api';
import { AppCtx } from '../../context/AppCtx';
import useOutsideClick from '../../hooks/useOutsideClick';
import { EventKind, Subscription } from '../../types';
import alertDispatcher from '../../utils/alertDispatcher';
import { SubscriptionItem, SUBSCRIPTIONS_LIST } from '../../utils/data';
import styles from './SubscriptionsButton.module.css';

interface Props {
  packageId: string;
}

const SubscriptionsButton = (props: Props) => {
  const { ctx } = useContext(AppCtx);
  const [openStatus, setOpenStatus] = useState(false);
  const [activeSubscriptions, setActiveSubscriptions] = useState<Subscription[] | undefined | null>(undefined);
  const [isLoading, setIsLoading] = useState<boolean | null>(null);

  const ref = useRef(null);
  useOutsideClick([ref], openStatus, () => setOpenStatus(false));

  const getNotificationTitle = (kind: EventKind): string => {
    let title = '';
    const notif = SUBSCRIPTIONS_LIST.find((subs: SubscriptionItem) => subs.kind === kind);
    if (!isUndefined(notif)) {
      title = notif.title;
    }
    return title;
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
        setActiveSubscriptions(await API.getPackageSubscriptions(props.packageId));
        if (visibleLoading) {
          setIsLoading(false);
        }
      } catch (err) {
        if (visibleLoading) {
          setIsLoading(false);
        }
        setActiveSubscriptions(null);
        if (err.statusText !== 'ErrLoginRedirect') {
          alertDispatcher.postAlert({
            type: 'danger',
            message: 'An error occurred getting your subscriptions, please try again later',
          });
        }
      }
    }
  }

  useEffect(() => {
    if (
      !isUndefined(ctx.user) &&
      ((!isNull(ctx.user) && isUndefined(activeSubscriptions)) ||
        (isNull(ctx.user) && !isUndefined(activeSubscriptions)))
    ) {
      getSubscriptions();
    }
  }, [ctx.user]); /* eslint-disable-line react-hooks/exhaustive-deps */

  async function changeSubscription(kind: EventKind, isActive: boolean) {
    updateOptimisticallyActiveSubscriptions(kind, isActive);
    try {
      if (isActive) {
        await API.deleteSubscription(props.packageId, kind);
      } else {
        await API.addSubscription(props.packageId, kind);
      }
      getSubscriptions(true);
    } catch (err) {
      if (err.statusText !== 'ErrLoginRedirect') {
        alertDispatcher.postAlert({
          type: 'danger',
          message: `An error occurred ${isActive ? 'unsubscribing from' : 'subscribing to'} ${getNotificationTitle(
            kind
          )} notification, please try again later`,
        });
        getSubscriptions(true); // Get subscriptions if changeSubscription fails
      }
    }
  }

  if (isUndefined(ctx.user) || isNull(ctx.user) || isNull(activeSubscriptions) || isUndefined(activeSubscriptions)) {
    return null;
  }

  return (
    <div className="position-relative ml-3">
      <button
        data-testid="subscriptionsBtn"
        className="btn p-0 position-relative"
        type="button"
        onClick={() => {
          getSubscriptions();
          setOpenStatus(true);
        }}
      >
        <div className="d-flex flex-row align-items-center justify-content-center">
          <div
            className={`rounded-circle d-flex align-items-center justify-content-center text-primary ${styles.iconWrapper}`}
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
          <small className="ml-1 text-primary">
            <FaCaretDown />
          </small>
        </div>
      </button>

      <div
        ref={ref}
        className={classnames('dropdown-menu dropdown-menu-right p-0', styles.dropdown, { show: openStatus })}
      >
        <div className={`arrow ${styles.arrow}`} />

        {SUBSCRIPTIONS_LIST.map((subs: SubscriptionItem) => {
          const isActive = isActiveNotification(subs.kind);
          return (
            <button
              data-testid={`${subs.name}Btn`}
              className={classnames(styles.dropdownItem, 'btn p-3 rounded-0 w-100', {
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
                  <div className="h6 mb-0 mb-sm-2 d-flex flex-row align-items-center">
                    {subs.icon}
                    <span className="ml-2">{subs.title}</span>
                  </div>
                  <small className="d-none d-sm-inline text-muted text-left">
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
