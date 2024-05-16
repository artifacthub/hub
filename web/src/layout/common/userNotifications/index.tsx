import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import { ElementType, useContext, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';

import { addNewDisplayedNotification, AppCtx, enabledDisplayedNotifications } from '../../../context/AppCtx';
import useBreakpointDetect from '../../../hooks/useBreakpointDetect';
import { UserNotification } from '../../../types';
import notificationsDispatcher from '../../../utils/userNotificationsDispatcher';
import styles from './UserNotifications.module.css';

interface HeadingProps {
  level: number;
  children?: JSX.Element[];
}

const Heading: ElementType = (data: HeadingProps) => {
  const Tag = `h${data.level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  return <Tag className={`text-dark lh-1 fw-bold ${styles.header}`}>{data.children}</Tag>;
};

const ANIMATION_TIME = 300; //300ms

const UserNotificationsController: ElementType = () => {
  const { dispatch, ctx } = useContext(AppCtx);
  const [notification, setNotification] = useState<UserNotification | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [addNotificationTimeout, setAddNotificationTimeout] = useState<NodeJS.Timeout | undefined>(undefined);
  const [dismissNotificationTimeout, setDismissNotificationTimeout] = useState<NodeJS.Timeout | undefined>(undefined);
  const point = useBreakpointDetect();

  notificationsDispatcher.subscribe({
    updateUserNotificationsWrapper: (notif: UserNotification | null) => {
      if (!isNull(notif)) {
        setNotification(notif);
        setIsVisible(true);
        setAddNotificationTimeout(
          setTimeout(() => {
            dispatch(addNewDisplayedNotification(notif.id));
          }, ANIMATION_TIME)
        );
      } else {
        setIsVisible(false);
        setDismissNotificationTimeout(
          setTimeout(() => {
            if (!isNull(notification)) {
              setNotification(null);
            }
          }, ANIMATION_TIME)
        );
      }
    },
  });

  const onClose = () => {
    notificationsDispatcher.dismissNotification();
  };

  const onChangeNotificationsPrefs = () => {
    notificationsDispatcher.dismissNotification();
    // Change user prefs
    dispatch(enabledDisplayedNotifications(false));
  };

  useEffect(() => {
    if (!isUndefined(ctx.user)) {
      notificationsDispatcher.start(ctx.prefs.notifications, point);
    }
    return () => {
      notificationsDispatcher.close();
    };
  }, [ctx.user]);

  useEffect(() => {
    if (!isUndefined(ctx.user)) {
      notificationsDispatcher.updateSettings(ctx.prefs.notifications);
    }
  }, [ctx.prefs.notifications]);

  useEffect(() => {
    return () => {
      if (addNotificationTimeout) {
        clearTimeout(addNotificationTimeout);
      }
      if (dismissNotificationTimeout) {
        clearTimeout(dismissNotificationTimeout);
      }
    };
  }, [addNotificationTimeout, dismissNotificationTimeout]);

  return (
    <div className="d-none d-md-flex justify-content-center align-items-center w-100">
      <div
        className={classnames(
          'position-fixed toast fade border border-3 bg-white opacity-0',
          styles.toast,
          {
            [`show opacity-100 ${styles.isVisible}`]: !isNull(notification) && isVisible,
          },
          'notificationCard'
        )}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      >
        {!isNull(notification) && (
          <div className="toast-body" data-testid="notificationContent">
            <div>
              <div className={`float-end ${styles.btnsWrapper}`}>
                <div className="d-flex flex-row align-items-center">
                  <button
                    type="button"
                    className={`btn btn-link text-dark py-0 ${styles.btn}`}
                    onClick={onChangeNotificationsPrefs}
                    aria-label="Disable usage tips"
                  >
                    Don't show me more again
                  </button>
                  <button
                    type="button"
                    className={`btn-close ${styles.closeBtn}`}
                    onClick={onClose}
                    aria-label="Close"
                  ></button>
                </div>
              </div>
              <span>
                <ReactMarkdown
                  className={styles.content}
                  children={notification.body}
                  components={{
                    h1: Heading,
                    h2: Heading,
                    h3: Heading,
                    h4: Heading,
                    h5: Heading,
                    h6: Heading,
                  }}
                  linkTarget="_blank"
                  skipHtml
                />
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserNotificationsController;
