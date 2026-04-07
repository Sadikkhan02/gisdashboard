export default function FeedItem({ title, timestamp, location, severity }) {
  const severityColor = {
    low: 'bg-green-500',
    medium: 'bg-yellow-500',
    high: 'bg-red-500',
  }[severity] || 'bg-gray-500';

  return (
    <div className="border-b py-3 flex items-start space-x-3">
      <div className={`w-3 h-3 rounded-full mt-1 ${severityColor}`}></div>
      <div className="flex-1">
        <div className="font-medium">{title}</div>
        <div className="text-sm text-gray-500">{location} • {timestamp}</div>
      </div>
      <span className="text-xs bg-gray-200 px-2 py-1 rounded">#{severity}</span>
    </div>
  );
}