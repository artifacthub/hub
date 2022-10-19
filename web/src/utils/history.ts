import { createBrowserHistory } from 'history';
import { isNull } from 'lodash';

import { PKG_DETAIL_PATH } from './data';
import getMetaTag from './getMetaTag';
import updateMetaIndex from './updateMetaIndex';
import notificationsDispatcher from './userNotificationsDispatcher';

const browserHistory = createBrowserHistory();
const analyticsConfig: string | null = getMetaTag('gaTrackingID');
let analytics: any = null;

// Imports analytics only when tracking id is defined
if (!isNull(analyticsConfig)) {
  import('../analytics/analytics').then((a) => {
    analytics = a.default;
  });
}

browserHistory.listen((location) => {
  // Updates meta tags every time that history is called for all locations except for package detail page
  if (!PKG_DETAIL_PATH.test(location.pathname)) {
    updateMetaIndex();
  }

  // Calls page view only when script has been loaded
  if (!isNull(analytics)) {
    analytics.page();
  }
  // Clean notifications to change location
  notificationsDispatcher.dismissNotification(location.pathname);
});

export default browserHistory;
