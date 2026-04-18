import Card from '../common/Card';

export default function KPICard({ title, value, change, changeType }) {
  const changeColor = changeType === 'up' ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50';
  const changeIcon = changeType === 'up' ? 'Rise' : 'Drop';

  return (
    <Card className="min-h-[132px]">
      <div className="text-sm font-medium text-slate-500">{title}</div>
      <div className="mt-3 text-3xl font-bold text-slate-950">{value}</div>
      <div className={`mt-4 inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${changeColor}`}>
        {changeIcon} {change}% from last period
      </div>
    </Card>
  );
}
