import { orderBy } from 'lodash';
import moment from 'moment';
import { useEffect, useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import semver from 'semver';

import API from '../../api';
import { PackageViewsStats } from '../../types';
import sumObjectValues from '../../utils/sumObjectValues';
import styles from './PackageViewsStats.module.css';

interface Props {
  packageId: string;
  version?: string;
}

interface Series {
  name: string;
  data: any[];
}

interface ViewsPerVersion {
  version: string;
  total: number;
}

interface ViewsPerDate {
  date: string;
  total: number;
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

const getMostPopularVersions = (stats: PackageViewsStats): string[] => {
  const totalViewsPerVersion: ViewsPerVersion[] = [];
  Object.keys(stats).forEach((version: string) => {
    const totalViews = sumObjectValues(stats[version]);
    if (totalViews > 0) {
      totalViewsPerVersion.push({
        version: version,
        total: totalViews,
      });
    }
  });

  const versions = orderBy(totalViewsPerVersion, 'total', 'desc')
    .slice(0, MAX_VISIBLE_VERSIONS)
    .map((vpv: ViewsPerVersion) => vpv.version);

  return sortPkgVersions(versions);
};

const prepareChartsSeries = (stats: PackageViewsStats): Series[] => {
  const visibleVersions = getMostPopularVersions(stats);

  const last30Days = Array.from(Array(30).keys()).map((x: number) => moment().subtract(x, 'days').format('YYYY-MM-DD'));

  let series: Series[] = [];

  visibleVersions.forEach((version: string) => {
    const data = last30Days.map((date: string) => {
      return [moment(date).unix() * 1000, stats[version][date] || 0];
    });

    series.push({
      name: version,
      data: data,
    });
  });

  const statsVersions = Object.keys(stats);

  if (statsVersions.length > visibleVersions.length) {
    const restVersions = statsVersions.filter((version: string) => !visibleVersions.includes(version));
    const restVersionsPerDates: ViewsPerDate[] = last30Days.map((date: string) => {
      let views = 0;
      restVersions.forEach((version: string) => {
        views = views + (stats[version][date] | 0);
      });
      return { date: date, total: views };
    });

    const data = restVersionsPerDates.map((vpd: ViewsPerDate) => {
      return [moment(vpd.date).unix() * 1000, vpd.total];
    });

    series.push({
      name: 'Other',
      data: data,
    });
  }

  return series;
};

const PackagesViewsStats = (props: Props) => {
  const [series, setSeries] = useState<any[]>([]);

  const getStackedChartConfig = (): ApexCharts.ApexOptions => {
    return {
      chart: {
        type: 'area',
        stacked: true,
        redrawOnWindowResize: true,
        redrawOnParentResize: false,
        zoom: {
          enabled: false,
        },
        selection: {
          enabled: true,
        },
        fontFamily: "'Lato', Roboto, 'Helvetica Neue', Arial, sans-serif !default",
        toolbar: {
          show: false,
        },
      },
      grid: { borderColor: 'var(--border-md)' },
      dataLabels: {
        enabled: false,
      },
      tooltip: {
        shared: true,
        intersect: false,
        x: {
          format: 'dd MMM yy',
        },
        y: {
          formatter: function (value) {
            return value.toFixed(0);
          },
        },
      },
      legend: {
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
      },
      yaxis: {
        labels: {
          style: {
            colors: 'var(--color-font)',
            fontSize: '11px',
          },
        },
      },
      colors: ['#33a1fd', '#06d6a0', '#ffc43d', '#bfc0c0'],
    };
  };

  useEffect(() => {
    async function getStats() {
      try {
        const stats = await API.getViews(props.packageId);
        setSeries(prepareChartsSeries(stats));
      } catch (err: any) {
        // Dont' show any error if API request fails
      }
    }
    getStats();
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  if (series.length === 0) return null;

  return (
    <div className="mb-5">
      <h3 className="position-relative mb-4">Views over the last 30 days</h3>
      <div className={`card ${styles.chartWrapper}`}>
        <ReactApexChart options={getStackedChartConfig()} series={series} type="bar" height="300" />
      </div>
    </div>
  );
};

export default PackagesViewsStats;
