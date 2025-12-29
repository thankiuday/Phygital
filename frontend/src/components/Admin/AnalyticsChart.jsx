/**
 * Analytics Chart Wrapper Component
 * Reusable wrapper for ApexCharts with consistent styling
 */

import React from 'react'
import Chart from 'react-apexcharts'

const AnalyticsChart = ({
  type = 'line',
  title,
  subtitle,
  series,
  options = {},
  height = 350,
  className = ''
}) => {
  // Default chart options with dark theme
  const defaultOptions = {
    theme: {
      mode: 'dark'
    },
    chart: {
      type: type,
      background: 'transparent',
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true
        }
      },
      zoom: {
        enabled: true
      }
    },
    colors: [
      '#00d4ff', // neon-blue
      '#a855f7', // neon-purple
      '#ec4899', // neon-pink
      '#10b981', // neon-green
      '#f59e0b', // neon-orange
      '#ef4444', // neon-red
    ],
    stroke: {
      curve: 'smooth',
      width: 2
    },
    fill: {
      opacity: 0.1,
      type: 'gradient',
      gradient: {
        shade: 'dark',
        type: 'vertical',
        shadeIntensity: 0.5,
        gradientToColors: undefined,
        inverseColors: false,
        opacityFrom: 0.1,
        opacityTo: 0.05,
        stops: [0, 90, 100]
      }
    },
    grid: {
      borderColor: 'rgba(148, 163, 184, 0.1)',
      strokeDashArray: 4,
      xaxis: {
        lines: {
          show: false
        }
      },
      yaxis: {
        lines: {
          show: true
        }
      }
    },
    xaxis: {
      labels: {
        style: {
          colors: '#cbd5e1'
        }
      },
      axisBorder: {
        color: 'rgba(148, 163, 184, 0.1)'
      },
      axisTicks: {
        color: 'rgba(148, 163, 184, 0.1)'
      }
    },
    yaxis: {
      labels: {
        style: {
          colors: '#cbd5e1'
        }
      }
    },
    legend: {
      labels: {
        colors: '#cbd5e1'
      },
      position: 'top',
      horizontalAlign: 'right'
    },
    tooltip: {
      theme: 'dark',
      style: {
        fontSize: '12px'
      }
    },
    title: {
      text: title,
      align: 'left',
      style: {
        fontSize: '18px',
        fontWeight: 600,
        color: '#f1f5f9'
      }
    },
    subtitle: {
      text: subtitle,
      align: 'left',
      style: {
        fontSize: '12px',
        color: '#94a3b8'
      }
    },
    dataLabels: {
      enabled: false
    },
    ...options
  }

  return (
    <div className={`bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4 sm:p-6 ${className}`}>
      <Chart
        options={defaultOptions}
        series={series}
        type={type}
        height={height}
      />
    </div>
  )
}

export default AnalyticsChart























