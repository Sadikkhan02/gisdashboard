'use client';
import FeedItem from './FeedItem';

const mockEvents = [
  { id: 1, title: 'Accident on Highway', timestamp: '2 min ago', location: 'Sector 12', severity: 'high' },
  { id: 2, title: 'Protest rally', timestamp: '15 min ago', location: 'City Center', severity: 'medium' },
  { id: 3, title: 'Power outage', timestamp: '1 hour ago', location: 'Industrial Area', severity: 'low' },
];

export default function FeedPanel({ events = mockEvents }) {
  return (
    <div className="h-full overflow-y-auto rounded-lg bg-white p-4 shadow">
      <h3 className="mb-4 font-semibold">Live Activity Feed</h3>
      <div className="space-y-2">
        {events.map((event) => <FeedItem key={event.id} {...event} />)}
      </div>
    </div>
  );
}
