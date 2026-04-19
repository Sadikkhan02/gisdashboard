'use client';
import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/store/appStore';

export default function NotificationIcon() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  const unreadCounts = useAppStore((state) => state.unreadCounts || {});
  const chatUsers = useAppStore((state) => state.chatUsers || []);
  const chatGroups = useAppStore((state) => state.chatGroups || []);
  const setCurrentView = useAppStore((state) => state.setCurrentView);
  const setActiveChatId = useAppStore((state) => state.setActiveChatId);

  const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
  
  const notifications = Object.entries(unreadCounts)
    .filter(([_, count]) => count > 0)
    .map(([chatId, count]) => {
      const chat = [...chatUsers, ...chatGroups].find(c => c.id === chatId);
      return {
        id: chatId,
        name: chat?.name || 'Unknown User',
        count,
        type: chat?.type || 'user'
      };
    });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (chatId) => {
    setActiveChatId(chatId);
    setCurrentView('connect');
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`relative rounded-lg border p-2 transition shadow-sm ${isOpen ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-700 hover:border-teal-500'}`} 
        type="button"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {totalUnread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 origin-top-right rounded-xl border border-slate-200 bg-white shadow-2xl ring-1 ring-black/5 z-[3000]">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900">Notifications</h3>
          </div>
          
          <div className="max-h-80 overflow-y-auto py-2">
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700 font-bold text-xs uppercase">
                    {notif.name.slice(0, 2)}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="text-sm font-semibold text-slate-900 truncate">{notif.name}</div>
                    <div className="text-xs text-teal-600 font-medium">{notif.count} new message{notif.count > 1 ? 's' : ''}</div>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-teal-500"></div>
                </button>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <div className="mb-2 text-slate-300">
                   <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                </div>
                <div className="text-sm font-medium text-slate-500">No new notifications</div>
                <div className="text-[11px] text-slate-400 mt-1">You're all caught up!</div>
              </div>
            )}
          </div>
          
          {notifications.length > 0 && (
            <div className="p-2 border-t border-slate-100">
              <button 
                onClick={() => { setCurrentView('connect'); setIsOpen(false); }}
                className="w-full rounded-lg py-2 text-center text-xs font-bold text-teal-600 hover:bg-teal-50 transition"
              >
                Go to Messenger
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
