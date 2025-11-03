// Zustand store for chat state management
// Now includes meeting location and date/time handling
import { create } from 'zustand';
import { startDirectChat, sendMessage, loadOlderMessages, subscribeToUserConversations } from '@/hooks/useChat';
import { db } from '@/../firebase';
import { doc, updateDoc, onSnapshot, writeBatch, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { auth } from '@/../firebase';
import { useAuthStore } from './useAuthStore';

// Main chat store: holds active conversation, messages, meeting logistics, and helpers.
export const useChatStore = create((set, get) => ({
  activeConversationId: null,
  activeMessages: [],
  loading: false,
  error: null,
  _unsubscribeMessages: null,
  orderContext: null,
  hasMoreHistory: true,
  conversations: [],
  meetingLocation: '',
  meetingLocationConfirmedBy: [],
  meetingLocationFinalizedMessageSent: false,
  meetingDateTime: null,
  meetingDateTimeProposedBy: null,
  meetingDateTimeConfirmedBy: [],
  meetingDateTimeFinalizedMessageSent: false,
  _unsubscribeChatMeta: null,
  _lastLocationUpdateAt: 0,
  _lastDateTimeProposalAt: 0,

  // Unified meta subscription (location, confirmations, date/time) to reduce duplicate reads by the firestore
  subscribeToChatMeta: (chatId) => {
    if (!chatId) return;
    const prev = get()._unsubscribeChatMeta;
    if (prev) prev();
    const chatRef = doc(db, 'chats', chatId);
    const arraysEqual = (a = [], b = []) => {
      if (a === b) return true;
      if (!Array.isArray(a) || !Array.isArray(b)) return false;
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
      return true;
    };
    const unsub = onSnapshot(chatRef, (docSnap) => {
      if (!docSnap.exists()) return;
      const data = docSnap.data();
      const current = get();
      const updates = {};
      const nextLocation = data.meetingLocation || 'Adelphi University';
      if (current.meetingLocation !== nextLocation) {
        updates.meetingLocation = nextLocation;
      }
      if (!arraysEqual(current.meetingLocationConfirmedBy, data.meetingLocationConfirmedBy || [])) {
        updates.meetingLocationConfirmedBy = data.meetingLocationConfirmedBy || [];
      }
      if (current.meetingLocationFinalizedMessageSent !== !!data.meetingLocationFinalizedMessageSent) {
        updates.meetingLocationFinalizedMessageSent = !!data.meetingLocationFinalizedMessageSent;
      }
      if (current.meetingDateTime !== (data.meetingDateTime || null)) {
        updates.meetingDateTime = data.meetingDateTime || null;
      }
      if (current.meetingDateTimeProposedBy !== (data.meetingDateTimeProposedBy || null)) {
        updates.meetingDateTimeProposedBy = data.meetingDateTimeProposedBy || null;
      }
      if (!arraysEqual(current.meetingDateTimeConfirmedBy, data.meetingDateTimeConfirmedBy || [])) {
        updates.meetingDateTimeConfirmedBy = data.meetingDateTimeConfirmedBy || [];
      }
      if (current.meetingDateTimeFinalizedMessageSent !== !!data.meetingDateTimeFinalizedMessageSent) {
        updates.meetingDateTimeFinalizedMessageSent = !!data.meetingDateTimeFinalizedMessageSent;
      }
      if (Object.keys(updates).length) set(updates);
    });
    set({ _unsubscribeChatMeta: unsub });
  },

  // First user proposes a date/time 
  proposeMeetingDateTime: async (chatId, dateTime) => {
    if (!chatId || !dateTime) return;
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) return;
    // Skip duplicate proposal
    if (get().meetingDateTime === dateTime) {
      if (import.meta.env.DEV) console.debug('[chat] skip duplicate dateTime proposal');
      return;
    }
    // Cooldown: avoid rapid proposals (500ms)
    const now = Date.now();
    if (now - get()._lastDateTimeProposalAt < 500) {
      if (import.meta.env.DEV) console.debug('[chat] skip dateTime proposal cooldown');
      return;
    }
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      meetingDateTime: dateTime,
      meetingDateTimeProposedBy: currentUser.id,
      meetingDateTimeConfirmedBy: [currentUser.id],
    });
    set({_lastDateTimeProposalAt: now});
  },

  // Second user confirms the proposed date/time
  confirmMeetingDateTime: async (chatId) => {
    if (!chatId) return;
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) return;
    if ((get().meetingDateTimeConfirmedBy || []).includes(currentUser.id)) {
      if (import.meta.env.DEV) console.debug('[chat] skip confirm dateTime already confirmed');
      return;
    }
    const chatRef = doc(db, 'chats', chatId);
    try {
      const nextConfirmed = Array.from(new Set([...(get().meetingDateTimeConfirmedBy || []), currentUser.id]));
      const isConfirmed = nextConfirmed.length === 2 && get().meetingDateTime;
      if (!isConfirmed || get().meetingDateTimeFinalizedMessageSent) {
        await updateDoc(chatRef, { meetingDateTimeConfirmedBy: nextConfirmed });
      } else {
        // update array + flag + system message + lastMessage
        const batch = writeBatch(db);
        batch.update(chatRef, { meetingDateTimeConfirmedBy: nextConfirmed, meetingDateTimeFinalizedMessageSent: true });
        const messagesCol = collection(db, 'chats', chatId, 'messages');
        const msgRef = doc(messagesCol);
        const rawDt = get().meetingDateTime;
        const formattedDt = (() => {
          try { return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(rawDt)); } catch { return rawDt; }
        })();
        const textVal = `Meeting date & time confirmed: ${formattedDt}`;
        batch.set(msgRef, {
          type: 'system',
          eventType: 'datetime-finalized',
          payload: { dateTime: get().meetingDateTime },
          createdAt: serverTimestamp(),
          actorId: currentUser.id,
          text: textVal,
          senderFirebaseUid: auth.currentUser?.uid || null,
        });
        batch.update(chatRef, { lastMessage: { text: textVal, senderId: currentUser.id, createdAt: serverTimestamp() }, updatedAt: serverTimestamp() });
        await batch.commit();
        set({ meetingDateTimeFinalizedMessageSent: true });
      }
    } catch (e) {
      console.warn('confirmMeetingDateTime error:', e.message);
    }
  },
  subscribeToMeetingLocationConfirmation: () => {},
  subscribeToMeetingDateTime: () => {},
  subscribeToMeetingLocation: () => {},

  // User confirms chosen meeting location
  confirmMeetingLocation: async (chatId) => {
    if (!chatId) return;
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) return;
    if ((get().meetingLocationConfirmedBy || []).includes(currentUser.id)) {
      if (import.meta.env.DEV) console.debug('[chat] skip confirm location already confirmed');
      return;
    }
    const chatRef = doc(db, 'chats', chatId);
    const confirmedBy = Array.from(new Set([...(get().meetingLocationConfirmedBy || []), currentUser.id]));
    const isConfirmed = confirmedBy.length === 2;
    try {
      if (!isConfirmed || get().meetingLocationFinalizedMessageSent) {
        await updateDoc(chatRef, { meetingLocationConfirmedBy: confirmedBy, ...(isConfirmed ? { meetingLocationConfirmed: true } : {}) });
      } else {
        const batch = writeBatch(db);
        batch.update(chatRef, { meetingLocationConfirmedBy: confirmedBy, meetingLocationConfirmed: true, meetingLocationFinalizedMessageSent: true });
        const messagesCol = collection(db, 'chats', chatId, 'messages');
        const msgRef = doc(messagesCol);
        const loc = get().meetingLocation;
        const textVal = `Meeting location confirmed: ${loc}`;
        batch.set(msgRef, {
          type: 'system',
          eventType: 'location-finalized',
          payload: { location: get().meetingLocation },
          createdAt: serverTimestamp(),
          actorId: currentUser.id,
          text: textVal,
          senderFirebaseUid: auth.currentUser?.uid || null,
        });
        batch.update(chatRef, { lastMessage: { text: textVal, senderId: currentUser.id, createdAt: serverTimestamp() }, updatedAt: serverTimestamp() });
        await batch.commit();
        set({ meetingLocationFinalizedMessageSent: true });
      }
    } catch (e) {
      console.warn('confirmMeetingLocation error:', e.message);
    }
  },


  // Change location: clears confirmations & date/time so users must reconfirm
  updateMeetingLocation: async (chatId, newLocation) => {
    if (!chatId || !newLocation) return;
    const chatRef = doc(db, 'chats', chatId);
    if (get().meetingLocation === newLocation) {
      if (import.meta.env.DEV) console.debug('[chat] skip duplicate location update');
      return;
    }
    // Cooldown: prevent rapid successive writes (1.5s)
    const now = Date.now();
    if (now - get()._lastLocationUpdateAt < 1500) {
      if (import.meta.env.DEV) console.debug('[chat] skip location update cooldown');
      return;
    }
    await updateDoc(chatRef, {
      meetingLocation: newLocation,
      meetingLocationConfirmedBy: [],
      meetingLocationConfirmed: false,
      meetingLocationFinalizedMessageSent: false,
      meetingDateTime: null,
      meetingDateTimeProposedBy: null,
      meetingDateTimeConfirmedBy: [],
      meetingDateTimeFinalizedMessageSent: false,
    });
    set({_lastLocationUpdateAt: Date.now()});
  },
  _unsubscribeConversations: null,

  // Subscribe to user's conversation list once
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
      // Avoid extra write if already marked in last 5s or no unread flag locally
      const convo = get().conversations.find(c => c.conversationId === activeConversationId);
    // simplified: rely solely on unread flag, remove time-based throttle
  if (convo && convo.unread === 0) return;
      const { db } = await import('@/../firebase');
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      await updateDoc(doc(db, 'chats', activeConversationId), { [`lastReadAt.${currentUser.id}`]: serverTimestamp() });
      set({
        conversations: get().conversations.map(c => c.conversationId === activeConversationId ? { ...c, unread: 0 } : c),
      });
    } catch (e) {
      console.warn('markActiveRead failed', e.message);
    }
  },

  // Start or resume a direct chat and begin messages subscription
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

  // Send a message in the active conversation
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

  // Page backwards to load older messages
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

  // Unsubscribe everything and reset state (e.g. on logout/navigation)
  clearChat: () => {
  const prev = get()._unsubscribeMessages;
  if (prev) prev();
  const unsubMeta = get()._unsubscribeChatMeta;
  if (unsubMeta) unsubMeta();

    const unsubConversations = get()._unsubscribeConversations;
    if (unsubConversations) unsubConversations();
    set({
      activeConversationId: null,
      activeMessages: [],
      _unsubscribeMessages: null,
      orderContext: null,
      hasMoreHistory: true,
      meetingLocation: 'Adelphi University',
      meetingLocationConfirmedBy: [],
      meetingLocationFinalizedMessageSent: false,
      meetingDateTimeFinalizedMessageSent: false,
      meetingDateTimeConfirmedBy: [],
      _unsubscribeChatMeta: null,
      _unsubscribeConversations: null,
      _lastLocationUpdateAt: 0,
      _lastDateTimeProposalAt: 0,
    });
  }
}));
