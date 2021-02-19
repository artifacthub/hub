import md5 from 'crypto-js/md5';
import { groupBy, isNull, isUndefined } from 'lodash';
import moment from 'moment';

import { NotificationsPrefs, PathTips, UserNotification } from '../types';

const DEFAULT_START_TIME = 3 * 1000; //3s
const DEFAULT_DISMISS_TIME = 20 * 1000; //20s

export interface UserNotificationsUpdatesHandler {
  updateUserNotificationsWrapper(notification: UserNotification | null): void;
}

const detailPkgPath = /^\/packages\/(helm|falco|opa|olm|tbaction|krew|helm-plugin|tekton-task)\//;

const getNotifications = (): UserNotification[] => {
  const list = require('./notifications.json').notifications;
  return list.map((notif: any) => {
    const notification: UserNotification = {
      ...notif,
      id: md5(notif.body).toString(),
    };
    return notification;
  });
};

const getCurrentLocationPath = (): PathTips | undefined => {
  const currentLocation = window.location.pathname;
  if (currentLocation.startsWith('/control-panel')) {
    return PathTips.ControlPanel;
  } else if (detailPkgPath.test(currentLocation)) {
    return PathTips.Package;
  } else {
    switch (currentLocation) {
      case '/':
        return PathTips.Home;
      case '/packages/search':
        return PathTips.Search;
      default:
        return;
    }
  }
};

export class UserNotificationsDispatcher {
  private updatesHandler?: UserNotificationsUpdatesHandler;
  private activeNotification: UserNotification | null = null;
  private startTimeout?: NodeJS.Timeout;
  private dismissTimeout?: NodeJS.Timeout;
  private settings: NotificationsPrefs | null = null;
  private notifications: UserNotification[] = getNotifications();
  private breakpoint: string | undefined;

  public start(prefs: NotificationsPrefs, breakpoint?: string) {
    this.settings = prefs;
    this.breakpoint = breakpoint;
    this.startTimeout = setTimeout(() => {
      // We don't display notifications for small devices
      if (isUndefined(this.breakpoint) || !['xs', 'sm'].includes(this.breakpoint)) {
        this.get(true);
      }
    }, DEFAULT_START_TIME);
  }

  public get(dateLimit: boolean) {
    this.dismissNotification();
    const notif = this.getRandomNotification(dateLimit);
    if (!isNull(notif)) {
      this.postNotification(notif);
    }
  }

  public subscribe(updatesHandler: UserNotificationsUpdatesHandler) {
    this.updatesHandler = updatesHandler;
  }

  public postNotification(notification: UserNotification | null) {
    this.activeNotification = notification;
    if (this.updatesHandler) {
      this.updatesHandler.updateUserNotificationsWrapper(this.activeNotification);
    }
    if (!isNull(notification)) {
      this.dismissTimeout = setTimeout(() => {
        this.dismissNotification();
      }, DEFAULT_DISMISS_TIME);
    } else {
      this.cleanTimeouts();
    }
  }

  public dismissNotification() {
    this.postNotification(null);
  }

  private cleanTimeouts() {
    if (this.startTimeout) {
      clearTimeout(this.startTimeout);
    }
    if (this.dismissTimeout) {
      clearTimeout(this.dismissTimeout);
    }
  }

  public close() {
    this.cleanTimeouts();
  }

  public updateSettings(settings: NotificationsPrefs) {
    this.settings = settings;
  }

  private getRandomNotification(dateLimit: boolean): UserNotification | null {
    if (!isNull(this.settings)) {
      if (
        this.settings.enabled &&
        this.settings.displayed.length < this.notifications.length &&
        // Only display a maximun of 1 notification per day when dateLimit is true
        (!dateLimit ||
          isNull(this.settings.lastDisplayedTime) ||
          moment(this.settings.lastDisplayedTime).diff(Date.now(), 'day') > 0)
      ) {
        let notDisplayedNotifications = groupBy(
          this.notifications.filter((notif: UserNotification) => !this.settings!.displayed.includes(notif.id)),
          'linkTip'
        );

        const currentLocationTip = getCurrentLocationPath();
        const getCommonTip = (): UserNotification | null => {
          return notDisplayedNotifications.hasOwnProperty('undefined')
            ? (notDisplayedNotifications.undefined[
                Math.floor(Math.random() * notDisplayedNotifications.undefined.length)
              ] as UserNotification)
            : null;
        };

        if (currentLocationTip) {
          if (
            notDisplayedNotifications.hasOwnProperty(currentLocationTip) &&
            notDisplayedNotifications[currentLocationTip].length > 0
          ) {
            return notDisplayedNotifications[currentLocationTip][
              Math.floor(Math.random() * notDisplayedNotifications[currentLocationTip].length)
            ] as UserNotification;
          } else {
            return getCommonTip();
          }
        } else {
          return getCommonTip();
        }
      }
    }
    return null;
  }
}

const notificationsDispatcher = new UserNotificationsDispatcher();
export default notificationsDispatcher;
