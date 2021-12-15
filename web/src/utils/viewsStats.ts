import { isEmpty, isUndefined } from 'lodash';
import moment from 'moment';

import { PackageViewsStats } from '../types';

interface ViewsPerDate {
  date: string;
  total: number;
}

const getLast30Days = (): string[] =>
  Array.from(Array(30).keys()).map((x: number) => moment().subtract(x, 'days').format('YYYY-MM-DD'));

const sumViewsPerVersions = (stats: PackageViewsStats, excludedVersions?: string[]): number[][] => {
  const last30Days = getLast30Days();
  const statsVersions = Object.keys(stats);
  let versions = [...statsVersions];
  if (!isUndefined(excludedVersions)) {
    versions = statsVersions.filter((version: string) => !excludedVersions.includes(version));
  }
  if (versions.length === 0) return [];
  const versionsPerDates: ViewsPerDate[] = last30Days.map((date: string) => {
    let views = 0;
    versions.forEach((version: string) => {
      views = views + (stats[version][date] | 0);
    });
    return { date: date, total: views };
  });

  return versionsPerDates.map((vpd: ViewsPerDate) => {
    return [moment(vpd.date).unix() * 1000, vpd.total];
  });
};

const getSeriesDataPerPkgVersionViews = (stats: PackageViewsStats, version: string): number[][] => {
  const last30Days = getLast30Days();
  if (isEmpty(stats) || !Object.keys(stats).includes(version)) return [];
  return last30Days.map((date: string) => {
    return [moment(date).unix() * 1000, stats[version][date] || 0];
  });
};

export { getLast30Days, getSeriesDataPerPkgVersionViews, sumViewsPerVersions };
