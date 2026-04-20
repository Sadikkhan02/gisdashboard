'use client';
import { useEffect } from 'react';
import { getSocketClient } from '@/lib/socket-client';
import { useAppStore } from '@/store/appStore';

export default function SocketListener() {
  const currentUserId = useAppStore((state) => state.currentUserId);
  const currentView = useAppStore((state) => state.currentView);
  const activeChatId = useAppStore((state) => state.activeChatId);
  const incrementUnreadCount = useAppStore((state) => state.incrementUnreadCount);
  const setSocketConnected = useAppStore((state) => state.setSocketConnected);
  const appendMessage = useAppStore((state) => state.appendMessage);
  const setCallNotification = useAppStore((state) => state.setCallNotification);

  useEffect(() => {
    if (!currentUserId) return;

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

      // Increment unread count if we are not looking at this chat OR not in connect view
      if (currentView !== 'connect' || activeChatId !== peerId) {
        if (message.senderId !== currentUserId) {
          incrementUnreadCount(peerId);
        }
      }
      
      // Always append to store so ChatBox has it when opened
      appendMessage(peerId, message);
    };

    const handleIncomingCall = (call) => {
      // Don't notify if it's from us (group calls)
      if (call.fromUserId === currentUserId) return;
      setCallNotification(call);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('receive_message', handleReceiveMessage);
    socket.on('incoming_call', handleIncomingCall);
    socket.on('incoming_group_call', (call) => handleIncomingCall({ ...call, type: 'group' }));
    socket.on('call_ended', () => setCallNotification(null));
    socket.on('call_rejected', () => setCallNotification(null));

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
      socket.off('incoming_call', handleIncomingCall);
      socket.off('incoming_group_call');
      socket.off('call_ended');
      socket.off('call_rejected');
    };
  }, [currentUserId, currentView, activeChatId, incrementUnreadCount, setSocketConnected, appendMessage, setCallNotification]);

  return null;
}
