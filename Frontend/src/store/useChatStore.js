// Zustand store for chat state management
import { create } from 'zustand';
import { startDirectChat, sendMessage, loadOlderMessages, subscribeToUserConversations } from '@/hooks/useChat';
import { auth } from '@/../firebase';
import { useAuthStore } from './useAuthStore';

export const useChatStore = create((set, get) => ({
  activeConversationId: null,
  activeMessages: [],
  loading: false,
  error: null,
  _unsubscribeMessages: null,
  orderContext: null,
  hasMoreHistory: true,
  conversations: [],
  _unsubscribeConversations: null,

  initConversations: () => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) return;
    if (get()._unsubscribeConversations) return;
    const unsub = subscribeToUserConversations(currentUser.id, (raw) => {
      const rows = raw.map(c => {
        const otherId = (c.participants || []).find(p => p !== currentUser.id);
        const lastMsg = c.lastMessage || null;
        const lastReadAt = c.lastReadAt?.[currentUser.id];
        let unread = 0;
        if (lastMsg?.createdAt && (!lastReadAt || (lastReadAt?.toMillis?.() || 0) < (lastMsg.createdAt?.toMillis?.() || 0))) unread = 1;
        return {
          conversationId: c.id,
          otherUserId: otherId,
          lastMessage: lastMsg,
          unread,
          updatedAt: c.updatedAt,
          orderIds: c.orderIds || []
        };
      });
      set({ conversations: rows });
    });
    set({ _unsubscribeConversations: unsub });
  },

  stopConversations: () => {
    const u = get()._unsubscribeConversations;
    if (u) u();
    set({ _unsubscribeConversations: null, conversations: [] });
  },

  selectConversation: (conversationId) => {
    set({ activeConversationId: conversationId });
  },

  markActiveRead: async () => {
    const { activeConversationId } = get();
    const currentUser = useAuthStore.getState().user;
    if (!activeConversationId || !currentUser) return;
    try {
      const { db } = await import('@/../firebase');
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      await updateDoc(doc(db, 'chats', activeConversationId), {
        [`lastReadAt.${currentUser.id}`]: serverTimestamp()
      });
      set({ conversations: get().conversations.map(c => c.conversationId === activeConversationId ? { ...c, unread: 0 } : c) });
    } catch (e) {
      console.warn('markActiveRead failed', e.message);
    }
  },

  startChatWithUser: async (otherUser, { orderContext } = {}) => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser || !otherUser) return;
    get().initConversations();
    set({ loading: true, error: null, orderContext });
    try {
      const prev = get()._unsubscribeMessages;
      if (prev) prev();
      const { conversationId, unsubscribe } = await startDirectChat({
        currentUser,
        otherUser,
        orderContext,
        onMessages: (msgs) => set({ activeMessages: msgs })
      });
      set({ activeConversationId: conversationId, _unsubscribeMessages: unsubscribe, loading: false });
      get().markActiveRead();
    } catch (e) {
      let friendly = e.message;
      if (/not chat-enabled/i.test(e.message)) friendly = 'Your account is missing Firebase linkage. Please log out and log back in or refresh the page to complete chat setup.';
      if (/other user has not enabled chat/i.test(e.message)) friendly = 'That user has not enabled chat yet.';
      if (/blocked by security rules/i.test(e.message)) friendly = 'Chat creation blocked by security rules. Both users must have Firebase-linked accounts.';
      set({ error: friendly, loading: false });
    }
  },

  sendActiveMessage: async (text, extra = {}) => {
    const { activeConversationId, orderContext } = get();
    const currentUser = useAuthStore.getState().user;
    if (!activeConversationId || !currentUser) return;
    try {
      await sendMessage({
        conversationId: activeConversationId,
        senderAppUserId: currentUser.id,
        senderFirebaseUid: currentUser.firebaseUid || auth.currentUser?.uid,
        text,
        orderContext,
        otherUserId: extra.otherUserId
      });
    } catch (e) {
      console.warn('Send message failed:', e.message);
    }
  },

  loadOlder: async () => {
    const { activeMessages, activeConversationId } = get();
    if (!activeConversationId || !activeMessages.length) return;
    try {
      const first = activeMessages[0];
      const older = await loadOlderMessages(activeConversationId, first);
      if (!older.length) {
        set({ hasMoreHistory: false });
        return;
      }
      set({ activeMessages: [...older, ...activeMessages] });
    } catch (e) {
      console.warn('Load older failed:', e.message);
    }
  },

  clearChat: () => {
    const prev = get()._unsubscribeMessages;
    if (prev) prev();
    set({ activeConversationId: null, activeMessages: [], _unsubscribeMessages: null, orderContext: null, hasMoreHistory: true });
  }
}));
