'use client';
import AreaChart from './AreaChart';

export default function IncidentsByHourChart({ data }) {
  const transformedData = data.map((item) => ({
    label: item.label,
    primary: item.value,
    secondary: Math.max(Math.round(item.value * 0.72), 0),
  }));

  return <AreaChart data={transformedData} />;
}
