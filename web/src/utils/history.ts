import { createBrowserHistory } from 'history';

import analytics from '../analytics/analytics';
import { PKG_DETAIL_PATH } from './data';
import updateMetaIndex from './updateMetaIndex';
import notificationsDispatcher from './userNotificationsDispatcher';

const history = createBrowserHistory();

history.listen((location) => {
  // Updates meta tags every time that history is called for all locations except for package detail page
  if (!PKG_DETAIL_PATH.test(location.pathname)) {
    updateMetaIndex();
  }
  analytics.page();
  // Clean notifications to change location
  notificationsDispatcher.dismissNotification(location.pathname);
});

export default history;
