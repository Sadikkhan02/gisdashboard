import Card from '../common/Card';

export default function KPICard({ title, value, change, changeType }) {
  const changeColor = changeType === 'up' ? 'text-green-600' : 'text-red-600';
  const changeIcon = changeType === 'up' ? '?' : '?';

  return (
    <Card>
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className={`text-sm ${changeColor}`}>
        {changeIcon} {change}% from last period
      </div>
    </Card>
  );
}
