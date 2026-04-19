'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchChatDirectory, fetchMessages } from '@/lib/api';
import { getSocketClient } from '@/lib/socket-client';
import { useAppStore } from '@/store/appStore';

function formatTime(value) {
  const date = new Date(value);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function UserListItem({ user, active, unread, onClick }) {
  const isGroup = user.type === 'group';
  const memberCount = user.memberDetails?.length || user.members?.length || 0;
  const statusTone = {
    online: 'bg-emerald-500',
    away: 'bg-amber-400',
    offline: 'bg-slate-300',
  }[user.status] || 'bg-slate-300';

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg border px-3 py-3 text-left transition ${active ? 'border-[#168c7a] bg-[#e9f8f4]' : 'border-slate-200 bg-white hover:border-slate-300'}`}
      type="button"
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0 pr-2">
          <div className="font-medium text-slate-900 truncate">{user.name}</div>
          <div className="truncate text-xs text-slate-500">
            {isGroup ? `${memberCount} members` : user.description || user.role}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {unread > 0 ? (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-teal-600 px-1 text-[10px] font-bold text-white">
              {unread}
            </span>
          ) : (
            isGroup ? (
              <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">Group</span>
            ) : (
              <span className={`h-2.5 w-2.5 rounded-full ${statusTone}`} />
            )
          )}
        </div>
      </div>
    </button>
  );
}

function MessageBubble({ message, own }) {
  if (message.type === 'call') {
    return (
      <div className="flex justify-center">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs font-medium text-slate-600">
          {message.message}
          <span className="ml-2 text-slate-400">{formatTime(message.createdAt)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${own ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-900'}`}>
        {!own && message.senderName && <div className="mb-1 text-[11px] font-semibold text-slate-500">{message.senderName}</div>}
        <div>{message.message}</div>
        <div className={`mt-1 text-[11px] ${own ? 'text-teal-100' : 'text-slate-500'}`}>
          {formatTime(message.createdAt)}
        </div>
      </div>
    </div>
  );
}

function RemoteVideoTile({ participant }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  return (
    <div className="overflow-hidden rounded-lg border border-white/15 bg-black">
      <video ref={videoRef} autoPlay playsInline className="h-40 w-full object-cover" />
      <div className="px-3 py-2 text-xs text-white/70">{participant.name || 'Participant'}</div>
    </div>
  );
}

