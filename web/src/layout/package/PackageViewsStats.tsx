import { ApexOptions } from 'apexcharts';
import isEmpty from 'lodash/isEmpty';
import isUndefined from 'lodash/isUndefined';
import moment from 'moment';
import { useEffect, useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import semver from 'semver';

import { PackageViewsStats, RepositoryKind } from '../../types';
import { getLast30Days, getSeriesDataPerPkgVersionViews, sumViewsPerVersions } from '../../utils/viewsStats';
import Loading from '../common/Loading';
import styles from './PackageViewsStats.module.css';

interface Props {
  stats?: PackageViewsStats;
  version?: string;
  repoKind: RepositoryKind;
  title: JSX.Element;
}

interface Series {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
}

const MAX_VISIBLE_VERSIONS = 3;

const sortPkgVersions = (availableVersions: string[]): string[] => {
  if (availableVersions) {
    const validVersions: string[] = availableVersions.filter((version: string) => semver.valid(version));
    const invalidVersions: string[] = availableVersions.filter((version: string) => !semver.valid(version));
    try {
      const sortedValidVersions = validVersions.sort((a, b) => (semver.lt(a, b) ? 1 : -1));
      return [...sortedValidVersions, ...invalidVersions];
    } catch {
      return availableVersions;
    }
  }
  return [];
};

const getMostRecentVersions = (stats: PackageViewsStats): string[] => {
  const sortedVersions = sortPkgVersions(Object.keys(stats));
  return sortedVersions.slice(0, MAX_VISIBLE_VERSIONS);
};

const prepareChartsSeries = (repoKind: RepositoryKind, stats: PackageViewsStats, version?: string): Series[] => {
  if (isEmpty(stats)) return [];

  const series: Series[] = [];
  let visibleVersions: string[] = [];
  if (version) {
    if (!isUndefined(stats[version])) {
      visibleVersions = [version];
    } else {
      return [];
    }
  } else {
    visibleVersions = repoKind === RepositoryKind.Container ? [] : getMostRecentVersions(stats);
  }

  visibleVersions.forEach((version: string) => {
    series.push({
      name: version,
      data: getSeriesDataPerPkgVersionViews(stats, version),
    });
  });

  const statsVersions = Object.keys(stats);

  if (statsVersions.length > visibleVersions.length && isUndefined(version)) {
    series.push({
      name: repoKind === RepositoryKind.Container ? 'All tags' : 'Other',
      data: sumViewsPerVersions(stats, visibleVersions),
    });
  }

  return series;
};

const PackagesViewsStats = (props: Props) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [series, setSeries] = useState<any[]>([]);

  const getStackedChartConfig = (): ApexOptions => {
    return {
      chart: {
        id: 'pkg-views',
        type: 'bar',
        stacked: true,
        redrawOnWindowResize: true,
        redrawOnParentResize: false,
        zoom: {
          enabled: false,
        },
        fontFamily: 'var(--bs-body-font-family)',
        toolbar: {
          show: false,
        },
      },
      grid: { borderColor: 'var(--border-md)' },
      dataLabels: {
        enabled: false,
      },
      tooltip: {
        x: {
          formatter: (val: number): string => {
            return moment(val).format('DD MMM YY');
          },
        },
        y: {
          formatter: function (value) {
            return value.toFixed(0);
          },
        },
      },
      states: {
        hover: {
          filter: {
            type: 'none',
            value: 0,
          },
        },
        active: {
          filter: {
            type: 'none',
            value: 0,
          },
        },
      },
      legend: {
        showForSingleSeries: true,
        position: 'bottom',
        horizontalAlign: 'center',
        itemMargin: {
          horizontal: 10,
        },
        offsetY: 20,
      },
      xaxis: {
        type: 'datetime',
        labels: {
          style: {
            colors: 'var(--color-font)',
            fontSize: '11px',
          },
        },
        categories: getLast30Days(),
      },
      yaxis: {
        labels: {
          formatter: function (value: number) {
            return value === 0 || value >= 1 ? value.toFixed(0).toString() : '';
          },
          minWidth: 25,
          style: {
            colors: 'var(--color-font)',
            fontSize: '11px',
          },
        },
      },
      colors: ['#33a1fd', '#ffc43d', '#ff8e01', '#994477'],
    };
  };

  useEffect(() => {
    if (!isUndefined(props.stats)) {
      setSeries(prepareChartsSeries(props.repoKind, props.stats, props.version));
    }
  }, [props.version, props.stats]);

  if (series.length === 0 && !isUndefined(props.stats)) return null;

  return (
    <div className="mb-5 pb-3">
      {props.title}
      <div className={`card ${styles.chartWrapper}`}>
        {isUndefined(props.stats) ? (
          <Loading />
        ) : (
          <ReactApexChart options={getStackedChartConfig()} series={series} type="bar" height="300" width="100%" />
        )}
      </div>
    </div>
  );
};

export default PackagesViewsStats;
