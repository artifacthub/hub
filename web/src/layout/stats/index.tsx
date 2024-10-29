import { ApexOptions } from 'apexcharts';
import classnames from 'classnames';
import isNull from 'lodash/isNull';
import isUndefined from 'lodash/isUndefined';
import moment from 'moment';
import { useCallback, useContext, useEffect, useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import { useLocation, useNavigate } from 'react-router-dom';

import API from '../../api';
import { AppCtx } from '../../context/AppCtx';
import { AHStats } from '../../types';
import compoundErrorMessage from '../../utils/compoundErrorMessage';
import getMetaTag from '../../utils/getMetaTag';
import isWhiteLabel from '../../utils/isWhiteLabel';
import prettifyNumber from '../../utils/prettifyNumber';
import scrollToTop from '../../utils/scrollToTop';
import AnchorHeader from '../common/AnchorHeader';
import Loading from '../common/Loading';
import NoData from '../common/NoData';
import BrushChart from './BrushChart';
import PackagesList from './PackagesList';
import styles from './StatsView.module.css';

const StatsView = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { ctx } = useContext(AppCtx);
  const whiteLabel = isWhiteLabel();
  const siteName = getMetaTag('siteName');
  const primaryColor = getMetaTag('primaryColor');
  const { effective } = ctx.prefs.theme;
  const [activeTheme, setActiveTheme] = useState(effective);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [emptyStats, setEmptyStats] = useState<boolean>(false);
  const [stats, setStats] = useState<AHStats | null>({
    packages: {
      total: 0,
      runningTotal: [],
      viewsDaily: [],
      viewsMonthly: [],
      topViewsToday: [],
      topViewsCurrentMonth: [],
    },
    snapshots: {
      total: 0,
      runningTotal: [],
    },
    repositories: {
      total: 0,
      runningTotal: [],
    },
    organizations: {
      total: 0,
      runningTotal: [],
    },
    users: {
      total: 0,
      runningTotal: [],
    },
  });
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (effective !== activeTheme) {
      setActiveTheme(effective);
    }
  }, [effective, activeTheme]);

  const getAreaChartConfig = (title: string, withAnnotations?: boolean): ApexOptions => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const annotations: any[] =
      withAnnotations && !whiteLabel
        ? [
            {
              x: new Date('7 Oct 2020').getTime(),
              strokeDashArray: 0,
              borderColor: 'var(--color-1-700)',
              label: {
                borderColor: 'var(--color-1-700)',
                style: {
                  color: '#fff',
                  background: 'var(--color-1-700)',
                },
                text: 'Helm Hub ⇒ Artifact Hub',
              },
            },
          ]
        : [];

    return {
      chart: {
        fontFamily: 'var(--bs-body-font-family)',
        height: 300,
        type: 'area',
        redrawOnParentResize: false,
        // Temporary solution -> https://github.com/apexcharts/apexcharts.js/issues/4154 and https://github.com/apexcharts/Blazor-ApexCharts/issues/376
        animations: {
          enabled: false,
        },
        zoom: {
          type: 'x',
          enabled: true,
          autoScaleYaxis: true,
          zoomedArea: {
            fill: {
              color: 'var(--color-1-300)',
              opacity: 0.4,
            },
            stroke: {
              color: 'var(--color-1-900)',
              opacity: 0.8,
              width: 1,
            },
          },
        },
        toolbar: {
          autoSelected: 'zoom',
          tools: {
            download: false,
            pan: false,
          },
        },
        events: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          beforeZoom: (chartContext: any, opt: any) => {
            const minDate = chartContext.ctx.data.twoDSeriesX[0];
            const maxDate = chartContext.ctx.data.twoDSeriesX[chartContext.ctx.data.twoDSeriesX.length - 1];
            let newMinDate = parseInt(opt.xaxis.min);
            let newMaxDate = parseInt(opt.xaxis.max);
            // Min range 1 week
            if (newMinDate > chartContext.minX) {
              const maxRange = moment(newMinDate).add(1, 'w').valueOf();
              if (moment(newMaxDate).isBefore(maxRange) && moment(maxRange).isBefore(maxDate)) {
                newMaxDate = maxRange;
              } else {
                const minRange = moment(newMaxDate).subtract(1, 'w').valueOf();
                if (moment(newMinDate).isAfter(minRange)) {
                  newMinDate = minRange;
                }
              }
            }
            return {
              xaxis: {
                min: newMinDate < minDate ? minDate : newMinDate,
                max: newMaxDate > maxDate ? maxDate : newMaxDate,
              },
            };
          },
        },
      },
      grid: { borderColor: 'var(--border-md)' },
      annotations: {
        xaxis: annotations,
      },
      dataLabels: {
        enabled: false,
      },
      colors: ['var(--color-1-500)'],
      stroke: {
        curve: 'smooth',
      },
      fill: {
        opacity: 0.5,
        colors: [
          () => {
            return activeTheme === 'dark' ? '#222529' : primaryColor;
          },
        ],
      },
      title: {
        text: title,
        align: 'left',
        style: {
          color: 'var(--color-font)',
        },
      },
      xaxis: {
        type: 'datetime',
        labels: {
          datetimeFormatter: {
            year: 'yyyy',
            month: "MMM'yy",
            day: 'dd MMM',
            hour: 'dd MMM',
          },
          style: {
            colors: 'var(--color-font)',
            fontSize: '11px',
          },
        },
      },
      yaxis: {
        labels: {
          style: {
            colors: ['var(--color-font)'],
          },
        },
      },
      markers: {
        size: 0,
      },
    };
  };

  const getBarChartConfig = (
    id: string,
    title: string,
    monthlyFormatter: boolean,
    dataLength: number,
    lastBarDate?: number
  ): ApexOptions => {
    const getBarColors = (): string[] => {
      if (dataLength > 0) {
        const isCurrent = !isUndefined(lastBarDate)
          ? moment(moment.unix(lastBarDate / 1000)).isSame(moment(), monthlyFormatter ? 'month' : 'day')
          : false;
        const colors = Array.from({ length: dataLength - 1 }, () => 'var(--color-1-500)');
        if (isCurrent) {
          // Color for the last bar
          colors.push(activeTheme === 'dark' ? 'var(--highlighted)' : 'var(--color-1-900)');
        } else {
          colors.push('var(--color-1-500)');
        }
        return colors;
      }
      return ['var(--color-1-500)'];
    };

    return {
      chart: {
        id: `${id}BarChart`,
        height: 300,
        type: 'bar',
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
      plotOptions: {
        bar: {
          distributed: true, // Its is neccesary to display different bar colors
          borderRadius: 0,
          dataLabels: {
            position: 'top',
          },
        },
      },
      legend: {
        show: false, // After enabling 'distributed', we have to hide the legend
      },
      dataLabels: {
        enabled: true,
        offsetY: -20,
        style: {
          fontSize: '12px',
          colors: ['var(--color-font)'],
        },
        formatter: (value: number) => {
          if (value === 0) return '';
          return prettifyNumber(value, 1);
        },
      },
      colors: getBarColors(),
      xaxis: {
        type: 'datetime',
        min: monthlyFormatter ? undefined : moment().subtract(30, 'days').unix() * 1000,
        labels: {
          style: {
            colors: 'var(--color-font)',
            fontSize: '11px',
          },
          format: monthlyFormatter ? 'MM/yy' : undefined,
        },
      },
      yaxis: {
        labels: {
          style: {
            colors: ['var(--color-font)'],
          },
        },
      },
      tooltip: {
        x: {
          formatter: (val: number): string => {
            return monthlyFormatter ? moment(val).format('MM/YY') : moment(val).format('DD MMM YY');
          },
        },
      },
      title: {
        text: title,
        style: {
          color: 'var(--color-font)',
        },
      },
      responsive: [
        {
          breakpoint: 1920,
          options: {
            plotOptions: {
              bar: {
                columnWidth: '80%',
              },
            },
            dataLabels: {
              offsetY: -15,
              style: {
                fontSize: '9px',
              },
            },
          },
        },
        {
          breakpoint: 1400,
          options: {
            dataLabels: {
              offsetY: monthlyFormatter ? -15 : -12,
              style: {
                fontSize: monthlyFormatter ? '9px' : '7px',
              },
            },
          },
        },
        {
          breakpoint: 992,
          options: {
            dataLabels: {
              enabled: false,
            },
          },
        },
        {
          breakpoint: 768,
          options: {
            plotOptions: {
              bar: {
                borderRadius: 0,
                columnWidth: '50%',
              },
            },
          },
        },
      ],
    };
  };

  const checkCurrentStats = (currentStats: AHStats | null) => {
    if (!isNull(currentStats)) {
      const notEmptyItems = Object.keys(currentStats).some((elem: string) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return elem !== 'generatedAt' && (currentStats as any)[elem].total !== 0;
      });
      setEmptyStats(!notEmptyItems);
    }
  };

  useEffect(() => {
    async function getStats() {
      try {
        setIsLoading(true);
        const stats = await API.getAHStats();
        setStats(stats);
        checkCurrentStats(stats);
        scrollIntoView();
        setApiError(null);
        setIsLoading(false);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        setIsLoading(false);
        const error = compoundErrorMessage(err, `An error occurred getting ${siteName} stats`);
        setApiError(error);
        setStats(null);
      }
    }
    scrollToTop(0, 'instant');
    getStats();
  }, []);

  const scrollIntoView = useCallback(
    (id?: string) => {
      const elId = id || location.hash;
      if (isUndefined(elId) || elId === '') return;

      try {
        const element = document.querySelector(elId);
        if (element) {
          element.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'smooth' });
          if (location.hash !== elId) {
            navigate({
              pathname: location.pathname,
              hash: elId,
            });
          }
        }
      } finally {
        // eslint-disable-next-line no-unsafe-finally
        return;
      }
    },
    [location.hash]
  );

  return (
    <div className="d-flex flex-column flex-grow-1 position-relative">
      <main role="main" className="container-lg px-sm-4 px-lg-0 pt-5 pb-0 pb-lg-5 noFocus" id="content" tabIndex={-1}>
        <div className="flex-grow-1 position-relative">
          <div className={`h2 text-dark text-center ${styles.title}`}>{siteName} Stats</div>

          {apiError && <NoData issuesLinkVisible>{apiError}</NoData>}
          {stats && (
            <>
              <div className="text-center mb-4 mb-sm-5">
                <small>
                  <span className="text-muted me-2">Report generated at:</span>
                  {!isUndefined(stats.generatedAt) ? (
                    moment(stats.generatedAt).format('YYYY/MM/DD HH:mm:ss (Z)')
                  ) : (
                    <div className="d-inline">
                      <Loading noWrapper smallSize />
                    </div>
                  )}
                </small>
              </div>

              {emptyStats && (
                <div>
                  <NoData>No Stats available for the moment</NoData>
                </div>
              )}

              {(stats.packages.viewsDaily || stats.packages.viewsMonthly) && (
                <>
                  <AnchorHeader
                    level={2}
                    scrollIntoView={scrollIntoView}
                    className={`mb-2 mb-sm-4 fw-semibold ${styles.title}`}
                    title="Usage"
                  />

                  {(stats.packages.viewsMonthly || stats.packages.topViewsCurrentMonth) && (
                    <div className="row my-1 my-sm-4 pb-0 pb-lg-2">
                      {stats.packages.viewsMonthly && (
                        <div
                          className={
                            !isUndefined(stats.packages.topViewsCurrentMonth) ? 'col-12 col-lg-8 col-xxl-9' : 'col-12'
                          }
                        >
                          <div
                            className={classnames('mt-2 mt-sm-4 mb-1 mb-sm-4 mb-lg-0', {
                              'pe-0 pe-lg-3 pe-xxxl-4': !isUndefined(stats.packages.topViewsCurrentMonth),
                            })}
                          >
                            <div className={`card ${styles.chartWrapper}`}>
                              {(stats.packages.viewsMonthly!.length === 0 || isLoading) && <Loading />}
                              <ReactApexChart
                                options={getBarChartConfig(
                                  'viewsMonthly',
                                  'Packages monthly views',
                                  true,
                                  stats.packages.viewsMonthly.length,
                                  stats.packages.viewsMonthly.length > 0
                                    ? stats.packages.viewsMonthly.slice(-1)[0][0]
                                    : undefined
                                )}
                                series={[{ name: 'Monthly views', data: stats.packages.viewsMonthly }]}
                                type="bar"
                                height={300}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {stats.packages.topViewsCurrentMonth && (
                        <div className="col-12 col-lg-4 col-xxl-3 mt-2 mt-sm-4 mt-lg-0">
                          <div className={`mt-0 mt-lg-4 ps-0 ps-lg-3 ps-xxxl-4 ${styles.listWrapper}`}>
                            <div className={`card h-100 ${styles.chartWrapper}`}>
                              {(stats.packages.topViewsCurrentMonth!.length === 0 || isLoading) && <Loading />}
                              <PackagesList title="Most viewed this month" data={stats.packages.topViewsCurrentMonth} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {(stats.packages.viewsDaily || stats.packages.topViewsToday) && (
                    <div className="row my-1 my-sm-4 pb-2 pb-sm-4">
                      {stats.packages.viewsDaily && (
                        <div
                          className={
                            !isUndefined(stats.packages.topViewsToday) ? 'col-12 col-lg-8 col-xxl-9' : 'col-12'
                          }
                        >
                          <div
                            className={classnames('mt-2 mt-sm-4 mb-1 mb-sm-4 mb-lg-0', {
                              'pe-0 pe-lg-3 pe-xxxl-4': !isUndefined(stats.packages.topViewsToday),
                            })}
                          >
                            <div className={`card ${styles.chartWrapper}`}>
                              {(stats.packages.viewsDaily!.length === 0 || isLoading) && <Loading />}
                              <ReactApexChart
                                options={getBarChartConfig(
                                  'viewsDaily',
                                  'Packages daily views',
                                  false,
                                  stats.packages.viewsDaily.length,
                                  stats.packages.viewsDaily.length > 0
                                    ? stats.packages.viewsDaily.slice(-1)[0][0]
                                    : undefined
                                )}
                                series={[{ name: 'Daily views', data: stats.packages.viewsDaily }]}
                                type="bar"
                                height={300}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {stats.packages.topViewsToday && (
                        <div className="col-12 col-lg-4 col-xxl-3 mt-2 mt-sm-4 mt-lg-0">
                          <div className={`mt-0 mt-lg-4 ps-0 ps-lg-3 ps-xxxl-4 ${styles.listWrapper}`}>
                            <div className={`card h-100 ${styles.chartWrapper}`}>
                              {(stats.packages.topViewsToday!.length === 0 || isLoading) && <Loading />}
                              <PackagesList title="Most viewed today" data={stats.packages.topViewsToday} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {(stats.packages.runningTotal ||
                stats.snapshots.runningTotal ||
                stats.packages.createdMonthly ||
                stats.snapshots.createdMonthly) && (
                <>
                  <AnchorHeader
                    level={2}
                    scrollIntoView={scrollIntoView}
                    className={`mt-2 mt-sm-4 mb-2 mb-sm-4 fw-semibold ${styles.title}`}
                    title="Packages and releases"
                  />

                  {(stats.packages.runningTotal || stats.snapshots.runningTotal) && (
                    <div className="row my-1 my-sm-4 pb-0 pb-lg-2">
                      {stats.packages.runningTotal && (
                        <div className={classnames('col-12', { 'col-lg-6': stats.snapshots.runningTotal })}>
                          <div className="pe-0 pe-lg-3 pe-xxxl-4 mt-2 mt-sm-4 mb-2 mb-sm-4 mb-lg-0">
                            <div className={`card ${styles.chartWrapper}`}>
                              {(stats.snapshots.runningTotal!.length === 0 || isLoading) && <Loading />}
                              <ReactApexChart
                                options={getAreaChartConfig('Packages available')}
                                series={[{ name: 'Packages', data: stats.packages.runningTotal }]}
                                type="area"
                                height={300}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {stats.snapshots.runningTotal && (
                        <div className={classnames('col-12', { 'col-lg-6': stats.packages.runningTotal })}>
                          <div className="ps-0 ps-lg-3 ps-xxxl-4 mt-2 mt-sm-4">
                            <div className={`card ${styles.chartWrapper}`}>
                              {(stats.packages.runningTotal!.length === 0 || isLoading) && <Loading />}
                              <ReactApexChart
                                options={getAreaChartConfig('Releases available')}
                                series={[{ name: 'Releases', data: stats.snapshots.runningTotal }]}
                                type="area"
                                height={300}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {(stats.packages.createdMonthly || stats.snapshots.createdMonthly) && (
                    <div className="row my-1 my-sm-4 pb-0 pb-lg-4">
                      {stats.packages.createdMonthly && (
                        <div className={classnames('col-12', { 'col-lg-6': stats.snapshots.createdMonthly })}>
                          <div className="pe-0 pe-lg-3 pe-xxxl-4 mt-2 mt-sm-4 mb-2 mb-sm-4 mb-lg-0">
                            <div className={`card ${styles.chartWrapper}`}>
                              {(stats.packages.createdMonthly!.length === 0 || isLoading) && <Loading />}
                              <BrushChart
                                series={stats.packages.createdMonthly}
                                title="New packages added monthly"
                                id="packages"
                                activeTheme={activeTheme}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {stats.snapshots.createdMonthly && (
                        <div className={classnames('col-12', { 'col-lg-6': stats.packages.createdMonthly })}>
                          <div className="ps-0 ps-lg-3 ps-xxxl-4 mt-2 mt-sm-4 mb-1 mb-sm-4 mb-lg-0">
                            <div className={`card ${styles.chartWrapper}`}>
                              {(stats.snapshots.createdMonthly!.length === 0 || isLoading) && <Loading />}
                              <BrushChart
                                series={stats.snapshots.createdMonthly}
                                title="New releases added monthly"
                                id="releases"
                                activeTheme={activeTheme}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {stats.repositories.runningTotal && (
                <>
                  <AnchorHeader
                    level={2}
                    scrollIntoView={scrollIntoView}
                    className={`mb-2 mb-sm-4 mt-2 mt-sm-4 fw-semibold ${styles.title}`}
                    title="Repositories"
                  />

                  <div className="row my-1 my-sm-4">
                    <div className="col-12 my-2 my-sm-4">
                      <div className={`card ${styles.chartWrapper}`}>
                        {(stats.repositories.runningTotal!.length === 0 || isLoading) && <Loading />}
                        <ReactApexChart
                          options={getAreaChartConfig('Registered repositories')}
                          series={[{ name: 'Repositories', data: stats.repositories.runningTotal }]}
                          type="area"
                          height={300}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {(stats.organizations.runningTotal || stats.users.runningTotal) && (
                <>
                  <AnchorHeader
                    level={2}
                    scrollIntoView={scrollIntoView}
                    className={`mt-1 mt-sm-4 fw-semibold ${styles.title}`}
                    title="Organizations and users"
                  />
                  <div className="row mt-1 mt-sm-4 mb-4">
                    {stats.organizations.runningTotal && (
                      <div className={classnames('col-12', { 'col-lg-6': stats.users.runningTotal })}>
                        <div className="pe-0 pe-lg-3 pe-xxxl-4 pt-2 pt-sm-4">
                          <div className={`card ${styles.chartWrapper}`}>
                            {(stats.organizations.runningTotal!.length === 0 || isLoading) && <Loading />}
                            <ReactApexChart
                              options={getAreaChartConfig('Registered organizations', true)}
                              series={[
                                {
                                  name: 'Organizations',
                                  data: stats.organizations.runningTotal,
                                },
                              ]}
                              type="area"
                              height={300}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {stats.users.runningTotal && (
                      <div className={classnames('col-12', { 'col-lg-6': stats.organizations.runningTotal })}>
                        <div className="ps-0 ps-lg-3 ps-xxxl-4 pt-2 pt-sm-4 my-1 my-sm-4 my-lg-0">
                          <div className={`card ${styles.chartWrapper}`}>
                            {(stats.users.runningTotal!.length === 0 || isLoading) && <Loading />}
                            <ReactApexChart
                              options={getAreaChartConfig('Registered users', true)}
                              series={[
                                {
                                  name: 'Users',
                                  data: stats.users.runningTotal,
                                },
                              ]}
                              type="area"
                              height={300}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default StatsView;
