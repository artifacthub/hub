// @ts-ignore
import googleAnalytics from '@analytics/google-analytics';
import Analytics from 'analytics';
import { isNull } from 'lodash';

const getPlugins = (): object[] => {
  let plugins: object[] = [];
  const analyticsConfig: string | null = document.querySelector(`meta[name='artifacthub:gaTrackingID']`)
    ? document.querySelector(`meta[name='artifacthub:gaTrackingID']`)!.getAttribute('content')
    : null;

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