export default function ChatBox() {
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef(new Map());
  const activeCallRef = useRef(null);
  const [draft, setDraft] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [chatNotice, setChatNotice] = useState('');
  const [callStatus, setCallStatus] = useState('idle');
  const [callInfo, setCallInfo] = useState(null);
  const [callError, setCallError] = useState('');
  const [remoteParticipants, setRemoteParticipants] = useState([]);
  const currentUserId = useAppStore((state) => state.currentUserId);
  const activeChatId = useAppStore((state) => state.activeChatId);
  const setActiveChatId = useAppStore((state) => state.setActiveChatId);
  const chatUsers = useAppStore((state) => state.chatUsers);
  const setChatUsers = useAppStore((state) => state.setChatUsers);
  const chatGroups = useAppStore((state) => state.chatGroups);
  const setChatGroups = useAppStore((state) => state.setChatGroups);
  const addChatGroup = useAppStore((state) => state.addChatGroup);
  const messagesByChat = useAppStore((state) => state.messagesByChat);
  const setMessagesForChat = useAppStore((state) => state.setMessagesForChat);
  const appendMessage = useAppStore((state) => state.appendMessage);
  const socketConnected = useAppStore((state) => state.socketConnected);
  const setSocketConnected = useAppStore((state) => state.setSocketConnected);
  const unreadCounts = useAppStore((state) => state.unreadCounts);
  const clearUnreadCount = useAppStore((state) => state.clearUnreadCount);
  const globalCallNotification = useAppStore((state) => state.callNotification);
  const setGlobalCallNotification = useAppStore((state) => state.setCallNotification);

  const { data: directory = { users: [], groups: [] } } = useQuery({
    queryKey: ['chat-directory'],
    queryFn: fetchChatDirectory,
    enabled: Boolean(currentUserId),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', currentUserId, activeChatId],
    queryFn: () => fetchMessages({ userId: currentUserId, peerId: activeChatId }),
    enabled: Boolean(currentUserId && activeChatId),
  });

  const currentUserName = useMemo(
    () => directory.users?.find((user) => user.id === currentUserId)?.name || 'Team member',
    [currentUserId, directory.users]
  );

  useEffect(() => {
    const users = directory.users || [];
    const groups = directory.groups || [];

    if (users.length > 0 || groups.length > 0) {
      const socket = getSocketClient();
      groups
        .filter((group) => !group.members || group.members.includes(currentUserId))
        .forEach((group) => socket.emit('join_group', group.id));

      setChatUsers(users.filter((user) => user.id !== currentUserId));
      setChatGroups(groups);
      if (!activeChatId) {
        setActiveChatId(groups[0]?.id || users.find((user) => user.id !== currentUserId)?.id);
      }
    }
  }, [activeChatId, currentUserId, directory, setActiveChatId, setChatGroups, setChatUsers]);

  useEffect(() => {
    if (activeChatId) {
      setMessagesForChat(activeChatId, messages);
      clearUnreadCount(activeChatId);
    }
  }, [activeChatId, messages, setMessagesForChat, clearUnreadCount]);

  useEffect(() => {
    if (globalCallNotification && callStatus === 'idle') {
      setCallStatus('incoming');
      setCallInfo(globalCallNotification);
    }
  }, [globalCallNotification, callStatus]);

  useEffect(() => {
    const socket = getSocketClient();

    const handleConnect = () => {
      setSocketConnected(true);
      socket.emit('join', currentUserId);
    };

    const handleDisconnect = () => {
      setSocketConnected(false);
    };

    const handleReceiveMessage = (message) => {
      const peerId = message.receiverId?.startsWith('group-')
        ? message.receiverId
        : message.senderId === currentUserId
          ? message.receiverId
          : message.senderId;
      appendMessage(peerId, message);
    };

    const handleGroupCreated = (group) => {
      if (!group.members?.includes(currentUserId)) {
        return;
      }

      socket.emit('join_group', group.id);
      addChatGroup(group);
      setActiveChatId(group.id);
      setChatNotice(`${group.name} is ready for realtime messages.`);
    };

    const handleChatError = (error) => {
      setChatNotice(error.message || 'Chat action failed.');
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('receive_message', handleReceiveMessage);
    socket.on('group_created', handleGroupCreated);
    socket.on('chat_error', handleChatError);

    if (!socket.connected) {
      socket.connect();
    } else {
      socket.emit('join', currentUserId);
      setSocketConnected(true);
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('receive_message', handleReceiveMessage);
      socket.off('group_created', handleGroupCreated);
      socket.off('chat_error', handleChatError);
    };
  }, [addChatGroup, appendMessage, currentUserId, setActiveChatId, setSocketConnected]);

  const conversations = useMemo(() => [...chatGroups, ...chatUsers], [chatGroups, chatUsers]);

  const activeChatUser = useMemo(
    () => conversations.find((user) => user.id === activeChatId),
    [activeChatId, conversations]
  );

  const activeMessages = activeChatId ? messagesByChat[activeChatId] || messages : [];
  const activeGroupMembers = useMemo(() => {
    if (activeChatUser?.type !== 'group') {
      return [];
    }

    if (activeChatUser.memberDetails?.length > 0) {
      return activeChatUser.memberDetails;
    }

    return (activeChatUser.members || [])
      .map((memberId) => (directory.users || []).find((user) => user.id === memberId))
      .filter(Boolean);
  }, [activeChatUser, directory.users]);

  const availableMembers = useMemo(
    () => (directory.users || []).filter((user) => user.id !== currentUserId),
    [currentUserId, directory.users]
  );

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
  }, [stopLocalMedia]);

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

  const removeRemoteParticipant = useCallback((peerUserId) => {
    const connection = peerConnectionsRef.current.get(peerUserId);
    connection?.close();
    peerConnectionsRef.current.delete(peerUserId);
    setRemoteParticipants((current) => current.filter((participant) => participant.userId !== peerUserId));
  }, []);

  const createPeerConnection = useCallback(async (peerUserId, callId, peerName = 'Participant') => {
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
  }, [currentUserId, getLocalStream, removeRemoteParticipant]);

  const recordCallHistory = useCallback(
    (message, receiverId) => {
      if (!receiverId || !currentUserId) {
        return;
      }

      getSocketClient().emit('send_message', {
        senderId: currentUserId,
        senderName: currentUserName,
        receiverId,
        message,
        type: 'call',
      });
    },
    [currentUserId, currentUserName]
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
        recordCallHistory(`${currentUserName} started a group video call.`, activeChatUser.id);
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
      recordCallHistory(`${currentUserName} started a video call.`, activeChatUser.id);
      getSocketClient().emit('start_call', call);
    } catch (error) {
      setCallError(error.message);
      resetCall();
    }
  };

  const acceptCall = async () => {
    if (!callInfo) {
      return;
    }

    try {
      setCallError('');
      if (callInfo.type === 'group') {
        activeCallRef.current = {
          ...callInfo,
          type: 'group',
        };
        await getLocalStream();
        setCallStatus('active');
        recordCallHistory(`${currentUserName} joined the group video call.`, callInfo.groupId);
        getSocketClient().emit('accept_group_call', {
          callId: callInfo.callId,
          groupId: callInfo.groupId,
          fromUserId: currentUserId,
          fromName: currentUserName,
        });
        return;
      }

      activeCallRef.current = {
        ...callInfo,
        peerUserId: callInfo.fromUserId,
        peerName: callInfo.fromName,
      };
      await createPeerConnection(callInfo.fromUserId, callInfo.callId);
      setCallStatus('active');
      recordCallHistory(`${currentUserName} accepted the video call.`, callInfo.fromUserId);
      getSocketClient().emit('accept_call', {
        callId: callInfo.callId,
        fromUserId: currentUserId,
        fromName: currentUserName,
        toUserId: callInfo.fromUserId,
      });
    } catch (error) {
      setCallError(error.message);
      resetCall();
    }
  };

  const rejectCall = () => {
    if (callInfo?.type === 'group') {
      recordCallHistory(`${currentUserName} declined the group video call.`, callInfo.groupId);
      resetCall();
      return;
    }

    if (callInfo?.fromUserId) {
      recordCallHistory(`${currentUserName} declined the video call.`, callInfo.fromUserId);
      getSocketClient().emit('reject_call', {
        callId: callInfo.callId,
        fromUserId: currentUserId,
        toUserId: callInfo.fromUserId,
      });
    }

    resetCall();
  };

  const endCall = () => {
    const call = activeCallRef.current || callInfo || globalCallNotification;
    const historyReceiverId = call?.type === 'group' ? call.groupId : call?.peerUserId || call?.fromUserId;

    if (call?.peerUserId || call?.fromUserId) {
      recordCallHistory(
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

    setGlobalCallNotification(null);
    resetCall();
  };

  useEffect(() => {
    const socket = getSocketClient();

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
    socket.on('group_call_participants', handleGroupCallParticipants);
    socket.on('group_call_participant_left', handleGroupParticipantLeft);

    return () => {
      socket.off('incoming_call', handleIncomingCall);
      socket.off('incoming_group_call', handleIncomingGroupCall);
      socket.off('call_accepted', handleCallAccepted);
      socket.off('call_rejected', handleCallRejected);
      socket.off('call_ended', handleCallEnded);
      socket.off('call_error', handleCallError);
      socket.off('webrtc_offer', handleWebRtcOffer);
      socket.off('webrtc_answer', handleWebRtcAnswer);
      socket.off('webrtc_ice_candidate', handleIceCandidate);
      socket.off('group_call_participants', handleGroupCallParticipants);
      socket.off('group_call_participant_left', handleGroupParticipantLeft);
    };
  }, [createPeerConnection, currentUserId, currentUserName, removeRemoteParticipant, resetCall]);

  const toggleMember = (memberId) => {
    setSelectedMembers((current) =>
      current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId]
    );
  };

  const handleCreateGroup = (event) => {
    event.preventDefault();
    const name = groupName.trim();

    if (!name || selectedMembers.length === 0) {
      setChatNotice('Add a group name and at least one teammate.');
      return;
    }

    const socket = getSocketClient();
    socket.emit('create_group', {
      name,
      creatorId: currentUserId,
      members: selectedMembers,
    });

    setGroupName('');
    setSelectedMembers([]);
    setShowCreateGroup(false);
    setChatNotice('Creating group...');
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const text = draft.trim();
    if (!text || !activeChatId) {
      return;
    }

    const socket = getSocketClient();
    socket.emit('send_message', {
      senderId: currentUserId,
      senderName: directory.users?.find((user) => user.id === currentUserId)?.name,
      receiverId: activeChatId,
      message: text,
      type: 'text',
    });

    setDraft('');
  };

  return (
    <div className="grid h-[36rem] grid-cols-12 overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-900 shadow-sm">
      {callStatus === 'incoming' && (
        <div className="fixed left-1/2 top-4 z-[1000] w-[min(92vw,520px)] -translate-x-1/2 rounded-lg border border-[#168c7a]/30 bg-white p-4 text-slate-950 shadow-2xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-bold">
                {callInfo?.type === 'group'
                  ? `${callInfo?.fromName || 'Team member'} started a group video call`
                  : `${callInfo?.fromName || 'Team member'} is calling you`}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {callInfo?.type === 'group' ? callInfo?.groupName || 'Group chat' : 'Direct video call'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={acceptCall}
                className="rounded-lg bg-[#168c7a] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#116f61]"
              >
                Pick call
              </button>
              <button
                type="button"
                onClick={rejectCall}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-rose-300 hover:text-rose-700"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="col-span-12 border-b border-slate-200 bg-slate-50 p-3 md:col-span-4 md:border-b-0 md:border-r">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-950">Team Chat</h3>
            <div className="text-xs text-slate-500">{socketConnected ? 'Live socket connected' : 'Connecting...'}</div>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateGroup((current) => !current)}
            className="rounded-lg bg-[#168c7a] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#116f61]"
          >
            New group
          </button>
        </div>

        {chatNotice && (
          <div className="mb-3 rounded-lg bg-white px-3 py-2 text-xs text-slate-600 shadow-sm">{chatNotice}</div>
        )}

        {showCreateGroup && (
          <form onSubmit={handleCreateGroup} className="mb-3 rounded-lg border border-slate-200 bg-white p-3">
            <label className="mb-2 block">
              <span className="mb-1 block text-xs font-semibold text-slate-600">Group name</span>
              <input
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none focus:border-[#168c7a]"
                placeholder="Response team"
              />
            </label>
            <div className="mb-3 space-y-1">
              <div className="rounded bg-[#e9f8f4] px-2 py-1.5 text-xs font-medium text-[#116f61]">
                You will be included automatically.
              </div>
              {availableMembers.map((user) => (
                <label key={user.id} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(user.id)}
                    onChange={() => toggleMember(user.id)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  {user.name}
                </label>
              ))}
            </div>
            <button
              type="submit"
              className="w-full rounded-lg border border-[#168c7a] px-3 py-2 text-xs font-semibold text-[#116f61]"
            >
              Create realtime group
            </button>
          </form>
        )}

          <div className="flex-1 space-y-2 overflow-y-auto pr-1">
            {conversations.map((user) => (
              <UserListItem
                key={user.id}
                user={user}
                active={activeChatId === user.id}
                unread={unreadCounts[user.id] || 0}
                onClick={() => setActiveChatId(user.id)}
              />
            ))}
          </div>
      </div>

      <div className="col-span-12 flex min-h-0 flex-col md:col-span-8">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="min-w-0">
            <div className="truncate font-semibold text-slate-950">{activeChatUser?.name || 'Select a chat'}</div>
            <div className="truncate text-xs text-slate-500">{activeChatUser?.description || activeChatUser?.role || 'Direct message channel'}</div>
            {activeGroupMembers.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {activeGroupMembers.map((member) => (
                  <span
                    key={member.id}
                    className="rounded bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700"
                    title={member.role}
                  >
                    {member.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={startVideoCall}
            disabled={!activeChatUser || callStatus !== 'idle'}
            className="rounded-lg border border-[#168c7a] px-3 py-2 text-xs font-semibold text-[#116f61] transition hover:bg-[#e9f8f4] disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
          >
            {activeChatUser?.type === 'group' ? 'Group video call' : 'Video call'}
          </button>
        </div>

        {callStatus !== 'idle' && (
          <div className="border-b border-slate-200 bg-slate-950 p-3 text-white">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold">
                  {callStatus === 'incoming' && `${callInfo?.fromName || 'Team member'} is calling`}
                  {callStatus === 'outgoing' && `Calling ${callInfo?.peerName || callInfo?.targetName || 'team member'}`}
                  {callStatus === 'active' && callInfo?.type === 'group' && `Group call in ${callInfo?.groupName || 'team chat'}`}
                  {callStatus === 'active' && callInfo?.type !== 'group' && `In call with ${callInfo?.peerName || callInfo?.fromName || 'team member'}`}
                  {callStatus === 'ended' && 'Call ended'}
                </div>
                <div className="text-xs text-white/60">WebRTC audio and video over Socket.IO signaling</div>
              </div>
              <div className="flex items-center gap-2">
                {callStatus === 'incoming' && (
                  <>
                    <button
                      type="button"
                      onClick={acceptCall}
                      className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-white"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={rejectCall}
                      className="rounded-lg bg-rose-500 px-3 py-2 text-xs font-semibold text-white"
                    >
                      Decline
                    </button>
                  </>
                )}
                {['outgoing', 'active', 'ended'].includes(callStatus) && (
                  <button
                    type="button"
                    onClick={endCall}
                    className="rounded-lg bg-rose-500 px-3 py-2 text-xs font-semibold text-white"
                  >
                    End call
                  </button>
                )}
              </div>
            </div>
            {callError && <div className="mb-3 rounded-lg bg-rose-500/15 px-3 py-2 text-xs text-rose-100">{callError}</div>}
            <div className="grid gap-3 sm:grid-cols-2">
              {remoteParticipants.map((participant) => (
                <RemoteVideoTile key={participant.userId} participant={participant} />
              ))}
              <div className="overflow-hidden rounded-lg border border-white/15 bg-black">
                <video ref={localVideoRef} autoPlay muted playsInline className="h-40 w-full object-cover" />
                <div className="px-3 py-2 text-xs text-white/70">Your camera</div>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 space-y-3 overflow-y-auto bg-white px-4 py-4">
          {activeMessages.length === 0 ? (
            <div className="text-sm text-slate-500">No messages yet. Start the conversation.</div>
          ) : (
            activeMessages.map((message) => (
              <MessageBubble
                key={message.id || `${message.senderId}-${message.createdAt}`}
                message={message}
                own={message.senderId === currentUserId}
              />
            ))
          )}
        </div>

        <form onSubmit={handleSubmit} className="border-t border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-2">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Type a message"
              className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-0 placeholder:text-slate-400 focus:border-teal-500"
            />
            <button
              type="submit"
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
