import { createBrowserHistory } from 'history';

import analytics from '../analytics/analytics';
import updateMetaIndex from './updateMetaIndex';
const history = createBrowserHistory();

const detailPath = /^\/packages\/(chart|opa|falco)\//;

history.listen((location) => {
  // Updates meta tags every time that history is called for all locations except for package detail page
  if (!detailPath.test(location.pathname)) {
    updateMetaIndex();
  }
  analytics.page();
});

export default history;
