'use client';
import { useState } from 'react';

export default function DateRangePicker({ onChange }) {
  const [range, setRange] = useState('Last 7 days');
  return (
    <select
      value={range}
      onChange={(e) => {
        setRange(e.target.value);
        onChange(e.target.value);
      }}
      className="border rounded px-3 py-1 text-sm"
    >
      <option>Last 7 days</option>
      <option>Last 30 days</option>
      <option>This year</option>
    </select>
  );
}