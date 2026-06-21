'use client';

import { useEffect, useMemo, useState } from 'react';
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
