'use client';
import PieChart from './PieChart';

export default function DonutChart({ data, title }) {
  return (
    <div className="text-center">
      <h4 className="mb-2 text-sm font-medium">{title}</h4>
      <PieChart data={data} />
    </div>
  );
}
