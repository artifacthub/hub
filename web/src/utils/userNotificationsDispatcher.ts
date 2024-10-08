import md5 from 'crypto-js/md5';
import groupBy from 'lodash/groupBy';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';

import { NotificationsPrefs, PathTips, UserNotification } from '../types';
import { PKG_DETAIL_PATH } from './data';
import hasToBeDisplayedNewNotification from './hasToBeDisplayedNewNotification';

const DEFAULT_START_TIME = 3 * 1000; //3s
const DEFAULT_DISMISS_TIME = 20 * 1000; //20s

export interface UserNotificationsUpdatesHandler {
  updateUserNotificationsWrapper(notification: UserNotification | null): void;
}

const getNotifications = (): UserNotification[] => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const list = require('./notifications.json').notifications;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return list.map((notif: any) => {
    const notification: UserNotification = {
      ...notif,
      id: md5(notif.body).toString(),
    };
    return notification;
  });
};

const getCurrentLocationPath = (location?: string): PathTips | undefined => {
  const currentLocation = location || window.location.pathname;
  if (currentLocation.startsWith('/control-panel')) {
    return PathTips.ControlPanel;
  } else if (PKG_DETAIL_PATH.test(currentLocation)) {
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
  private locationPathTip: PathTips | undefined;

  public start(prefs: NotificationsPrefs, breakpoint?: string) {
    this.settings = prefs;
    this.breakpoint = breakpoint;
    this.startTimeout = setTimeout(() => {
      this.get(true);
      this.startTimeout = undefined;
    }, DEFAULT_START_TIME);
  }

  public get(dateLimit: boolean) {
    // Doesn't display notifications for small devices
    if (isUndefined(this.breakpoint) || !['xs', 'sm'].includes(this.breakpoint)) {
      this.dismissNotification();
      const notif = this.getRandomNotification(dateLimit);
      if (!isNull(notif)) {
        this.postNotification(notif);
      }
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

  public dismissNotification(currentLocation?: string) {
    if (this.activeNotification) {
      this.postNotification(null);
    }
    if (currentLocation) {
      this.updateCurrentLocation(currentLocation);
    }
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

  private updateCurrentLocation(location: string) {
    const currentLocationPathTip = getCurrentLocationPath(location);
    if (!isNull(this.settings) && currentLocationPathTip !== this.locationPathTip) {
      this.locationPathTip = currentLocationPathTip;
      if (isUndefined(this.startTimeout) && hasToBeDisplayedNewNotification(true, this.settings.lastDisplayedTime)) {
        this.get(true);
      }
    }
  }

  private getRandomNotification(dateLimit: boolean): UserNotification | null {
    if (!isNull(this.settings)) {
      if (
        this.settings.enabled &&
        this.settings.displayed.length < this.notifications.length &&
        // Only display a maximum of 1 notification per day when dateLimit is true
        hasToBeDisplayedNewNotification(dateLimit, this.settings.lastDisplayedTime)
      ) {
        const notDisplayedNotifications = groupBy(
          this.notifications.filter((notif: UserNotification) => !this.settings!.displayed.includes(notif.id)),
          'linkTip'
        );

        const currentLocationTip = this.locationPathTip || getCurrentLocationPath();

        const getCommonTip = (): UserNotification | null => {
          return !isUndefined(notDisplayedNotifications.undefined) && notDisplayedNotifications.undefined.length > 0
            ? (notDisplayedNotifications.undefined[
                Math.floor(Math.random() * notDisplayedNotifications.undefined.length)
              ] as UserNotification)
            : null;
        };

        if (currentLocationTip) {
          if (
            !isUndefined(notDisplayedNotifications[currentLocationTip]) &&
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
