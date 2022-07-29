// @ts-ignore
import googleAnalyticsV3 from '@analytics/google-analytics-v3';
import Analytics, { AnalyticsPlugin } from 'analytics';
import { isNull } from 'lodash';

import getMetaTag from '../utils/getMetaTag';

const getPlugins = (): AnalyticsPlugin[] => {
  let plugins: AnalyticsPlugin[] = [];
  const analyticsConfig: string | null = getMetaTag('gaTrackingID');

  if (!isNull(analyticsConfig) && analyticsConfig !== '' && analyticsConfig !== '{{ .gaTrackingID }}') {
    plugins.push(
      googleAnalyticsV3({
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
