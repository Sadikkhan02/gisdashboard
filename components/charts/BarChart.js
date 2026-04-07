'use client';

import ReactECharts from 'echarts-for-react';

export default function BarChart({ data, title, color = '#0f766e' }) {
  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    grid: { left: 10, right: 10, top: 40, bottom: 10, containLabel: true },
    xAxis: {
      type: 'category',
      data: data.map((item) => item.name),
      axisLine: { lineStyle: { color: '#d1d5db' } },
      axisLabel: { color: '#4b5563' },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#e5e7eb' } },
      axisLabel: { color: '#6b7280' },
    },
    series: [
      {
        data: data.map((item) => item.value),
        type: 'bar',
        barWidth: '48%',
        itemStyle: {
          color,
          borderRadius: [8, 8, 0, 0],
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 280, width: '100%' }} opts={{ renderer: 'svg' }} />;
}
