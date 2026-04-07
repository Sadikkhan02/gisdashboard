'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchChatUsers, fetchMessages } from '@/lib/api';
import { getSocketClient } from '@/lib/socket-client';
import { useAppStore } from '@/store/appStore';

function formatTime(value) {
  const date = new Date(value);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function UserListItem({ user, active, onClick }) {
  const statusTone = {
    online: 'bg-emerald-500',
    away: 'bg-amber-400',
    offline: 'bg-slate-300',
  }[user.status] || 'bg-slate-300';

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg border px-3 py-3 text-left transition ${active ? 'border-teal-500 bg-teal-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
      type="button"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-slate-900">{user.name}</div>
          <div className="text-xs text-slate-500">{user.role}</div>
        </div>
        <span className={`h-2.5 w-2.5 rounded-full ${statusTone}`} />
      </div>
    </button>
  );
}

function MessageBubble({ message, own }) {
  return (
    <div className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${own ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-900'}`}>
        <div>{message.message}</div>
        <div className={`mt-1 text-[11px] ${own ? 'text-teal-100' : 'text-slate-500'}`}>
          {formatTime(message.createdAt)}
        </div>
      </div>
    </div>
  );
}

export default function ChatBox() {
  const [draft, setDraft] = useState('');
  const currentUserId = useAppStore((state) => state.currentUserId);
  const activeChatId = useAppStore((state) => state.activeChatId);
  const setActiveChatId = useAppStore((state) => state.setActiveChatId);
  const chatUsers = useAppStore((state) => state.chatUsers);
  const setChatUsers = useAppStore((state) => state.setChatUsers);
  const messagesByChat = useAppStore((state) => state.messagesByChat);
  const setMessagesForChat = useAppStore((state) => state.setMessagesForChat);
  const appendMessage = useAppStore((state) => state.appendMessage);
  const socketConnected = useAppStore((state) => state.socketConnected);
  const setSocketConnected = useAppStore((state) => state.setSocketConnected);

  const { data: users = [] } = useQuery({
    queryKey: ['chat-users'],
    queryFn: fetchChatUsers,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', currentUserId, activeChatId],
    queryFn: () => fetchMessages({ userId: currentUserId, peerId: activeChatId }),
    enabled: Boolean(currentUserId && activeChatId),
  });

  useEffect(() => {
    if (users.length > 0) {
      setChatUsers(users.filter((user) => user.id !== currentUserId));
      if (!activeChatId) {
        const firstPeer = users.find((user) => user.id !== currentUserId);
        if (firstPeer) {
          setActiveChatId(firstPeer.id);
        }
      }
    }
  }, [activeChatId, currentUserId, setActiveChatId, setChatUsers, users]);

  useEffect(() => {
    if (activeChatId) {
      setMessagesForChat(activeChatId, messages);
    }
  }, [activeChatId, messages, setMessagesForChat]);

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
      const peerId = message.senderId === currentUserId ? message.receiverId : message.senderId;
      appendMessage(peerId, message);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('receive_message', handleReceiveMessage);

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
    };
  }, [appendMessage, currentUserId, setSocketConnected]);

  const activeChatUser = useMemo(
    () => chatUsers.find((user) => user.id === activeChatId),
    [activeChatId, chatUsers]
  );

  const activeMessages = activeChatId ? messagesByChat[activeChatId] || messages : [];

  const handleSubmit = (event) => {
    event.preventDefault();

    const text = draft.trim();
    if (!text || !activeChatId) {
      return;
    }

    const socket = getSocketClient();
    socket.emit('send_message', {
      senderId: currentUserId,
      receiverId: activeChatId,
      message: text,
      type: 'text',
    });

    setDraft('');
  };

  return (
    <div className="grid h-[34rem] grid-cols-12 overflow-hidden rounded-lg border border-slate-200 bg-white shadow">
      <div className="col-span-4 border-r border-slate-200 bg-slate-50 p-3">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">Team Chat</h3>
            <div className="text-xs text-slate-500">{socketConnected ? 'Socket connected' : 'Connecting...'}</div>
          </div>
        </div>
        <div className="space-y-2">
          {chatUsers.map((user) => (
            <UserListItem
              key={user.id}
              user={user}
              active={user.id === activeChatId}
              onClick={() => setActiveChatId(user.id)}
            />
          ))}
        </div>
      </div>

      <div className="col-span-8 flex flex-col">
        <div className="border-b border-slate-200 px-4 py-3">
          <div className="font-semibold text-slate-900">{activeChatUser?.name || 'Select a chat'}</div>
          <div className="text-xs text-slate-500">{activeChatUser?.role || 'Direct message channel'}</div>
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
