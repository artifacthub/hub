import React from 'react';
import ReactDOM from 'react-dom';

import App from './layout/App';

const WidgetDivs = document.querySelectorAll('.artifacthub-widget');
WidgetDivs.forEach((div: Element) => {
  ReactDOM.render(
    <React.StrictMode>
      <App element={div} />
    </React.StrictMode>,
    div
  );
});
