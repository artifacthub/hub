import { isEmpty, isUndefined } from 'lodash';
import moment from 'moment';
import { useEffect, useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import { HiPlusCircle } from 'react-icons/hi';
import { useHistory } from 'react-router-dom';

import { PackageViewsStats, SearchFiltersURL } from '../../types';
import { getSeriesDataPerPkgVersionViews, sumViewsPerVersions } from '../../utils/viewsStats';
import SmallTitle from '../common/SmallTitle';
import styles from './Last30DaysViews.module.css';

interface Props {
  stats?: PackageViewsStats;
  version?: string;
  searchUrlReferer?: SearchFiltersURL;
  fromStarredPage?: boolean;
}

interface Series {
  data: number[][];
}

const prepareSeries = (stats: PackageViewsStats, version?: string): Series[] => {
  if (isEmpty(stats)) return [];

  let data: number[][] = [];
  if (isUndefined(version)) {
    data = sumViewsPerVersions(stats);
  } else {
    data = getSeriesDataPerPkgVersionViews(stats, version);
  }

  return data.length > 0 ? [{ data: data }] : [];
};

const Last30DaysViews = (props: Props) => {
  const history = useHistory();
  const [series, setSeries] = useState<any[]>([]);

  const getSparkLineConfig = (): ApexCharts.ApexOptions => {
    return {
      chart: {
        type: 'area',
        width: 100,
        height: 40,
        fontFamily: "'Lato', Roboto, 'Helvetica Neue', Arial, sans-serif !default",
        sparkline: {
          enabled: true,
        },
        animations: {
          easing: 'linear',
          speed: 200,
        },
      },
      fill: {
        opacity: 0.5,
      },
      grid: { borderColor: 'var(--border-md)' },
      tooltip: {
        fixed: {
          enabled: false,
        },
        x: {
          show: false,
        },
        y: {
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
      colors: props.version ? ['#33a1fd'] : ['#40c463'],
    };
  };

  useEffect(() => {
    if (!isUndefined(props.stats)) {
      setSeries(prepareSeries(props.stats, props.version));
    }
  }, [props.version, props.stats]); /* eslint-disable-line react-hooks/exhaustive-deps */

  return (
    <>
      <SmallTitle text="Last 30 days views" />
      <div data-testid="lastViews" className="w-100 mb-3 pt-2">
        <div className="d-flex flex-column">
          <div>
            <div className={`position-relative border bg-white ${styles.chartWrapper}`}>
              {isUndefined(props.stats) ? (
                <div className="d-flex flex-row align-items-center h-100 w-100">
                  <small className="fst-italic w-100 text-center text-muted">Loading...</small>
                </div>
              ) : (
                <>
                  {series.length === 0 ? (
                    <div className="d-flex flex-row align-items-center h-100 w-100">
                      <small className="fst-italic w-100 text-center text-muted">No views yet</small>
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
                    history.push({
                      pathname: history.location.pathname,
                      hash: 'views-over-the-last-30-days',
                      state: {
                        searchUrlReferer: props.searchUrlReferer,
                        fromStarredPage: props.fromStarredPage,
                      },
                    });
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
                <small className="text-muted text-truncate">({props.version || 'all versions'})</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Last30DaysViews;
