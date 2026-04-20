'use client';

import { useEffect, useRef } from 'react';
import RemoteVideoTile from './RemoteVideoTile';

export default function VideoCallOverlay({
  callStatus,
  callInfo,
  callError,
  remoteParticipants,
  localVideoRef,
  audioEnabled,
  videoEnabled,
  isScreenSharing,
  onToggleAudio,
  onToggleVideo,
  onStartScreenShare,
  onStopScreenShare,
  onAccept,
  onReject,
  onEnd,
}) {
  if (callStatus === 'idle') return null;

  return (
    <div className="flex flex-col border-b border-slate-200 bg-slate-950 p-4 text-white animate-in fade-in slide-in-from-top-4 duration-300">
      {/* Header Info */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-500/20 text-teal-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight">
                {callStatus === 'incoming' && `${callInfo?.fromName || 'Team member'} is calling...`}
                {callStatus === 'outgoing' && `Calling ${callInfo?.peerName || callInfo?.targetName || 'team member'}...`}
                {callStatus === 'active' && (callInfo?.type === 'group' ? `Group Call: ${callInfo?.groupName || 'Team'}` : `Call with ${callInfo?.peerName || callInfo?.fromName || 'Partner'}`)}
                {callStatus === 'ended' && 'Call ended'}
              </span>
              <span className="flex h-2 w-2">
                <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-500"></span>
              </span>
            </div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
              WebRTC Secure Session • {remoteParticipants.length + 1} Participants
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {callStatus === 'active' && (
            <div className="flex items-center gap-2 rounded-full bg-slate-900/50 p-1 backdrop-blur-md border border-white/5">
              <button
                type="button"
                onClick={onToggleAudio}
                className={`flex h-9 w-9 items-center justify-center rounded-full transition-all ${audioEnabled ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-rose-500/20 text-rose-500 hover:bg-rose-500/30'}`}
                title={audioEnabled ? "Mute" : "Unmute"}
              >
                {audioEnabled ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="2" y1="2" x2="22" y2="22"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
                )}
              </button>
              <button
                type="button"
                onClick={onToggleVideo}
                className={`flex h-9 w-9 items-center justify-center rounded-full transition-all ${videoEnabled ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-rose-500/20 text-rose-500 hover:bg-rose-500/30'}`}
                title={videoEnabled ? "Stop Video" : "Start Video"}
              >
                {videoEnabled ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="2" y1="2" x2="22" y2="22"/><path d="m22 8-6 4 6 4V8Z"/><path d="M14 8H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2"/></svg>
                )}
              </button>
              <button
                type="button"
                onClick={isScreenSharing ? onStopScreenShare : onStartScreenShare}
                className={`flex h-9 w-9 items-center justify-center rounded-full transition-all ${!isScreenSharing ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-teal-500/20 text-teal-400 hover:bg-teal-500/30'}`}
                title={isScreenSharing ? "Stop Sharing" : "Share Screen"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="14" x="3" y="3" rx="2"/><path d="M17 21H7"/><path d="m9 11 3 3 3-3"/><path d="M12 7v7"/></svg>
              </button>
            </div>
          )}

          {callStatus === 'incoming' && (
            <>
              <button
                type="button"
                onClick={() => onAccept()}
                className="group flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2 text-xs font-bold text-white transition-all hover:bg-emerald-500 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] active:scale-95"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                Accept
              </button>
              <button
                type="button"
                onClick={() => onReject()}
                className="group flex items-center gap-2 rounded-full bg-slate-800 px-5 py-2 text-xs font-bold text-white transition-all hover:bg-rose-600 active:scale-95"
              >
                Decline
              </button>
            </>
          )}
          {['outgoing', 'active', 'ended'].includes(callStatus) && (
            <button
              type="button"
              onClick={() => onEnd()}
              className="group flex items-center gap-2 rounded-full bg-rose-600 px-5 py-2 text-xs font-bold text-white transition-all hover:bg-rose-500 hover:shadow-[0_0_15px_rgba(244,63,94,0.4)] active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/><line x1="22" y1="2" x2="2" y2="22"/></svg>
              End Call
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {callError && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-xs text-rose-200">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {callError}
        </div>
      )}

      {/* Video Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Remote Streams */}
        {remoteParticipants.map((participant) => (
          <RemoteVideoTile key={participant.userId} participant={participant} />
        ))}

        {/* Local Stream */}
        <div className="relative overflow-hidden rounded-xl border border-teal-500/30 bg-slate-900 shadow-lg ring-1 ring-teal-500/20">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="h-48 w-full object-cover sm:h-56"
          />
          <div className="absolute inset-0 bg-slate-950/20 pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950/80 to-transparent px-3 py-3">
             <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.6)]" />
              <span className="text-xs font-bold text-white shadow-sm">Your Camera</span>
            </div>
          </div>
          {/* PIP Indicator */}
          <div className="absolute top-3 right-3 rounded bg-teal-500/20 px-1.5 py-0.5 text-[10px] font-bold text-teal-400 backdrop-blur-sm">
            LOCAL
          </div>
        </div>
      </div>
    </div>
  );
}
