import { ApexOptions } from 'apexcharts';
import isEmpty from 'lodash/isEmpty';
import isUndefined from 'lodash/isUndefined';
import moment from 'moment';
import { useEffect, useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import { HiPlusCircle } from 'react-icons/hi';
import { useLocation, useNavigate } from 'react-router-dom';

import { PackageViewsStats, RepositoryKind } from '../../types';
import { getSeriesDataPerPkgVersionViewsWithTimestamp, sumViewsPerVersionsWithTimestamp } from '../../utils/viewsStats';
import SmallTitle from '../common/SmallTitle';
import styles from './Last30DaysViews.module.css';

interface Props {
  repoKind: RepositoryKind;
  stats?: PackageViewsStats;
  version?: string;
}

interface Series {
  data: number[][];
}

const prepareSeries = (stats: PackageViewsStats, version?: string): Series[] => {
  if (isEmpty(stats)) return [];

  let data: number[][] = [];
  if (isUndefined(version)) {
    data = sumViewsPerVersionsWithTimestamp(stats);
  } else {
    data = getSeriesDataPerPkgVersionViewsWithTimestamp(stats, version);
  }

  return data.length > 0 ? [{ data: data }] : [];
};

const Last30DaysViews = (props: Props) => {
  const navigate = useNavigate();
  const location = useLocation();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [series, setSeries] = useState<any[]>([]);

  const getLegend = (): string => {
    if (props.version) {
      return props.version;
    } else {
      if (props.repoKind === RepositoryKind.Container) {
        return 'all tags';
      } else {
        return 'all versions';
      }
    }
  };

  const getSparkLineConfig = (): ApexOptions => {
    return {
      chart: {
        type: 'area',
        width: 100,
        height: 40,
        fontFamily: 'var(--bs-body-font-family)',
        sparkline: {
          enabled: true,
        },
        animations: {
          enabled: false,
        },
      },
      fill: {
        opacity: 0.5,
      },
      grid: { borderColor: 'var(--border-md)' },
      tooltip: {
        style: {
          fontSize: '10px',
          fontFamily: 'var(--bs-body-font-family)',
        },
        fixed: {
          enabled: false,
        },
        x: {
          formatter: (val: number): string => {
            return moment(val).format('DD MMM YY');
          },
        },
        y: {
          formatter: function (value: number) {
            return value.toFixed(0);
          },
          title: {
            formatter: () => '',
          },
        },
        marker: {
          show: false,
        },
      },
      plotOptions: {
        area: {
          fillTo: 'end',
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
      stroke: {
        width: 2,
        curve: 'straight',
      },
      yaxis: {
        show: false,
        // Display markers on top and bottom positions
        min: () => -0.1,
        max: (max) => max + 0.1,
      },
      markers: {
        size: 0,
        hover: {
          size: 5,
          sizeOffset: 3,
        },
      },
      colors: ['#40c463'],
    };
  };

  useEffect(() => {
    if (!isUndefined(props.stats)) {
      setSeries(prepareSeries(props.stats, props.version));
    }
  }, [props.version, props.stats]);

  return (
    <>
      <SmallTitle text="Last 30 days views" />
      <div data-testid="lastViews" className="w-100 mb-3 pt-2">
        <div className="d-flex flex-column">
          <div>
            <div className={`position-relative border bg-white ${styles.chartWrapper}`}>
              {isUndefined(props.stats) ? (
                <div className="d-flex flex-row align-items-center h-100 w-100">
                  <small className="w-100 text-center text-muted">Loading...</small>
                </div>
              ) : (
                <>
                  {series.length === 0 ? (
                    <div className="d-flex flex-row align-items-center h-100 w-100">
                      <small className="w-100 text-center text-muted">No views yet</small>
                    </div>
                  ) : (
                    <ReactApexChart
                      options={getSparkLineConfig()}
                      series={series}
                      type="area"
                      height="40"
                      width="100%"
                    />
                  )}
                </>
              )}
            </div>

            <div className={`d-flex flex-row justify-content-between w-100 ${styles.legend}`}>
              <div>
                <small className="text-muted">{moment().subtract(30, 'days').format('DD MMM')}</small>
              </div>
              <div>
                <small className="text-muted">{moment().subtract(15, 'days').format('DD MMM')}</small>
              </div>
              <div>
                <small className="text-muted">{moment().format('DD MMM')}</small>
              </div>
            </div>

            <div className="d-flex flex-row justify-content-between align-items-baseline w-100">
              <div className="d-none d-md-block">
                <button
                  onClick={() => {
                    navigate(
                      {
                        pathname: location.pathname,
                        hash: 'views',
                      },
                      {
                        state: location.state,
                      }
                    );
                  }}
                  className={`btn btn-link ps-0 position-relative text-primary ${styles.btn}`}
                  disabled={series.length === 0}
                  aria-label="See views chart"
                >
                  <div className="d-flex flex-row align-items-center text-nowrap">
                    <HiPlusCircle className="me-1" />
                    <span>See details</span>
                  </div>
                </button>
              </div>
              <div className={`ms-auto text-truncate ${styles.legend}`}>
                <small className="text-muted text-truncate">({getLegend()})</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Last30DaysViews;
