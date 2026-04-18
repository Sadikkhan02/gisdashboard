'use client';

import ReactECharts from 'echarts-for-react';

const colors = ['#0f766e', '#0891b2', '#f59e0b', '#ef4444'];

export default function PieChart({ data }) {
  const option = {
    color: colors,
    tooltip: { trigger: 'item' },
    legend: {
      bottom: 0,
      textStyle: { color: '#334155', fontWeight: 600 },
    },
    series: [
      {
        type: 'pie',
        radius: ['45%', '70%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 3 },
        label: { show: true, formatter: '{b}: {c}', color: '#1f2937', fontWeight: 600 },
        data,
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 260, width: '100%' }} opts={{ renderer: 'svg' }} />;
}
