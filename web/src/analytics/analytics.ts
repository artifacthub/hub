// @ts-ignore
import googleAnalytics from '@analytics/google-analytics';
import Analytics, { AnalyticsPlugin } from 'analytics';
import { isNull } from 'lodash';

import getMetaTag from '../utils/getMetaTag';

const getPlugins = (): AnalyticsPlugin[] => {
  let plugins: AnalyticsPlugin[] = [];
  const analyticsConfig: string | null = getMetaTag('gaTrackingID');

  if (!isNull(analyticsConfig) && analyticsConfig !== '' && analyticsConfig !== '{{ .gaTrackingID }}') {
    plugins.push(
      googleAnalytics({
        trackingId: analyticsConfig,
      })
    );
  }

  return plugins;
};

const analytics = Analytics({
  app: 'ArtifactHub',
  plugins: getPlugins(),
});

export default analytics;
