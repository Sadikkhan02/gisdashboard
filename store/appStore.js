import { create } from 'zustand';

export const useAppStore = create((set) => ({
  activeRegion: 'All Regions',
  dateRange: 'Last 7 days',
  viewport: null,
  locationData: [],
  currentUserId: 'analyst-1',
  activeChatId: 'analyst-2',
  chatUsers: [],
  messagesByChat: {},
  socketConnected: false,
  setActiveRegion: (activeRegion) => set({ activeRegion }),
  setDateRange: (dateRange) => set({ dateRange }),
  setViewport: (viewport) => set({ viewport }),
  setLocationData: (locationData) => set({ locationData }),
  setChatUsers: (chatUsers) =>
    set((state) => {
      const current = JSON.stringify(state.chatUsers);
      const next = JSON.stringify(chatUsers);

      if (current === next) {
        return state;
      }

      return { chatUsers };
    }),
  setActiveChatId: (activeChatId) => set({ activeChatId }),
  setSocketConnected: (socketConnected) => set({ socketConnected }),
  setMessagesForChat: (chatId, messages) =>
    set((state) => {
      const current = JSON.stringify(state.messagesByChat[chatId] || []);
      const next = JSON.stringify(messages);

      if (current === next) {
        return state;
      }

      return {
        messagesByChat: {
          ...state.messagesByChat,
          [chatId]: messages,
        },
      };
    }),
  appendMessage: (chatId, message) =>
    set((state) => {
      const existingMessages = state.messagesByChat[chatId] || [];
      const alreadyExists = existingMessages.some(
        (existing) =>
          (existing.id && existing.id === message.id) ||
          (!existing.id &&
            existing.senderId === message.senderId &&
            existing.receiverId === message.receiverId &&
            existing.message === message.message &&
            existing.createdAt === message.createdAt)
      );

      if (alreadyExists) {
        return state;
      }

      return {
        messagesByChat: {
          ...state.messagesByChat,
          [chatId]: [...existingMessages, message],
        },
      };
    }),
}));
