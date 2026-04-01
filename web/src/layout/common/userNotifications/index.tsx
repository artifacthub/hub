import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import {
  cloneElement,
  ComponentPropsWithoutRef,
  ElementType,
  isValidElement,
  ReactElement,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import ReactMarkdown from 'react-markdown';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { github } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import { addNewDisplayedNotification, AppCtx, enabledDisplayedNotifications } from '../../../context/AppCtx';
import useBreakpointDetect from '../../../hooks/useBreakpointDetect';
import { UserNotification } from '../../../types';
import notificationsDispatcher from '../../../utils/userNotificationsDispatcher';
import styles from './UserNotifications.module.css';

interface HeadingProps {
  children?: ReactNode;
}

interface LinkProps extends ComponentPropsWithoutRef<'a'> {
  node?: unknown;
}

const getHeading = (level: number): ElementType => {
  return (data: HeadingProps) => {
    const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
    return <Tag className={`text-dark lh-1 fw-bold ${styles.header}`}>{data.children}</Tag>;
  };
};

const Link: ElementType = ({ children, target, ...rest }: LinkProps) => (
  <a {...rest} target={target || '_blank'} rel="noopener noreferrer">
    {children}
  </a>
);

interface CodeProps extends ComponentPropsWithoutRef<'code'> {
  isInPre?: boolean;
}

const Code: ElementType = ({ className, children, isInPre }: CodeProps) => {
  if (!isInPre) {
    return className ? <code className={className}>{children}</code> : <code>{children}</code>;
  }

  const match = /language-(\w+)/.exec(className || '');

  return (
    <SyntaxHighlighter language={match ? match[1] : 'bash'} style={github}>
      {String(children).replace(/\n$/, '')}
    </SyntaxHighlighter>
  );
};

const mapPreChild = (child: ComponentPropsWithoutRef<'pre'>['children']) => {
  if (isValidElement<CodeProps>(child)) {
    return cloneElement<CodeProps>(child as ReactElement<CodeProps>, { isInPre: true });
  }

  return child;
};

const Pre: ElementType = (props: ComponentPropsWithoutRef<'pre'> & { node?: unknown }) => {
  if (Array.isArray(props.children)) {
    return <>{props.children.map((child) => mapPreChild(child))}</>;
  }

  return <>{mapPreChild(props.children)}</>;
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
                <div className={styles.content}>
                  <ReactMarkdown
                    children={notification.body}
                    components={{
                      pre: Pre,
                      code: Code,
                      h1: getHeading(1),
                      h2: getHeading(2),
                      h3: getHeading(3),
                      h4: getHeading(4),
                      h5: getHeading(5),
                      h6: getHeading(6),
                      a: Link,
                    }}
                    skipHtml
                  />
                </div>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserNotificationsController;
