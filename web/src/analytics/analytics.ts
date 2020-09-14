// @ts-ignore
import googleAnalytics from '@analytics/google-analytics';
import Analytics from 'analytics';
import isUndefined from 'lodash/isUndefined';

const getPlugins = (): object[] => {
  let plugins: object[] = [];
  const analyticsConfig = (window as any).analyticsConfig;
  if (!isUndefined(analyticsConfig)) {
    if (
      analyticsConfig.hasOwnProperty('gaTrackingID') &&
      analyticsConfig.gaTrackingID !== '' &&
      analyticsConfig.gaTrackingID !== '{{ .gaTrackingID }}'
    ) {
      plugins.push(
        googleAnalytics({
          trackingId: analyticsConfig.gaTrackingID,
        })
      );
    }
  }

  return plugins;
};

const analytics = Analytics({
  app: 'ArtifactHub',
  plugins: getPlugins(),
});

export default analytics;
