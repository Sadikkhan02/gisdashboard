import { create } from 'zustand';

export const useAppStore = create((set) => ({
  activeRegion: 'All Regions',
  dateRange: 'Last 7 days',
  viewport: null,
  locationData: [],
  currentUser: null,
  currentUserId: null,
  activeChatId: 'group-command',
  chatUsers: [],
  chatGroups: [],
  messagesByChat: {},
  socketConnected: false,
  currentView: 'dashboard',
  isSidebarExpanded: false,
  selectedLocation: null,
  unreadCounts: {},
  callNotification: null,
  setCurrentView: (currentView) => set({ currentView }),
  toggleSidebar: () => set((state) => ({ isSidebarExpanded: !state.isSidebarExpanded })),
  setSelectedLocation: (selectedLocation) => set({ selectedLocation }),
  incrementUnreadCount: (chatId) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [chatId]: (state.unreadCounts[chatId] || 0) + 1,
      },
    })),
  clearUnreadCount: (chatId) =>
    set((state) => {
      if (!state.unreadCounts[chatId]) return state;
      return {
        unreadCounts: {
          ...state.unreadCounts,
          [chatId]: 0,
        },
      };
    }),
  setCallNotification: (callNotification) => set({ callNotification }),
  setCurrentUser: (currentUser) =>
    set({
      currentUser,
      currentUserId: currentUser?.id || null,
    }),
  logout: () =>
    set({
      currentUser: null,
      currentUserId: null,
      activeChatId: 'group-command',
      messagesByChat: {},
      socketConnected: false,
    }),
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
  setChatGroups: (chatGroups) =>
    set((state) => {
      const current = JSON.stringify(state.chatGroups);
      const next = JSON.stringify(chatGroups);

      if (current === next) {
        return state;
      }

      return { chatGroups };
    }),
  addChatGroup: (group) =>
    set((state) => {
      if (state.chatGroups.some((existing) => existing.id === group.id)) {
        return state;
      }

      return { chatGroups: [group, ...state.chatGroups] };
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
