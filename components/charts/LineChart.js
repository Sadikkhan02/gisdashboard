'use client';

import ReactECharts from 'echarts-for-react';

export default function LineChart({ data }) {
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
        name: 'Crime',
        data: data.map((item) => item.crime),
        type: 'line',
        smooth: true,
        lineStyle: { width: 3, color: '#0f766e' },
        itemStyle: { color: '#0f766e' },
      },
      {
        name: 'Baseline',
        data: data.map((item) => item.baseline),
        type: 'line',
        smooth: true,
        lineStyle: { width: 2, color: '#94a3b8', type: 'dashed' },
        itemStyle: { color: '#94a3b8' },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 280, width: '100%' }} opts={{ renderer: 'svg' }} />;
}
