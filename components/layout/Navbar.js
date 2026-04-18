'use client';
import RegionDropdown from '../common/RegionDropdown';
import DateRangePicker from '../common/DateRangePicker';
import NotificationIcon from '../common/NotificationIcon';
import ProfileAvatar from '../common/ProfileAvatar';

export default function Navbar({ user, onLogout, onRegionChange, onDateRangeChange }) {
  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-3 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-2 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#168c7a] font-bold text-white">G</div>
          <div>
            <div className="text-lg font-bold text-slate-950">GeoIntel</div>
            <div className="text-xs text-slate-500">Live command view</div>
          </div>
        </div>
        <RegionDropdown onChange={onRegionChange} />
        <DateRangePicker onChange={onDateRangeChange} />
      </div>
      <div className="flex items-center gap-3">
        <NotificationIcon />
        <ProfileAvatar name={user?.name || 'User'} />
        <button
          type="button"
          onClick={onLogout}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#168c7a] hover:text-[#116f61]"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
