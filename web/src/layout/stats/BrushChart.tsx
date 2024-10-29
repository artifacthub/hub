import ApexCharts from 'apexcharts';

declare global {
  interface Window {
    ApexCharts: typeof ApexCharts;
  }
}
import moment from 'moment';
import { useEffect } from 'react';
import ReactApexChart from 'react-apexcharts';

import useBreakpointDetect from '../../hooks/useBreakpointDetect';
import getMetaTag from '../../utils/getMetaTag';
import prettifyNumber from '../../utils/prettifyNumber';

window.ApexCharts = ApexCharts;

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  series: any[];
  id: string;
  title: string;
  activeTheme: string;
}

const BrushChart = (props: Props) => {
  const primaryColor = getMetaTag('primaryColor');
  const secondaryColor = getMetaTag('secondaryColor');
  const point = useBreakpointDetect();
  const lastSeriesDate = props.series[props.series.length - 1][0];

  useEffect(() => {
    // We force to use original selection after changing breakpoint
    ApexCharts.exec(
      `${props.id}BrushChart`,
      'updateOptions',
      {
        selection: {
          xaxis: {
            min: moment(lastSeriesDate).subtract(12, 'months').valueOf(), // We select last year
            max: lastSeriesDate,
          },
        },
      },
      false,
      true
    );
  }, [point, props.id, lastSeriesDate]);

  const getBarChartConfig = (): ApexCharts.ApexOptions => {
    return {
      chart: {
        id: `${props.id}BarChart`,
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
          borderRadius: 0,
          dataLabels: {
            position: 'top',
          },
        },
      },
      dataLabels: {
        enabled: true,
        offsetY: -20,
        style: {
          fontSize: '12px',
          colors: ['var(--color-font)'],
        },
        formatter: (value: number) => {
          // Display only one decimal
          return prettifyNumber(value, 1);
        },
      },
      colors: ['var(--color-1-500)'],
      xaxis: {
        type: 'datetime',
        position: 'bottom',
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
        tooltip: {
          enabled: true,
        },
        labels: {
          format: `MM/yy`,
          style: {
            colors: 'var(--color-font)',
          },
        },
      },
      yaxis: {
        labels: {
          style: {
            colors: 'var(--color-font)',
          },
        },
      },
      tooltip: {
        x: {
          format: `MMM'yy`,
        },
      },
      title: {
        text: props.title,
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
          breakpoint: 768,
          options: {
            dataLabels: {
              enabled: false,
            },
          },
        },
      ],
    };
  };

  const getAreaChartConfig = (): ApexCharts.ApexOptions => {
    return {
      chart: {
        id: `${props.id}BrushChart`,
        height: 120,
        type: 'area',
        redrawOnWindowResize: true,
        redrawOnParentResize: false,
        zoom: {
          enabled: false,
        },
        brush: {
          target: `${props.id}BarChart`,
          enabled: true,
          autoScaleYaxis: false,
        },
        selection: {
          enabled: true,
          xaxis: {
            min: moment(lastSeriesDate).subtract(12, 'months').valueOf(), // We select last year
            max: lastSeriesDate,
          },
          fill: {
            color: props.activeTheme === 'dark' ? '#222529' : secondaryColor,
            opacity: 0.2,
          },
          stroke: {
            width: 1,
            dashArray: 4,
            color: props.activeTheme === 'dark' ? '#222529' : secondaryColor,
            opacity: 1,
          },
        },
        fontFamily: 'var(--bs-body-font-family)',
        toolbar: {
          show: false,
        },
      },
      grid: { borderColor: 'var(--border-md)' },
      plotOptions: {
        bar: {
          borderRadius: 0,
          dataLabels: {
            position: 'top',
          },
        },
      },
      colors: ['var(--color-1-500)'],
      xaxis: {
        type: 'datetime',
        position: 'bottom',
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
        tooltip: {
          enabled: true,
        },
        labels: {
          format: `MM/yy`,
          style: {
            colors: 'var(--color-font)',
          },
        },
      },
      yaxis: {
        labels: {
          style: {
            colors: 'var(--color-font)',
          },
        },
      },
      stroke: {
        curve: 'smooth',
      },
      fill: {
        opacity: 0.5,
        colors: [
          () => {
            return props.activeTheme === 'dark' ? '#222529' : primaryColor;
          },
        ],
      },
    };
  };

  return (
    <>
      <ReactApexChart
        options={getBarChartConfig()}
        series={[
          {
            name: props.id === 'releases' ? 'Releases' : 'Packages',
            data: props.series,
          },
        ]}
        type="bar"
        height={300}
      />
      {/* Brush chart is only visible when we have collected data from more than one year */}
      {props.series.length > 12 && (
        <ReactApexChart options={getAreaChartConfig()} series={[{ data: props.series }]} type="area" height={130} />
      )}
    </>
  );
};

export default BrushChart;
