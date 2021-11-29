import classnames from 'classnames';
import { isNull, isUndefined } from 'lodash';
import moment from 'moment';
import { useCallback, useContext, useEffect, useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import { useHistory } from 'react-router-dom';

import API from '../../api';
import { AppCtx } from '../../context/AppCtx';
import { AHStats } from '../../types';
import compoundErrorMessage from '../../utils/compoundErrorMessage';
import getMetaTag from '../../utils/getMetaTag';
import isWhiteLabel from '../../utils/isWhiteLabel';
import AnchorHeader from '../common/AnchorHeader';
import Loading from '../common/Loading';
import NoData from '../common/NoData';
import BrushChart from './BrushChart';
import styles from './StatsView.module.css';

interface Props {
  hash?: string;
}

const StatsView = (props: Props) => {
  const history = useHistory();
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

  const getAreaChartConfig = (title: string, withAnnotations?: boolean): ApexCharts.ApexOptions => {
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
        fontFamily: "'Lato', Roboto, 'Helvetica Neue', Arial, sans-serif !default",
        height: 300,
        type: 'area',
        redrawOnParentResize: false,
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

  const checkCurrentStats = (currentStats: AHStats | null) => {
    if (!isNull(currentStats)) {
      const notEmptyItems = Object.keys(currentStats).some((elem: string) => {
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
      } catch (err: any) {
        setIsLoading(false);
        let error = compoundErrorMessage(err, `An error occurred getting ${siteName} stats`);
        setApiError(error);
        setStats(null);
      }
    }
    getStats();
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  const scrollIntoView = useCallback(
    (id?: string) => {
      const elId = id || props.hash;
      if (isUndefined(elId) || elId === '') return;

      try {
        const element = document.querySelector(elId);
        if (element) {
          element.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'smooth' });
          if (props.hash !== elId) {
            history.push({
              pathname: history.location.pathname,
              hash: elId,
            });
          }
        }
      } finally {
        return;
      }
    },
    [props.hash, history]
  );

  return (
    <div className="d-flex flex-column flex-grow-1 position-relative">
      <main role="main" className="container-lg px-sm-4 px-lg-0 py-5 noFocus" id="content" tabIndex={-1}>
        <div className="flex-grow-1 position-relative">
          <div className={`h2 text-dark text-center ${styles.title}`}>{siteName} Stats</div>

          {apiError && <NoData issuesLinkVisible>{apiError}</NoData>}
          {stats && (
            <>
              <div className="text-center mb-5">
                <small>
                  <span className="text-muted mr-2">Report generated at:</span>
                  {!isUndefined(stats.generatedAt) ? (
                    moment(stats.generatedAt).format('YYYY/MM/DD HH:mm:ss (Z)')
                  ) : (
                    <div className={`d-inline text-secondary ${styles.loading}`} role="status">
                      <span className="spinner-border spinner-border-sm" />
                    </div>
                  )}
                </small>
              </div>

              {emptyStats && (
                <div>
                  <NoData>No Stats available for the moment</NoData>
                </div>
              )}

              {(stats.packages.runningTotal ||
                stats.snapshots.runningTotal ||
                stats.packages.createdMonthly ||
                stats.snapshots.createdMonthly) && (
                <>
                  <AnchorHeader
                    level={2}
                    scrollIntoView={scrollIntoView}
                    className={`mb-4 font-weight-bold ${styles.title}`}
                    title="Packages and releases"
                  />

                  {(stats.packages.runningTotal || stats.snapshots.runningTotal) && (
                    <div className="row my-4 pb-0 pb-lg-4">
                      {stats.packages.runningTotal && (
                        <div className={classnames('col-12', { 'col-lg-6': stats.snapshots.runningTotal })}>
                          <div className="pr-0 pr-lg-3 pr-xxl-4 mt-4 mb-4 mb-lg-0">
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
                          <div className="pl-0 pl-lg-3 pl-xxl-4 mt-4">
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
                    <div className="row my-4 pb-4">
                      {stats.packages.createdMonthly && (
                        <div className={classnames('col-12', { 'col-lg-6': stats.snapshots.createdMonthly })}>
                          <div className="pr-0 pr-lg-3 pr-xxl-4 mt-4 mb-4 mb-lg-0">
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
                          <div className="pl-0 pl-lg-3 pl-xxl-4 mt-4">
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
                    className={`my-4 font-weight-bold ${styles.title}`}
                    title="Repositories"
                  />

                  <div className="row my-4">
                    <div className="col-12 my-4">
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
                    className={`mt-4 font-weight-bold ${styles.title}`}
                    title="Organizations and users"
                  />
                  <div className="row my-4">
                    {stats.organizations.runningTotal && (
                      <div className={classnames('col-12', { 'col-lg-6': stats.users.runningTotal })}>
                        <div className="pr-0 pr-lg-3 pr-xxl-4 pt-4">
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
                        <div className="pl-0 pl-lg-3 pl-xxl-4 pt-4">
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
