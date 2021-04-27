import { createBrowserHistory } from 'history';

import analytics from '../analytics/analytics';
import updateMetaIndex from './updateMetaIndex';
import notificationsDispatcher from './userNotificationsDispatcher';
const history = createBrowserHistory();

const detailPath = /^\/packages\/(helm|falco|opa|olm|tbaction|krew|helm-plugin|tekton-task|keda-scaler|coredns)\//;

history.listen((location) => {
  // Updates meta tags every time that history is called for all locations except for package detail page
  if (!detailPath.test(location.pathname)) {
    updateMetaIndex();
  }
  analytics.page();
  // Clean notifications to change location
  notificationsDispatcher.dismissNotification(location.pathname);
});

export default history;
