import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocketClient } from '@/lib/socket-client';

export function useWebRTC({ currentUserId, currentUserName, activeChatUser, onCallHistoryRecord, onCallEnd }) {
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef(new Map());
  const activeCallRef = useRef(null);

  const [callStatus, setCallStatus] = useState('idle');
  const [callInfo, setCallInfo] = useState(null);
  const [callError, setCallError] = useState('');
  const [remoteParticipants, setRemoteParticipants] = useState([]);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Synchronization: Ensure local stream is attached to the video element whenever it's available/rendered
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [callStatus]); // Re-attach when status changes (overlay mounts)

  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setAudioEnabled((prev) => !prev);
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setVideoEnabled((prev) => !prev);
    }
  }, []);

  const stopLocalMedia = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  }, []);

  const resetCall = useCallback(() => {
    peerConnectionsRef.current.forEach((connection) => connection.close());
    peerConnectionsRef.current.clear();
    activeCallRef.current = null;
    
    stopLocalMedia();
    
    setRemoteParticipants([]);
    setCallStatus('idle');
    setCallInfo(null);
    setAudioEnabled(true);
    setVideoEnabled(true);
    setIsScreenSharing(false);
    
    onCallEnd?.();
  }, [stopLocalMedia, onCallEnd]);

  const getLocalStream = useCallback(async () => {
    if (localStreamRef.current) {
      return localStreamRef.current;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Camera and microphone access is not available in this browser.');
    }

    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStreamRef.current = stream;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    return stream;
  }, []);

  const startScreenShare = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        throw new Error('Screen sharing is not supported in this browser.');
      }

      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];
      const socket = getSocketClient();

      // Replace video track in all peer connections
      peerConnectionsRef.current.forEach((pc) => {
        const senders = pc.getSenders();
        const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(screenTrack);
        }
      });

      // Update local preview
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStream;
      }

      // Signal to others that we are sharing screen
      const call = activeCallRef.current || callInfo;
      if (call) {
        socket.emit('webrtc_screen_share', {
          callId: call.callId,
          fromUserId: currentUserId,
          isSharing: true,
        });
      }

      screenTrack.onended = () => {
        stopScreenShare();
      };

      setIsScreenSharing(true);
    } catch (error) {
      setCallError(`Could not start screen share: ${error.message}`);
    }
  }, [currentUserId, callInfo]);

  const stopScreenShare = useCallback(async () => {
    try {
      const stream = await getLocalStream();
      const videoTrack = stream.getVideoTracks()[0];
      const socket = getSocketClient();

      // Restore video track in all peer connections
      peerConnectionsRef.current.forEach((pc) => {
        const senders = pc.getSenders();
        const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(videoTrack);
        }
      });

      // Restore local preview
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Signal to others that we stopped sharing
      const call = activeCallRef.current || callInfo;
      if (call) {
        socket.emit('webrtc_screen_share', {
          callId: call.callId,
          fromUserId: currentUserId,
          isSharing: false,
        });
      }

      setIsScreenSharing(false);
    } catch (error) {
      setCallError(`Could not restore camera feed: ${error.message}`);
    }
  }, [currentUserId, callInfo, getLocalStream]);

  const removeRemoteParticipant = useCallback((peerUserId) => {
    const connection = peerConnectionsRef.current.get(peerUserId);
    connection?.close();
    peerConnectionsRef.current.delete(peerUserId);
    setRemoteParticipants((current) => current.filter((participant) => participant.userId !== peerUserId));
  }, []);

  const createPeerConnection = useCallback(
    async (peerUserId, callId, peerName = 'Participant') => {
      const existingConnection = peerConnectionsRef.current.get(peerUserId);
      if (existingConnection) {
        return existingConnection;
      }

      const socket = getSocketClient();
      const stream = await getLocalStream();
      const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });

      stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

      peerConnection.ontrack = (event) => {
        const [remoteStream] = event.streams;

        if (remoteStream) {
          setRemoteParticipants((current) => {
            const withoutCurrent = current.filter((participant) => participant.userId !== peerUserId);
            return [...withoutCurrent, { userId: peerUserId, name: peerName, stream: remoteStream }];
          });
        }
      };

      peerConnection.onicecandidate = (event) => {
        if (!event.candidate) {
          return;
        }

        socket.emit('webrtc_ice_candidate', {
          callId,
          fromUserId: currentUserId,
          toUserId: peerUserId,
          candidate: event.candidate,
        });
      };

      peerConnection.onconnectionstatechange = () => {
        if (['failed', 'disconnected', 'closed'].includes(peerConnection.connectionState)) {
          removeRemoteParticipant(peerUserId);
        }
      };

      peerConnectionsRef.current.set(peerUserId, peerConnection);
      return peerConnection;
    },
    [currentUserId, getLocalStream, removeRemoteParticipant]
  );

  const startVideoCall = async () => {
    if (!activeChatUser) {
      setCallError('Select a chat before starting a call.');
      return;
    }

    try {
      setCallError('');
      await getLocalStream();

      if (activeChatUser.type === 'group') {
        const call = {
          callId: `call-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          groupId: activeChatUser.id,
          groupName: activeChatUser.name,
          fromUserId: currentUserId,
          fromName: currentUserName,
          type: 'group',
          peerName: activeChatUser.name,
        };

        activeCallRef.current = call;
        setCallInfo(call);
        setCallStatus('active');
        onCallHistoryRecord?.(`${currentUserName} started a group video call.`, activeChatUser.id);
        getSocketClient().emit('start_group_call', call);
        return;
      }

      const call = {
        callId: `call-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        fromUserId: currentUserId,
        fromName: currentUserName,
        targetId: activeChatUser.id,
        targetName: activeChatUser.name,
        peerUserId: activeChatUser.id,
        peerName: activeChatUser.name,
        type: 'direct',
      };

      activeCallRef.current = call;
      setCallInfo(call);
      setCallStatus('outgoing');
      onCallHistoryRecord?.(`${currentUserName} started a video call.`, activeChatUser.id);
      getSocketClient().emit('start_call', call);
    } catch (error) {
      setCallError(error.message);
      resetCall();
    }
  };

  const acceptCall = async (incomingCallData) => {
    // If incomingCallData is a React event or invalid, fallback to callInfo
    const info = (incomingCallData && typeof incomingCallData === 'object' && incomingCallData.callId) 
      ? incomingCallData 
      : callInfo;

    if (!info) {
      return;
    }

    try {
      setCallError('');
      if (info.type === 'group') {
        activeCallRef.current = {
          ...info,
          type: 'group',
        };
        await getLocalStream();
        setCallStatus('active');
        onCallHistoryRecord?.(`${currentUserName} joined the group video call.`, info.groupId);
        getSocketClient().emit('accept_group_call', {
          callId: info.callId,
          groupId: info.groupId,
          fromUserId: currentUserId,
          fromName: currentUserName,
        });
        return;
      }

      activeCallRef.current = {
        ...info,
        peerUserId: info.fromUserId,
        peerName: info.fromName,
      };
      await createPeerConnection(info.fromUserId, info.callId);
      setCallStatus('active');
      onCallHistoryRecord?.(`${currentUserName} accepted the video call.`, info.fromUserId);
      getSocketClient().emit('accept_call', {
        callId: info.callId,
        fromUserId: currentUserId,
        fromName: currentUserName,
        toUserId: info.fromUserId,
      });
    } catch (error) {
      setCallError(error.message);
      resetCall();
    }
  };

  const rejectCall = () => {
    if (callInfo?.type === 'group') {
      onCallHistoryRecord?.(`${currentUserName} declined the group video call.`, callInfo.groupId);
      resetCall();
      return;
    }

    if (callInfo?.fromUserId) {
      onCallHistoryRecord?.(`${currentUserName} declined the video call.`, callInfo.fromUserId);
      getSocketClient().emit('reject_call', {
        callId: callInfo.callId,
        fromUserId: currentUserId,
        toUserId: callInfo.fromUserId,
      });
    }

    resetCall();
  };

  const endCall = (externalCallInfo) => {
    const call = externalCallInfo || activeCallRef.current || callInfo;
    const historyReceiverId = call?.type === 'group' ? call.groupId : call?.peerUserId || call?.fromUserId;

    if (call?.peerUserId || call?.fromUserId) {
      onCallHistoryRecord?.(
        call.type === 'group' ? `${currentUserName} left the group video call.` : `${currentUserName} ended the video call.`,
        historyReceiverId
      );
      getSocketClient().emit('end_call', {
        callId: call.callId,
        fromUserId: currentUserId,
        toUserId: call.peerUserId || call.fromUserId,
        type: call.type,
      });
    }

    resetCall();
  };

  useEffect(() => {
    const socket = getSocketClient();

    const handleConnect = () => {
      if (currentUserId) {
        socket.emit('join', currentUserId);
      }
    };

    socket.on('connect', handleConnect);

    if (!socket.connected) {
      socket.connect();
    } else if (currentUserId) {
      socket.emit('join', currentUserId);
    }

    const handleIncomingCall = (call) => {
      if (activeCallRef.current) {
        socket.emit('reject_call', {
          callId: call.callId,
          fromUserId: currentUserId,
          toUserId: call.fromUserId,
        });
        return;
      }

      activeCallRef.current = {
        ...call,
        peerUserId: call.fromUserId,
        peerName: call.fromName,
      };
      setCallInfo(call);
      setCallStatus('incoming');
      setCallError('');
    };

    const handleIncomingGroupCall = (call) => {
      if (call.fromUserId === currentUserId || activeCallRef.current) {
        return;
      }

      activeCallRef.current = {
        ...call,
        type: 'group',
      };
      setCallInfo({
        ...call,
        type: 'group',
      });
      setCallStatus('incoming');
      setCallError('');
    };

    const handleCallAccepted = async (payload) => {
      const call = activeCallRef.current;

      if (!call || call.callId !== payload.callId) {
        return;
      }

      try {
        const peerConnection = await createPeerConnection(payload.fromUserId, payload.callId, payload.fromName);
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        activeCallRef.current = {
          ...call,
          peerUserId: payload.fromUserId,
          peerName: payload.fromName,
        };
        setCallStatus('active');
        socket.emit('webrtc_offer', {
          callId: payload.callId,
          fromUserId: currentUserId,
          fromName: currentUserName,
          toUserId: payload.fromUserId,
          offer,
        });
      } catch (error) {
        setCallError(error.message);
        resetCall();
      }
    };

    const handleWebRtcOffer = async (payload) => {
      try {
        const call = activeCallRef.current || {
          callId: payload.callId,
          peerUserId: payload.fromUserId,
        };
        const peerConnection = peerConnectionsRef.current.get(payload.fromUserId) ||
          (await createPeerConnection(payload.fromUserId, payload.callId, payload.fromName));
        await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        activeCallRef.current = call;
        setCallStatus('active');
        socket.emit('webrtc_answer', {
          callId: payload.callId,
          fromUserId: currentUserId,
          toUserId: payload.fromUserId,
          answer,
        });
      } catch (error) {
        setCallError(error.message);
        resetCall();
      }
    };

    const handleWebRtcAnswer = async (payload) => {
      const peerConnection = peerConnectionsRef.current.get(payload.fromUserId);
      if (!peerConnection) {
        return;
      }

      await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.answer));
    };

    const handleIceCandidate = async (payload) => {
      const peerConnection = peerConnectionsRef.current.get(payload.fromUserId);
      if (!peerConnection || !payload.candidate) {
        return;
      }

      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(payload.candidate));
      } catch {
        setCallError('Could not add network candidate for the call.');
      }
    };

    const handleGroupCallParticipants = async (payload) => {
      const call = activeCallRef.current;
      if (!call || call.callId !== payload.callId) {
        return;
      }

      for (const participant of payload.participants || []) {
        try {
          const peerConnection = await createPeerConnection(participant.userId, payload.callId, participant.name);
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);
          socket.emit('webrtc_offer', {
            callId: payload.callId,
            fromUserId: currentUserId,
            fromName: currentUserName,
            toUserId: participant.userId,
            offer,
          });
        } catch (error) {
          setCallError(error.message);
        }
      }
    };

    const handleGroupParticipantLeft = (payload) => {
      removeRemoteParticipant(payload.userId);
    };
    
    const handleScreenShare = (payload) => {
      // Browsers often need a slight nudge to recognize the track change in the existing stream
      // We re-trigger the remote participants state to ensure the Video components re-bind
      setRemoteParticipants((current) => {
        return current.map(p => {
          if (p.userId === payload.fromUserId) {
             // Clone stream if possible or just trigger update
             return { ...p };
          }
          return p;
        });
      });
    };

    const handleCallRejected = () => {
      setCallError('Call was declined.');
      resetCall();
    };

    const handleCallEnded = () => {
      resetCall();
    };

    const handleCallError = (error) => {
      setCallError(error.message || 'Call failed.');
    };

    socket.on('incoming_call', handleIncomingCall);
    socket.on('incoming_group_call', handleIncomingGroupCall);
    socket.on('call_accepted', handleCallAccepted);
    socket.on('call_rejected', handleCallRejected);
    socket.on('call_ended', handleCallEnded);
    socket.on('call_error', handleCallError);
    socket.on('webrtc_offer', handleWebRtcOffer);
    socket.on('webrtc_answer', handleWebRtcAnswer);
    socket.on('webrtc_ice_candidate', handleIceCandidate);
    socket.on('webrtc_screen_share', handleScreenShare);
    socket.on('group_call_participants', handleGroupCallParticipants);
    socket.on('group_call_participant_left', handleGroupParticipantLeft);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('incoming_call', handleIncomingCall);
      socket.off('incoming_group_call', handleIncomingGroupCall);
      socket.off('call_accepted', handleCallAccepted);
      socket.off('call_rejected', handleCallRejected);
      socket.off('call_ended', handleCallEnded);
      socket.off('call_error', handleCallError);
      socket.off('webrtc_offer', handleWebRtcOffer);
      socket.off('webrtc_answer', handleWebRtcAnswer);
      socket.off('webrtc_ice_candidate', handleIceCandidate);
      socket.off('webrtc_screen_share', handleScreenShare);
      socket.off('group_call_participants', handleGroupCallParticipants);
      socket.off('group_call_participant_left', handleGroupParticipantLeft);

      socket.disconnect();

      // Final cleanup: Close connections and stop media tracks
      // We do this without triggering state updates to prevent recursion
      peerConnectionsRef.current.forEach((connection) => connection.close());
      peerConnectionsRef.current.clear();
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    };
  }, [createPeerConnection, currentUserId, currentUserName, removeRemoteParticipant]); // Removed resetCall dependency

  return {
    localVideoRef,
    callStatus,
    setCallStatus,
    callInfo,
    setCallInfo,
    callError,
    setCallError,
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
    resetCall,
  };
}
