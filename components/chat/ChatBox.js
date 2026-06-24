'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchChatDirectory, fetchMessages } from '@/lib/api';
import { getSocketClient } from '@/lib/socket-client';
import { launchOutgoingCallTab } from '@/lib/call-session';
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

  if (message.type === 'image') {
    return (
      <div className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[70%] rounded-2xl p-1.5 shadow-sm ${own ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-900'}`}>
          {!own && message.senderName && <div className="mb-1 px-1.5 pt-1 text-[11px] font-semibold text-slate-500">{message.senderName}</div>}
          <a href={message.fileUrl} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl border border-black/5 hover:opacity-90 transition">
            <img src={message.fileUrl} alt={message.fileName || 'Shared Image'} className="max-h-60 object-cover w-full" />
          </a>
          <div className={`mt-1.5 px-1.5 pb-1 flex justify-between items-center text-[10px] ${own ? 'text-teal-100' : 'text-slate-500'}`}>
            <span className="truncate pr-2 font-medium">{message.fileName || 'image.png'}</span>
            <span className="shrink-0">{formatTime(message.createdAt)}</span>
          </div>
        </div>
      </div>
    );
  }

  if (message.type === 'file') {
    return (
      <div className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[80%] rounded-2xl p-3 shadow-sm border ${own ? 'bg-teal-600 border-teal-500 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
          {!own && message.senderName && <div className="mb-2 text-[11px] font-semibold text-slate-500">{message.senderName}</div>}
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${own ? 'bg-teal-700 text-teal-100' : 'bg-slate-100 text-slate-600'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
                <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className={`text-xs font-bold truncate ${own ? 'text-white' : 'text-slate-800'}`}>
                {message.fileName || 'document.pdf'}
              </div>
              <div className={`text-[10px] mt-0.5 ${own ? 'text-teal-200' : 'text-slate-400'}`}>
                Document Attachment
              </div>
            </div>
            <a
              href={message.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              download={message.fileName}
              className={`flex h-8 w-8 items-center justify-center rounded-lg border transition shrink-0 ${own ? 'border-teal-500 bg-teal-700/50 hover:bg-teal-700 hover:text-white text-teal-100' : 'border-slate-200 hover:bg-slate-50 hover:text-teal-600 text-slate-500'}`}
              title="Download file"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </a>
          </div>
          <div className={`mt-2 text-right text-[10px] ${own ? 'text-teal-200' : 'text-slate-400'}`}>
            {formatTime(message.createdAt)}
          </div>
        </div>
      </div>
    );
  }

  if (message.type === 'audio') {
    return (
      <div className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[80%] rounded-2xl p-3 shadow-sm border ${own ? 'bg-teal-600 border-teal-500 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
          {!own && message.senderName && <div className="mb-2 text-[11px] font-semibold text-slate-500">{message.senderName}</div>}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm shrink-0">🎙️</span>
              <span className="text-xs font-bold">Voice Memo</span>
            </div>
            <audio src={message.fileUrl} controls className={`h-8 max-w-full ${own ? 'brightness-95 contrast-125' : ''}`} />
          </div>
          <div className={`mt-2 text-right text-[10px] ${own ? 'text-teal-200' : 'text-slate-400'}`}>
            {formatTime(message.createdAt)}
          </div>
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


export default function ChatBox() {
  const currentUser = useAppStore((state) => state.currentUser);
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

  const [draft, setDraft] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [chatNotice, setChatNotice] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Popover Attach Menu State
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  // Camera Snapshot States
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraPhoto, setCameraPhoto] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const cameraVideoRef = useRef(null);

  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);

  // Document file selection handler
  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !activeChatId) return;

    setIsUploading(true);
    setChatNotice(`Uploading ${file.name}...`);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/chat/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      
      const socket = getSocketClient();
      socket.emit('send_message', {
        senderId: currentUserId,
        senderName: directory.users?.find((user) => user.id === currentUserId)?.name || currentUserName,
        receiverId: activeChatId,
        message: `Shared ${data.type === 'image' ? 'an image' : 'a file'}: ${data.fileName}`,
        type: data.type,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
      });

      setChatNotice('');
    } catch (error) {
      console.error(error);
      setChatNotice('Failed to upload file.');
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  // Camera Handlers
  const handleOpenCamera = async () => {
    setCameraPhoto(null);
    setCameraError('');
    setShowCameraModal(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      setCameraStream(stream);
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Webcam access error:', error);
      setCameraError('Could not access camera. Please check your system permissions.');
    }
  };

  // Re-sync camera preview feed when stream changes
  useEffect(() => {
    if (showCameraModal && cameraStream && cameraVideoRef.current && !cameraVideoRef.current.srcObject) {
      cameraVideoRef.current.srcObject = cameraStream;
    }
  }, [showCameraModal, cameraStream]);

  const handleCapturePhoto = () => {
    if (!cameraVideoRef.current) return;
    const video = cameraVideoRef.current;
    
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      if (blob) {
        setCameraPhoto(blob);
      }
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
        setCameraStream(null);
      }
    }, 'image/jpeg', 0.95);
  };

  const handleRetakePhoto = async () => {
    setCameraPhoto(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      setCameraStream(stream);
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Webcam access error:', error);
      setCameraError('Could not restart camera.');
    }
  };

  const handleSendPhoto = async () => {
    if (!cameraPhoto || !activeChatId) return;
    setIsUploading(true);
    setChatNotice('Sending photo...');

    const file = new File([cameraPhoto], `camera-shot-${Date.now()}.jpg`, { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/chat/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');
      const data = await response.json();

      const socket = getSocketClient();
      socket.emit('send_message', {
        senderId: currentUserId,
        senderName: directory.users?.find((user) => user.id === currentUserId)?.name || currentUserName,
        receiverId: activeChatId,
        message: `Shared an image: ${data.fileName}`,
        type: data.type,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
      });

      setChatNotice('');
      setShowCameraModal(false);
      setCameraPhoto(null);
    } catch (error) {
      console.error(error);
      setChatNotice('Failed to send photo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCloseCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setShowCameraModal(false);
    setCameraPhoto(null);
  };

  // Voice Note Handlers
  const handleStartVoiceMemo = async () => {
    setAudioBlob(null);
    setAudioPreviewUrl(null);
    setRecordingDuration(0);
    setChatNotice('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsRecording(true);
      
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioPreviewUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
    } catch (error) {
      console.error('Mic access error:', error);
      setChatNotice('Could not access microphone.');
    }
  };

  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } else {
      setRecordingDuration(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleStopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const handleCancelRecording = () => {
    if (mediaRecorder) {
      if (mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
    }
    setIsRecording(false);
    setMediaRecorder(null);
    setAudioBlob(null);
    setAudioPreviewUrl(null);
    setRecordingDuration(0);
  };

  const handleSendVoiceMemo = async () => {
    if (!audioBlob || !activeChatId) return;
    setIsUploading(true);
    setChatNotice('Sending voice memo...');

    const file = new File([audioBlob], `voice-memo-${Date.now()}.webm`, { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/chat/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');
      const data = await response.json();

      const socket = getSocketClient();
      socket.emit('send_message', {
        senderId: currentUserId,
        senderName: directory.users?.find((user) => user.id === currentUserId)?.name || currentUserName,
        receiverId: activeChatId,
        message: `Shared a voice memo`,
        type: 'audio',
        fileUrl: data.fileUrl,
        fileName: data.fileName,
      });

      setChatNotice('');
      setAudioBlob(null);
      setAudioPreviewUrl(null);
      setMediaRecorder(null);
    } catch (error) {
      console.error(error);
      setChatNotice('Failed to send voice memo.');
    } finally {
      setIsUploading(false);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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

  const currentUserName = currentUser?.name || 'Team member';

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

  const handleStartVideoCall = () => {
    if (!activeChatUser) {
      setChatNotice('Select a chat before starting a call.');
      return;
    }

    launchOutgoingCallTab({
      currentUserId,
      currentUserName: currentUser?.name || currentUserName,
      activeChatUser,
    });
  };

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
            onClick={handleStartVideoCall}
            disabled={!activeChatUser}
            className="rounded-lg border border-[#168c7a] px-3 py-2 text-xs font-semibold text-[#116f61] transition hover:bg-[#e9f8f4] disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
          >
            {activeChatUser?.type === 'group' ? 'Group video call' : 'Video call'}
          </button>
        </div>

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

        {isRecording || audioPreviewUrl ? (
          <div className="border-t border-slate-200 bg-slate-50 p-3 flex items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <span className={`h-2.5 w-2.5 rounded-full bg-rose-500 ${isRecording ? 'animate-pulse' : ''}`} />
              <span className="text-xs font-bold text-slate-600">
                {isRecording ? 'Recording Voice Memo...' : 'Voice Memo Recorded'}
              </span>
              <span className="text-xs font-mono font-bold bg-slate-200 px-2 py-0.5 rounded text-slate-700">
                {isRecording ? formatDuration(recordingDuration) : 'Ready'}
              </span>
            </div>
            
            {audioPreviewUrl && (
              <div className="flex-1 max-w-xs md:max-w-md">
                <audio src={audioPreviewUrl} controls className="h-8 w-full animate-in fade-in" />
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancelRecording}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                title="Discard Recording"
                disabled={isUploading}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                </svg>
              </button>

              {isRecording ? (
                <button
                  type="button"
                  onClick={handleStopRecording}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition animate-pulse"
                  title="Stop Recording"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="14" height="14" x="5" y="5" rx="2"/>
                  </svg>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSendVoiceMemo}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition disabled:opacity-50"
                  title="Send Voice Memo"
                  disabled={isUploading || !audioBlob}
                >
                  {isUploading ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </button>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="relative border-t border-slate-200 bg-slate-50 p-3">
            {/* Popover Attach Menu */}
            {showAttachMenu && (
              <div className="absolute bottom-16 left-3 z-[100] w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-[0_10px_25px_rgba(0,0,0,0.1)] ring-1 ring-black/5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAttachMenu(false);
                    handleOpenCamera();
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-[#e9f8f4] hover:text-[#168c7a] transition"
                >
                  <span className="text-sm">📷</span> Open Camera
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAttachMenu(false);
                    document.getElementById('chat-file-input').click();
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-[#e9f8f4] hover:text-[#168c7a] transition"
                >
                  <span className="text-sm">📁</span> Documents / Files
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAttachMenu(false);
                    handleStartVoiceMemo();
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-[#e9f8f4] hover:text-[#168c7a] transition"
                >
                  <span className="text-sm">🎙️</span> Voice Sharing
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAttachMenu((prev) => !prev)}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition ${showAttachMenu ? 'border-[#168c7a] bg-[#e9f8f4] text-[#116f61]' : 'border-slate-300 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700'} disabled:opacity-50`}
                title="Attach options"
                disabled={isUploading || !activeChatId}
              >
                {isUploading ? (
                  <svg className="animate-spin h-5 w-5 text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                  </svg>
                )}
              </button>
              <input
                id="chat-file-input"
                type="file"
                onChange={handleFileChange}
                className="hidden"
                disabled={isUploading || !activeChatId}
              />
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={isUploading ? "Uploading file..." : "Type a message"}
                disabled={isUploading}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-0 placeholder:text-slate-400 focus:border-teal-500 disabled:bg-slate-100"
              />
              <button
                type="submit"
                disabled={isUploading || !draft.trim()}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Camera Capture Modal */}
      {showCameraModal && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-base font-semibold text-white">Capture Photo</h3>
              <button
                type="button"
                onClick={handleCloseCamera}
                className="rounded-lg text-slate-400 hover:text-white transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="mt-4 flex flex-col items-center justify-center min-h-[300px] rounded-2xl bg-black overflow-hidden relative border border-white/5">
              {cameraError && (
                <div className="p-4 text-center text-xs text-rose-400">
                  {cameraError}
                </div>
              )}
              
              {!cameraError && !cameraPhoto && (
                <video
                  ref={cameraVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-[300px] object-cover"
                />
              )}

              {cameraPhoto && (
                <img
                  src={URL.createObjectURL(cameraPhoto)}
                  alt="Captured snapshot"
                  className="w-full h-[300px] object-cover"
                />
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={handleCloseCamera}
                className="rounded-full bg-slate-800 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
                disabled={isUploading}
              >
                Cancel
              </button>

              {!cameraPhoto && !cameraError && (
                <button
                  type="button"
                  onClick={handleCapturePhoto}
                  className="rounded-full bg-teal-600 px-5 py-2 text-xs font-semibold text-white transition hover:bg-teal-500"
                >
                  Capture Snapshot
                </button>
              )}

              {cameraPhoto && (
                <>
                  <button
                    type="button"
                    onClick={handleRetakePhoto}
                    className="rounded-full bg-slate-800 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
                    disabled={isUploading}
                  >
                    Retake
                  </button>
                  <button
                    type="button"
                    onClick={handleSendPhoto}
                    className="rounded-full bg-teal-600 px-5 py-2 text-xs font-semibold text-white transition hover:bg-teal-500 flex items-center gap-2"
                    disabled={isUploading}
                  >
                    {isUploading ? 'Sending...' : 'Send Photo'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
