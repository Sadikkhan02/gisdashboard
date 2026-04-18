'use client';

import ReactECharts from 'echarts-for-react';

export default function AreaChart({ data }) {
  const option = {
    tooltip: { trigger: 'axis' },
    legend: {
      top: 0,
      textStyle: { color: '#334155', fontWeight: 600 },
    },
    grid: { left: 10, right: 10, top: 40, bottom: 10, containLabel: true },
    xAxis: {
      type: 'category',
      data: data.map((item) => item.label),
      axisLabel: { color: '#334155' },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#e5e7eb' } },
      axisLabel: { color: '#475569' },
    },
    series: [
      {
        name: 'Current',
        data: data.map((item) => item.primary),
        type: 'line',
        smooth: true,
        areaStyle: { color: 'rgba(14, 116, 144, 0.2)' },
        lineStyle: { color: '#0e7490', width: 3 },
        itemStyle: { color: '#0e7490' },
      },
      {
        name: 'Previous',
        data: data.map((item) => item.secondary),
        type: 'line',
        smooth: true,
        areaStyle: { color: 'rgba(245, 158, 11, 0.18)' },
        lineStyle: { color: '#f59e0b', width: 2 },
        itemStyle: { color: '#f59e0b' },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 280, width: '100%' }} opts={{ renderer: 'svg' }} />;
}
