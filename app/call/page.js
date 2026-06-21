'use client';

import { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import VideoCallWorkspace from '@/components/video/VideoCallWorkspace';
import { useWebRTC } from '@/hooks/useWebRTC';
import { readCurrentUser } from '@/lib/auth-session';
import { getSocketClient } from '@/lib/socket-client';
import { clearCallIntent, readCallIntent } from '@/lib/call-session';
import { useAppStore } from '@/store/appStore';

function CallWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasExecutedIntentRef = useRef(false);
  const hadLiveCallRef = useRef(false);
  const currentUser = useAppStore((state) => state.currentUser);
  const currentUserId = useAppStore((state) => state.currentUserId);
  const setCurrentUser = useAppStore((state) => state.setCurrentUser);
  const setCallNotification = useAppStore((state) => state.setCallNotification);
  const [intent, setIntent] = useState(null);
  const [isIntentLoading, setIsIntentLoading] = useState(true);
  const [intentError, setIntentError] = useState('');
  const intentId = searchParams.get('intent');

  useEffect(() => {
    const storedUser = readCurrentUser();

    if (!storedUser) {
      router.replace('/login');
      return;
    }

    if (!currentUserId) {
      setCurrentUser(storedUser);
    }

  }, [currentUserId, router, setCurrentUser]);

  useEffect(() => {
    let timeoutId;
    let attempts = 0;

    hasExecutedIntentRef.current = false;
    hadLiveCallRef.current = false;

    const loadIntent = () => {
      const nextIntent = readCallIntent(intentId || undefined);

      if (nextIntent) {
        setIntent(nextIntent);
        setIsIntentLoading(false);
        return;
      }

      attempts += 1;
      if (attempts >= 20) {
        setIntent(null);
        setIsIntentLoading(false);
        return;
      }

      timeoutId = window.setTimeout(loadIntent, 100);
    };

    timeoutId = window.setTimeout(() => {
      setIsIntentLoading(true);
      setIntent(null);
      loadIntent();
    }, 0);

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [intentId]);

  const activeChatUser = useMemo(() => {
    if (!intent || intent.action !== 'start') {
      return null;
    }

    return intent.activeChatUser;
  }, [intent]);

  const recordCallHistory = (message, receiverId) => {
    if (!receiverId || !currentUserId) {
      return;
    }

    getSocketClient().emit('send_message', {
      senderId: currentUserId,
      senderName: currentUser?.name || intent?.currentUserName || 'Team member',
      receiverId,
      message,
      type: 'call',
    });
  };

  const {
    localVideoRef,
    callStatus,
    setCallStatus,
    setCallInfo,
    callInfo,
    callError,
    remoteParticipants,
    audioEnabled,
    videoEnabled,
    isScreenSharing,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    startVideoCall,
    acceptCall,
    rejectCall,
    endCall,
  } = useWebRTC({
    currentUserId,
    currentUserName: currentUser?.name || intent?.currentUserName || 'Team member',
    activeChatUser,
    onCallHistoryRecord: recordCallHistory,
    onCallEnd: () => {
      setCallNotification(null);
      clearCallIntent();
    },
  });

  useEffect(() => {
    if (!intent || !currentUserId || hasExecutedIntentRef.current) {
      return;
    }

    const runIntent = async () => {
      try {
        if (intent.action === 'start') {
          await startVideoCall();
        } else if (intent.action === 'accept' && intent.call) {
          setCallInfo(intent.call);
          setCallStatus('incoming');
          setCallNotification(null);
          await acceptCall(intent.call);
        } else {
          setIntentError('This call request is invalid. Please start the call again from the main app.');
        }

        clearCallIntent();
      } catch (error) {
        setIntentError(error.message || 'Could not launch the call.');
      }
    };

    hasExecutedIntentRef.current = true;
    runIntent();
  }, [acceptCall, currentUserId, intent, setCallInfo, setCallNotification, setCallStatus, startVideoCall]);

  useEffect(() => {
    if (callStatus !== 'idle') {
      hadLiveCallRef.current = true;
      return;
    }

    if (!hadLiveCallRef.current || callError) {
      return;
    }

    if (window.opener) {
      window.close();
      return;
    }

    router.replace('/dashboard');
  }, [callError, callStatus, router]);

  const handleEndCall = () => {
    endCall();
    clearCallIntent();

    if (window.opener) {
      window.close();
      return;
    }

    router.replace('/dashboard');
  };

  const handleLeavePage = () => {
    if (callStatus !== 'idle') {
      handleEndCall();
      return;
    }

    router.replace('/dashboard');
  };

  if (!currentUserId || isIntentLoading) {
    return <div className="grid min-h-screen place-items-center bg-slate-950 text-sm text-slate-300">Opening call workspace...</div>;
  }

  if (intentError) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 px-6 text-white">
        <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-slate-900/90 p-8 text-center shadow-2xl">
          <div className="text-xl font-semibold">Call workspace unavailable</div>
          <p className="mt-3 text-sm text-slate-400">{intentError}</p>
          <button
            type="button"
            onClick={handleLeavePage}
            className="mt-6 rounded-full bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-500"
          >
            Back to dashboard
          </button>
        </div>
      </main>
    );
  }

  if (!intent) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 px-6 text-white">
        <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-slate-900/90 p-8 text-center shadow-2xl">
          <div className="text-xl font-semibold">Call workspace unavailable</div>
          <p className="mt-3 text-sm text-slate-400">
            No active call request was found. Start or join a call from the main app.
          </p>
          <button
            type="button"
            onClick={handleLeavePage}
            className="mt-6 rounded-full bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-500"
          >
            Back to dashboard
          </button>
        </div>
      </main>
    );
  }

  if (callStatus === 'idle' && callError) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 px-6 text-white">
        <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-slate-900/90 p-8 text-center shadow-2xl">
          <div className="text-xl font-semibold">Could not start the call</div>
          <p className="mt-3 text-sm text-slate-400">{callError}</p>
          <button
            type="button"
            onClick={handleLeavePage}
            className="mt-6 rounded-full bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-500"
          >
            Back to dashboard
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleLeavePage}
        className="absolute left-4 top-4 z-20 rounded-full border border-white/10 bg-slate-900/80 px-4 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-slate-800 sm:left-6 sm:top-6"
      >
        {callStatus === 'idle' ? 'Back to dashboard' : 'End and close'}
      </button>

      <VideoCallWorkspace
        callStatus={callStatus}
        callInfo={callInfo}
        callError={callError}
        remoteParticipants={remoteParticipants}
        localVideoRef={localVideoRef}
        audioEnabled={audioEnabled}
        videoEnabled={videoEnabled}
        isScreenSharing={isScreenSharing}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onStartScreenShare={startScreenShare}
        onStopScreenShare={stopScreenShare}
        onAccept={() => acceptCall(callInfo)}
        onReject={rejectCall}
        onEnd={handleEndCall}
      />
    </div>
  );
}

export default function CallPage() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center bg-slate-950 text-sm text-slate-300">Loading call workspace...</div>}>
      <CallWorkspace />
    </Suspense>
  );
}
