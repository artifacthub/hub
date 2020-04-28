import { createBrowserHistory } from 'history';

import analytics from '../analytics/analytics';
import updateMetaIndex from './updateMetaIndex';
const history = createBrowserHistory();

history.listen((location) => {
  // Updates meta tags every time that history is called for all locations except for package detail page
  if (!location.pathname.startsWith('/package/')) {
    updateMetaIndex();
  }
  analytics.page();
});

export default history;
