'use client';
import RegionDropdown from '../common/RegionDropdown';
import DateRangePicker from '../common/DateRangePicker';
import NotificationIcon from '../common/NotificationIcon';
import ProfileAvatar from '../common/ProfileAvatar';

export default function Navbar({ onRegionChange, onDateRangeChange }) {
  return (
    <nav className="bg-white shadow-sm px-6 py-3 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <div className="text-xl font-bold text-blue-600">GeoIntel</div>
        <RegionDropdown onChange={onRegionChange} />
        <DateRangePicker onChange={onDateRangeChange} />
      </div>
      <div className="flex items-center space-x-4">
        <NotificationIcon />
        <ProfileAvatar name="Admin" />
      </div>
    </nav>
  );
}