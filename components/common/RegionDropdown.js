'use client';
import { useState } from 'react';

export default function RegionDropdown({ onChange }) {
  const regions = ['All Regions', 'North', 'South', 'East', 'West'];
  const [selected, setSelected] = useState('All Regions');

  return (
    <select
      value={selected}
      onChange={(e) => {
        setSelected(e.target.value);
        onChange(e.target.value);
      }}
      className="border rounded px-3 py-1 text-sm"
    >
      {regions.map(r => <option key={r}>{r}</option>)}
    </select>
  );
}