export default function FeedItem({ title, timestamp, location, severity }) {
  const severityTone = {
    low: {
      dot: 'bg-emerald-600',
      badge: 'bg-emerald-50 text-emerald-700',
    },
    medium: {
      dot: 'bg-amber-500',
      badge: 'bg-amber-50 text-amber-800',
    },
    high: {
      dot: 'bg-rose-600',
      badge: 'bg-rose-50 text-rose-700',
    },
  }[severity] || {
    dot: 'bg-slate-500',
    badge: 'bg-slate-100 text-slate-700',
  };

  return (
    <div className="flex items-start gap-3 border-b border-slate-100 py-3 last:border-b-0">
      <div className={`mt-1 h-3 w-3 rounded-full ${severityTone.dot}`} />
      <div className="flex-1">
        <div className="font-medium text-slate-950">{title}</div>
        <div className="text-sm text-slate-500">{location} - {timestamp}</div>
      </div>
      <span className={`rounded px-2 py-1 text-xs font-semibold ${severityTone.badge}`}>#{severity}</span>
    </div>
  );
}
