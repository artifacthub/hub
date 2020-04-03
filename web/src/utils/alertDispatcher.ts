import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';

import { Alert } from '../types';

const DEFUALT_TIME = 4 * 1000; //4s

export interface AlertUpdatesHandler {
  updateAlertWrapper(alert: Alert | null): void;
}

export class AlertDispatcher {
  private updatesHandler?: AlertUpdatesHandler;
  private visibleAlert: Alert | null = null;
  private timeout?: NodeJS.Timeout;

  public subscribe(updatesHandler: AlertUpdatesHandler) {
    this.updatesHandler = updatesHandler;
  }

  public postAlert(alert: Alert | null) {
    this.visibleAlert = alert;
    this.dismissAlert();
    if (!isUndefined(this.updatesHandler)) {
      this.updatesHandler.updateAlertWrapper(this.visibleAlert);
    }
  }

  private dismissAlert() {
    this.clearTimeout();
    if (!isNull(this.visibleAlert)) {
      this.timeout = setTimeout(
        () => {
          this.postAlert(null);
        },
        !isUndefined(this.visibleAlert.dismissOn) ? this.visibleAlert.dismissOn : DEFUALT_TIME
      );
    }
  }

  private clearTimeout() {
    if (!isUndefined(this.timeout)) {
      clearTimeout(this.timeout);
    }
  }
}

const alertDispatcher = new AlertDispatcher();
export default alertDispatcher;
