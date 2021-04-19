import { isUndefined } from 'lodash';
import React from 'react';
import ReactDOM from 'react-dom';

import Group from './layout/Group';
import Widget from './layout/Widget';

const Widgets = document.querySelectorAll('.artifacthub-widget');
Widgets.forEach((div: Element) => {
  const { url, theme, responsive, header } = (div as HTMLElement).dataset;
  ReactDOM.render(
    <React.StrictMode>
      <Widget
        url={url}
        theme={theme}
        responsive={responsive === 'true'}
        header={isUndefined(header) || header === 'true'}
        inGroup={false}
      />
    </React.StrictMode>,
    div
  );
});

const WidgetsGroups = document.querySelectorAll('.artifacthub-widget-group');
WidgetsGroups.forEach((div: Element) => {
  const { url, loading, theme, color, responsive, width, header } = (div as HTMLElement).dataset;
  ReactDOM.render(
    <React.StrictMode>
      <Group
        url={url}
        loading={isUndefined(loading) || loading === 'true'}
        header={isUndefined(header) || header === 'true'}
        theme={theme}
        color={color}
        responsive={isUndefined(responsive) || responsive === 'true'}
        width={width}
      />
    </React.StrictMode>,
    div
  );
});
