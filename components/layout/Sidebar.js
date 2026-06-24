'use client';
import { useAppStore } from '@/store/appStore';

// Note: Using custom SVG icons for reliability as lucide-react might not be installed.

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: (active) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={active ? 'text-white' : 'text-slate-400'}><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
  )},
  { id: 'connect', label: 'Connect', icon: (active) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={active ? 'text-white' : 'text-slate-400'}><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
  )},
  { id: 'charts', label: 'Analytics Studio', icon: (active) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={active ? 'text-white' : 'text-slate-400'}><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></svg>
  )},
  { id: 'intelligence', label: 'Intelligence', icon: (active) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={active ? 'text-white' : 'text-slate-400'}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><circle cx="12" cy="11" r="3"/><path d="m15 13-3-3-3 3"/></svg>
  )},
];

function UnreadBadge() {
  const unreadCounts = useAppStore((state) => state.unreadCounts || {});
  const callNotification = useAppStore((state) => state.callNotification);
  const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

  if (totalUnread === 0 && !callNotification) return null;

  return (
    <span className={`absolute -right-1 -top-1 flex items-center justify-center rounded-full ring-2 ring-white ${callNotification ? 'h-5 min-w-5 bg-emerald-500 px-1.5' : 'h-3 w-3 bg-rose-500'}`}>
      <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${callNotification ? 'bg-emerald-400' : 'bg-rose-400'} opacity-75`}></span>
      {callNotification ? <span className="relative text-[9px] font-bold text-white">Call</span> : null}
    </span>
  );
}

export default function Sidebar() {
  const { currentView, setCurrentView, isSidebarExpanded, toggleSidebar } = useAppStore();
  const callNotification = useAppStore((state) => state.callNotification);

  return (
    <aside 
      className={`fixed left-0 top-0 z-[1001] h-screen border-r border-slate-200 bg-white py-6 shadow-sm transition-all duration-300 hidden md:flex flex-col ${
        isSidebarExpanded ? 'w-64' : 'w-20'
      }`}
    >
      <div className={`mb-10 flex items-center px-4 ${isSidebarExpanded ? 'justify-between' : 'justify-center'}`}>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#168c7a] text-white shadow-lg shadow-teal-100">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          {isSidebarExpanded && (
            <div className="overflow-hidden whitespace-nowrap">
              <div className="font-bold text-slate-950">GeoIntel</div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#168c7a]">Command Center</div>
            </div>
          )}
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-2 px-3">
        {navItems.map((item) => {
          const active = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`group relative flex h-12 items-center rounded-xl transition-all duration-200 ${
                isSidebarExpanded ? 'px-4 gap-4 w-full' : 'justify-center w-full'
              } ${
                active 
                  ? 'bg-[#168c7a] text-white shadow-md shadow-teal-100' 
                  : 'hover:bg-slate-50 text-slate-400 hover:text-slate-600'
              }`}
              title={isSidebarExpanded ? '' : item.label}
            >
              <div className="shrink-0 relative">
                {item.icon(active)}
                {item.id === 'connect' && (
                  <UnreadBadge />
                )}
              </div>
              {isSidebarExpanded && (
                <span className="font-medium overflow-hidden whitespace-nowrap">
                  {item.label}
                  {item.id === 'connect' && callNotification ? (
                    <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                      Incoming call
                    </span>
                  ) : null}
                </span>
              )}
              
              {!isSidebarExpanded && (
                <div className="absolute left-16 z-[1010] rounded bg-slate-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none whitespace-nowrap">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-slate-100 p-4">
        <button 
          onClick={toggleSidebar}
          className="flex h-10 w-full items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`transition-transform duration-300 ${isSidebarExpanded ? 'rotate-180' : ''}`}
          >
            <path d="m9 18 6-6-6-6"/>
          </svg>
          {isSidebarExpanded && <span className="ml-2 text-sm font-medium">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
