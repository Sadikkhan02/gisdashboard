'use client';

import { useEffect, useRef } from 'react';

export default function RemoteVideoTile({ participant }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-slate-900 shadow-lg transition-all hover:border-white/20">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="h-48 w-full object-cover sm:h-56"
      />
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950/80 to-transparent px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
          <span className="text-xs font-medium text-white shadow-sm">
            {participant.name || 'Participant'}
          </span>
        </div>
      </div>
    </div>
  );
}
