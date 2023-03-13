import { isUndefined } from 'lodash';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import root from 'react-shadow/styled-components';

import Group from './layout/Group';
import Widget from './layout/Widget';

const renderWidget = (element: HTMLElement) => {
  const { url, theme, responsive, header, stars } = element.dataset;
  const rootEl = createRoot(element!);

  rootEl.render(
    <StrictMode>
      <root.section>
        <div style={{ all: 'initial' }}>
          <Widget
            url={url}
            theme={theme}
            responsive={responsive === 'true'}
            stars={isUndefined(stars) || stars === 'true'}
            header={isUndefined(header) || header === 'true'}
            inGroup={false}
          />
        </div>
      </root.section>
    </StrictMode>
  );
};

const Widgets = document.querySelectorAll('.artifacthub-widget');
Widgets.forEach((div: Element) => {
  const observer = new MutationObserver((mutationsList: MutationRecord[]) => {
    for (const mutation of mutationsList) {
      if (mutation.type === 'attributes' && mutation.attributeName?.startsWith('data-')) {
        renderWidget(mutation.target as HTMLElement);
      }
    }
  });
  observer.observe(div, {
    attributes: true, // Only listen to attribute changes
  });
  renderWidget(div as HTMLElement);
});

const renderGroup = (element: HTMLElement) => {
  const { url, loading, theme, color, responsive, width, header, stars } = element.dataset;
  const rootEl = createRoot(element!);

  rootEl.render(
    <StrictMode>
      <root.section>
        <div style={{ all: 'initial' }}>
          <Group
            url={url}
            loading={isUndefined(loading) || loading === 'true'}
            header={isUndefined(header) || header === 'true'}
            stars={isUndefined(stars) || stars === 'true'}
            theme={theme}
            color={color}
            responsive={isUndefined(responsive) || responsive === 'true'}
            width={width}
          />
        </div>
      </root.section>
    </StrictMode>
  );
};

const WidgetsGroups = document.querySelectorAll('.artifacthub-widget-group');
WidgetsGroups.forEach((div: Element) => {
  const observer = new MutationObserver((mutationsList: MutationRecord[]) => {
    for (const mutation of mutationsList) {
      if (mutation.type === 'attributes' && mutation.attributeName?.startsWith('data-')) {
        renderGroup(mutation.target as HTMLElement);
      }
    }
  });
  observer.observe(div, {
    attributes: true, // Only listen to attribute changes
  });
  renderGroup(div as HTMLElement);
});
