'use client';
import { useAppStore } from '@/store/appStore';
import { getSocketClient } from '@/lib/socket-client';

export default function CallNotificationOverlay() {
  const currentUserId = useAppStore((state) => state.currentUserId);
  const callNotification = useAppStore((state) => state.callNotification);
  const setCallNotification = useAppStore((state) => state.setCallNotification);
  const setCurrentView = useAppStore((state) => state.setCurrentView);

  if (!callNotification) return null;

  const handlePickCall = () => {
    // Redirect to connect view which will handle the call logic
    setCurrentView('connect');
    // Note: The Pick call modal in ChatBox will show up because callNotification is in the store
  };

  const handleDecline = () => {
    const socket = getSocketClient();
    
    if (callNotification.type === 'group') {
      setCallNotification(null);
      return;
    }

    if (callNotification.fromUserId) {
      socket.emit('reject_call', {
        callId: callNotification.callId,
        fromUserId: currentUserId,
        toUserId: callNotification.fromUserId,
      });
    }

    setCallNotification(null);
  };

  return (
    <div className="fixed left-1/2 top-6 z-[2000] w-[min(94vw,480px)] -translate-x-1/2 rounded-xl border border-teal-500/30 bg-white p-5 text-slate-950 shadow-[0_20px_50px_rgba(0,0,0,0.2)] ring-1 ring-black/5 backdrop-blur-sm animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700">
           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        </div>
        <div className="flex-1">
          <div className="text-sm font-bold text-slate-900">
            {callNotification.type === 'group' 
              ? `${callNotification.fromName} started a group call` 
              : `Incoming call from ${callNotification.fromName}`}
          </div>
          <div className="text-xs text-slate-500">
            {callNotification.type === 'group' ? callNotification.groupName : 'Direct Video Call'}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={handlePickCall}
            className="rounded-lg bg-teal-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-teal-700 shadow-sm"
          >
            Join Call
          </button>
          <button
            onClick={handleDecline}
            className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-rose-50 hover:text-rose-700"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
