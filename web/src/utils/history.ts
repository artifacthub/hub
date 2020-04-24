import { createBrowserHistory } from 'history';

import analytics from '../analytics/analytics';
const history = createBrowserHistory();

history.listen((location) => {
  analytics.page();
});

export default history;
