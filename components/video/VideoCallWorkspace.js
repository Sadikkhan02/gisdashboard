'use client';

import RemoteVideoTile from './RemoteVideoTile';

function CallStatusLabel({ callStatus, callInfo }) {
  if (callStatus === 'incoming') {
    return `${callInfo?.fromName || 'Team member'} is calling...`;
  }

  if (callStatus === 'outgoing') {
    return `Calling ${callInfo?.peerName || callInfo?.targetName || 'team member'}...`;
  }

  if (callStatus === 'active') {
    return callInfo?.type === 'group'
      ? `Group Call: ${callInfo?.groupName || 'Team'}`
      : `Call with ${callInfo?.peerName || callInfo?.fromName || 'Partner'}`;
  }

  return 'Call ended';
}

export default function VideoCallWorkspace({
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

  const totalParticipants = remoteParticipants.length + 1;
  const primaryParticipant = remoteParticipants[0];
  const additionalParticipants = remoteParticipants.slice(1);

  return (
    <section className="flex min-h-screen flex-col bg-slate-950 text-white">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-300">
            Secure video workspace
          </div>
          <h1 className="mt-1 truncate text-lg font-semibold sm:text-2xl">
            <CallStatusLabel callStatus={callStatus} callInfo={callInfo} />
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Full-screen layout for easier collaboration and screen sharing · {totalParticipants} participant{totalParticipants > 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {callStatus === 'active' && (
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/80 p-1">
              <button
                type="button"
                onClick={onToggleAudio}
                className={`flex h-11 w-11 items-center justify-center rounded-full transition ${audioEnabled ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'}`}
                title={audioEnabled ? 'Mute' : 'Unmute'}
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
                className={`flex h-11 w-11 items-center justify-center rounded-full transition ${videoEnabled ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'}`}
                title={videoEnabled ? 'Stop video' : 'Start video'}
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
                className={`flex h-11 w-11 items-center justify-center rounded-full transition ${isScreenSharing ? 'bg-teal-500/20 text-teal-300 hover:bg-teal-500/30' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
                title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="14" x="3" y="3" rx="2"/><path d="M17 21H7"/><path d="m9 11 3 3 3-3"/><path d="M12 7v7"/></svg>
              </button>
            </div>
          )}

          {callStatus === 'incoming' && (
            <>
              <button
                type="button"
                onClick={onAccept}
                className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={onReject}
                className="rounded-full bg-slate-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-600"
              >
                Decline
              </button>
            </>
          )}

          {['outgoing', 'active', 'ended'].includes(callStatus) && (
            <button
              type="button"
              onClick={onEnd}
              className="rounded-full bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-500"
            >
              End Call
            </button>
          )}
        </div>
      </div>

      {callError && (
        <div className="mx-4 mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 sm:mx-6">
          {callError}
        </div>
      )}

      <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6 xl:flex-row">
        <div className="relative min-h-[24rem] flex-1 overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl">
          {primaryParticipant ? (
            <RemoteVideoTile participant={primaryParticipant} className="h-full rounded-none border-0" videoClassName="h-full min-h-[24rem]" />
          ) : (
            <div className="flex h-full min-h-[24rem] items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.18),_transparent_40%),linear-gradient(180deg,_#0f172a,_#020617)]">
              <div className="text-center">
                <div className="text-base font-semibold text-white">
                  {callStatus === 'incoming' ? 'Ready to join the call' : 'Waiting for others to connect'}
                </div>
                <div className="mt-2 text-sm text-slate-400">
                  This view stays full-screen so screen sharing feels much more natural.
                </div>
              </div>
            </div>
          )}

          <div className="absolute bottom-4 right-4 h-32 w-48 overflow-hidden rounded-2xl border border-teal-400/30 bg-slate-950 shadow-2xl sm:h-40 sm:w-64">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 to-transparent px-3 py-2 text-xs font-semibold text-white">
              {isScreenSharing ? 'Your screen' : 'You'}
            </div>
          </div>
        </div>

        <aside className="grid w-full gap-4 xl:w-[24rem]">
          {additionalParticipants.map((participant) => (
            <RemoteVideoTile
              key={participant.userId}
              participant={participant}
              className="min-h-[12rem]"
              videoClassName="h-full min-h-[12rem]"
            />
          ))}

          {additionalParticipants.length === 0 && (
            <div className="flex min-h-[12rem] items-center justify-center rounded-3xl border border-dashed border-white/10 bg-slate-900/70 px-6 text-center text-sm text-slate-400">
              Extra participants will appear here, while the main speaker or shared screen stays large.
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
