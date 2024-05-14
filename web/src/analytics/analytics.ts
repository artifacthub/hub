// @ts-expect-error no d.ts file for this package
import googleAnalyticsV3 from '@analytics/google-analytics-v3';
import Analytics, { AnalyticsPlugin } from 'analytics';
import isNull from 'lodash/isNull';

import getMetaTag from '../utils/getMetaTag';

const getPlugins = (): AnalyticsPlugin[] => {
  const plugins: AnalyticsPlugin[] = [];
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
