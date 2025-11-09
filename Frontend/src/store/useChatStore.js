// Zustand store for chat state management
// Now includes meeting location and date/time handling
// Reverse block subscription feature prompted by Co-Pilot
// Prompt : How to implement a reverse block subscription in a Zustand store for chat management using Firestore?
import { create } from 'zustand';
import { startDirectChat, sendMessage, loadOlderMessages, subscribeToUserConversations, subscribeToMessages } from '@/hooks/useChat';
import { db } from '@/../firebase';
import { doc, updateDoc, onSnapshot, writeBatch, serverTimestamp, collection, addDoc, deleteDoc, query, where } from 'firebase/firestore';
import { auth } from '@/../firebase';
import { useAuthStore } from './useAuthStore';
import api from '@/utils/axios';
import { onAuthStateChanged } from 'firebase/auth';

// Main chat store: holds active conversation, messages, meeting logistics, and helpers.
const persistedModeration = (() => {
  try { return JSON.parse(localStorage.getItem('cc_blockLists') || '{}'); } catch { return {}; }
})();

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
  meetingLocationProposedBy: null,
  meetingDateTime: null,
  meetingDateTimeProposedBy: null,
  meetingDateTimeConfirmedBy: [],
  meetingDateTimeFinalizedMessageSent: false,
  _unsubscribeChatMeta: null,
  _unsubscribeBlocks: null,
  _unsubscribeBlocksForward: null,
  _unsubscribeBlocksReverse: null,
  _lastLocationUpdateAt: 0,
  _lastDateTimeProposalAt: 0,
  // Moderation / safety additions, added blocked user ID and timestamp for rate limiting
  blockedFirebaseUids: persistedModeration.blockedFirebaseUids || [],   // hydrated from localStorage
  blockedByFirebaseUids: persistedModeration.blockedByFirebaseUids || [], // hydrated from localStorage
  _recentMessageTimes: [],   

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
      if (current.meetingLocationProposedBy !== (data.meetingLocationProposedBy || null)) {
        updates.meetingLocationProposedBy = data.meetingLocationProposedBy || null;
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
  // duplicate dateTime proposal
      return;
    }
    // Cooldown: avoid rapid proposals (500ms)
    const now = Date.now();
    if (now - get()._lastDateTimeProposalAt < 500) {
  // dateTime proposal cooldown
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
  // already confirmed dateTime
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
          senderId: currentUser.id,
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

  // User confirms chosen meeting location
  confirmMeetingLocation: async (chatId) => {
    if (!chatId) return;
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) return;
    if ((get().meetingLocationConfirmedBy || []).includes(currentUser.id)) {
  // already confirmed location
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
          senderId: currentUser.id,
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
      // If location is identical but previously confirmed, allow reset so users can reconfirm
      if ((get().meetingLocationConfirmedBy || []).length < 2) return; // only ignore truly duplicate when not fully confirmed
    }
    // Cooldown: prevent rapid successive writes (1.5s)
    const now = Date.now();
    if (now - get()._lastLocationUpdateAt < 1500) {
  // location update cooldown
      return;
    }
    const currentUser = useAuthStore.getState().user;
    const proposerId = currentUser?.id || null;

    //Updating location and resetting confirmations + date/time
    await updateDoc(chatRef, {
      meetingLocation: newLocation,
      meetingLocationConfirmedBy: [],
      meetingLocationConfirmed: false,
      meetingLocationFinalizedMessageSent: false,
      meetingDateTime: null,
      meetingDateTimeProposedBy: null,
      meetingDateTimeConfirmedBy: [],
      meetingDateTimeFinalizedMessageSent: false,
      meetingLocationProposedBy: proposerId,
    });
    // Optimistic local state update so UI reflects change immediately without waiting for snapshot
    set({
      meetingLocation: newLocation,
      meetingLocationConfirmedBy: [],
      meetingLocationFinalizedMessageSent: false,
      meetingLocationProposedBy: proposerId,
      meetingDateTime: null,
      meetingDateTimeProposedBy: null,
      meetingDateTimeConfirmedBy: [],
      meetingDateTimeFinalizedMessageSent: false,
    });
    set({_lastLocationUpdateAt: Date.now()});
  },
  // Reset confirmations for current location without changing the address
  resetMeetingLocationConfirmation: async (chatId) => {
    if (!chatId) return;
    try {
      const chatRef = doc(db, 'chats', chatId);
      await updateDoc(chatRef, {
        meetingLocationConfirmedBy: [],
        meetingLocationConfirmed: false,
        meetingLocationFinalizedMessageSent: false,
      });
      set({
        meetingLocationConfirmedBy: [],
        meetingLocationFinalizedMessageSent: false,
      });
    } catch (e) {
      console.warn('resetMeetingLocationConfirmation failed', e.message);
      set({ error: 'Failed to reset location confirmation: ' + e.message });
    }
  },
  _unsubscribeConversations: null,

  // Subscribe to user's conversation list once
  initConversations: () => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) return;
    // Hydrate moderation (blocked users) once Firebase auth available
    try { get().ensureBlockSubscriptions(); } catch { /* ignore */ }
    if (get()._unsubscribeConversations) return;
    const unsub = subscribeToUserConversations(currentUser.id, (raw) => {
      const rows = raw.map(c => {
        const otherId = (c.participants || []).find(p => p !== currentUser.id);
        const lastMsg = c.lastMessage || null;
        const lastReadAt = c.lastReadAt?.[currentUser.id];
        const otherFirebaseUid = (c.participantFirebaseUids || []).find(f => f !== auth.currentUser?.uid);
        let unread = 0;
        if (lastMsg?.createdAt && (!lastReadAt || (lastReadAt?.toMillis?.() || 0) < (lastMsg.createdAt?.toMillis?.() || 0))) unread = 1;
        return {
          conversationId: c.id,
          otherUserId: otherId,
          otherFirebaseUid,
          lastMessage: lastMsg,
          unread,
          updatedAt: c.updatedAt,
          orderIds: c.orderIds || []
        };
      });
      // Just set conversations; block state derived dynamically from firebase UID list
      set({ conversations: rows });
    });
    set({ _unsubscribeConversations: unsub });
  },

  stopConversations: () => {
    const u = get()._unsubscribeConversations;
    if (u) u();
    set({ _unsubscribeConversations: null, conversations: [] });
  },

  // Selecting an existing conversation must establish a messages subscription.
  // Previously this only set the ID, leaving ChatWindow with an empty message array.
  selectConversation: (conversationId) => {
    if (!conversationId) return;
    const current = get();
    // If already on this conversation with an active subscription, do nothing.
    if (current.activeConversationId === conversationId && current._unsubscribeMessages) return;
    // Tear down prior subscription.
    if (current._unsubscribeMessages) {
      try { current._unsubscribeMessages(); } catch {/* noop */}
    }
    // Reset messages (avoid showing stale ones while new snapshot resolves)
    set({ activeConversationId: conversationId, activeMessages: [], loading: true, error: null, _unsubscribeMessages: null });
    // Subscribe to messages
    const unsubscribe = subscribeToMessages(conversationId, (msgs) => {
      set({ activeMessages: msgs, loading: false });
      if (msgs.length) {
        // Mark read after first batch
        get().markActiveRead();
      }
    });
    set({ _unsubscribeMessages: unsubscribe });
    // Subscribe to meta (location/date/time confirmations)
    get().subscribeToChatMeta(conversationId);
  // subscribed to conversation messages
  },

  markActiveRead: async () => {
    const { activeConversationId } = get();
    const currentUser = useAuthStore.getState().user;
    if (!activeConversationId || !currentUser) return;
    try {
      const convo = get().conversations.find(c => c.conversationId === activeConversationId);
      if (convo && convo.unread === 0) return; // already marked
      await updateDoc(doc(db, 'chats', activeConversationId), { [`lastReadAt.${currentUser.id}`]: serverTimestamp() });
      set({ conversations: get().conversations.map(c => c.conversationId === activeConversationId ? { ...c, unread: 0 } : c) });
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
        onMessages: (msgs) => {
          set({ activeMessages: msgs });
          // Attempt to infer peer firebaseUid early from incoming messages if not yet hydrated on conversation
          try {
            const state = get();
            const convo = state.conversations.find(c => c.conversationId === conversationId);
            const peerAppUserId = convo?.otherUserId;
            if (peerAppUserId && !convo?.otherFirebaseUid) {
              const peerMsg = msgs.find(m => m.senderId === peerAppUserId && m.senderFirebaseUid);
              if (peerMsg?.senderFirebaseUid) {
                set({
                  conversations: state.conversations.map(c => c.conversationId === conversationId ? { ...c, otherFirebaseUid: peerMsg.senderFirebaseUid } : c)
                });
                // Persist mapping for future refreshes
                try {
                  const mapRaw = localStorage.getItem('cc_peerUidMap');
                  const map = mapRaw ? JSON.parse(mapRaw) : {};
                  map[peerAppUserId] = peerMsg.senderFirebaseUid;
                  localStorage.setItem('cc_peerUidMap', JSON.stringify(map));
                } catch {/* ignore storage errors */}
              }
            }
          } catch {/* ignore inference errors */}
        }
      });
      set({ activeConversationId: conversationId, _unsubscribeMessages: unsubscribe, loading: false });
      get().markActiveRead();
    } catch (e) {
      let friendly = e.message;
      // Friendly error mapping
      if (/not chat-enabled/i.test(e.message)) friendly = 'Your account is missing Firebase linkage. Please log out and log back in or refresh the page to complete chat setup.';
      if (/other user has not enabled chat/i.test(e.message)) friendly = 'That user has not enabled chat yet.';
      if (/blocked by security rules/i.test(e.message)) friendly = 'Chat creation blocked by security rules. Both users must have Firebase-linked accounts.';
      set({ error: friendly, loading: false });
    }
  },

  // Send a message in the active conversation
  // Now checks if either party has blocked the other before sending
  sendActiveMessage: async (text, extra = {}) => {
    const { activeConversationId, orderContext, conversations, _recentMessageTimes } = get();
    const currentUser = useAuthStore.getState().user;
    if (!activeConversationId || !currentUser) return;
    const trimmed = (text || '').trim();
    if (!trimmed) return;
    // Derive peerId from conversation participants if available
    let peerId = extra.otherUserId;
    if (!peerId) {
      const convo = conversations.find(c => c.conversationId === activeConversationId || c.id === activeConversationId);
      if (convo) {
        const participants = convo.participants || convo.participantIds || [];
        peerId = participants.find(p => p !== currentUser.id);
      }
    }
    // Block check using unified isBlocked()
    if (peerId && get().isBlocked(peerId)) {
      set({ error: 'You blocked this user.' });
      return;
    }
    // Reverse block: peer has blocked you
    if (peerId && get().isBlockedByPeer && get().isBlockedByPeer(peerId)) {
      set({ error: 'This user has blocked you. You cannot send messages.' });
      return;
    }
    // Length enforcement (aligned with Firestore rule)
    if (trimmed.length > 2000) {
      set({ error: 'Message too long (max 2000 characters).' });
      return;
    }
    // Simple rate limiting: max 5 messages / 10s window
    const now = Date.now();
    const windowMs = 10_000;
    const maxMsgs = 5;
    const recent = _recentMessageTimes.filter(t => now - t < windowMs);
    if (recent.length >= maxMsgs) {
      set({ error: 'Too many messages, slow down.' });
      return;
    }
    recent.push(now);
    set({ _recentMessageTimes: recent, error: null });
    try {
      await sendMessage({
        conversationId: activeConversationId,
        senderAppUserId: currentUser.id,
        senderFirebaseUid: currentUser.firebaseUid || auth.currentUser?.uid,
        text: trimmed,
        orderContext,
        otherUserId: peerId
      });
    } catch (e) {
      console.warn('Send message failed:', e.message);
      set({ error: e.message });
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
  const unsubBlocks = get()._unsubscribeBlocks;
  if (unsubBlocks) unsubBlocks();

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
      meetingLocationProposedBy: null,
      meetingDateTimeFinalizedMessageSent: false,
      meetingDateTimeConfirmedBy: [],
      _unsubscribeChatMeta: null,
      _unsubscribeConversations: null,
      _unsubscribeBlocks: null,
      _unsubscribeBlocksForward: null,
      _unsubscribeBlocksReverse: null,
      _lastLocationUpdateAt: 0,
      _lastDateTimeProposalAt: 0,
      blockedFirebaseUids: [],
      blockedByFirebaseUids: [],
      _recentMessageTimes: [],
    });
  }
  ,
  // Adds blocked users to Firestore subscriptions
  subscribeBlockedUsers: () => {
    if (!auth.currentUser) return;
    const currentUid = auth.currentUser.uid;
    const blocksCol = collection(db, 'userBlocks');
    // Forward subscription
    if (!get()._unsubscribeBlocksForward) {
      const qForward = query(blocksCol, where('ownerUid', '==', currentUid));
      const unsubForward = onSnapshot(qForward, (snapshot) => {
        const forwardIds = snapshot.docs.map(d => d.data().peerUid).filter(Boolean);
        set({ blockedFirebaseUids: forwardIds });
        get().persistBlockLists();
      }, (e) => {
        if (e.code === 'permission-denied' && !auth.currentUser) {
          try { unsubForward(); } catch {}
          set({ blockedFirebaseUids: [] });
          set({ _unsubscribeBlocksForward: null });
          return;
        }
        if (import.meta.env.DEV) console.warn('[blocks] forward subscribe error', e.code, e.message);
      });
      set({ _unsubscribeBlocksForward: unsubForward });
    }
    // Reverse subscription - when others block the current user
    if (!get()._unsubscribeBlocksReverse) {
      const qReverse = query(blocksCol, where('peerUid', '==', currentUid));
      const unsubReverse = onSnapshot(qReverse, (snapshot) => {
        const reverseIds = snapshot.docs.map(d => d.data().ownerUid).filter(Boolean);
        set({ blockedByFirebaseUids: reverseIds });
        get().persistBlockLists();
      }, (e) => {
        if (e.code === 'permission-denied' && !auth.currentUser) {
          try { unsubReverse(); } catch {}
          set({ blockedByFirebaseUids: [] });
          set({ _unsubscribeBlocksReverse: null });
          return;
        }
        if (import.meta.env.DEV) console.warn('[blocks] reverse subscribe error', e.code, e.message);
      });
      set({ _unsubscribeBlocksReverse: unsubReverse });
    }
    // Unified cleanup handle
    set({ _unsubscribeBlocks: () => {
      const f = get()._unsubscribeBlocksForward; const r = get()._unsubscribeBlocksReverse;
      try { f && f(); } catch {}
      try { r && r(); } catch {}
      set({ _unsubscribeBlocksForward: null, _unsubscribeBlocksReverse: null });
    }});
  },
  persistBlockLists: () => {
    const { blockedFirebaseUids, blockedByFirebaseUids } = get();
    try { localStorage.setItem('cc_blockLists', JSON.stringify({ blockedFirebaseUids, blockedByFirebaseUids, ts: Date.now() })); } catch {}
  },
  ensureBlockSubscriptions: () => {
    const state = get();
    if (state._unsubscribeBlocksForward && state._unsubscribeBlocksReverse) return; // already active
    if (auth.currentUser) {
      state.subscribeBlockedUsers();
      return;
    }
    try {
      onAuthStateChanged(auth, (u) => { if (u) { get().subscribeBlockedUsers(); } });
    } catch {/* ignore */}
  },
  // Persist + optimistic update
  blockUser: async (peerAppUserId) => {
    if (!peerAppUserId) return;
    if (!auth.currentUser) { set({ error: 'Not authenticated.' }); return; }
    // Derive peer firebase UID from conversations
    const convo = get().conversations.find(c => c.otherUserId === peerAppUserId);
    let peerFirebaseUid = convo?.otherFirebaseUid;
    if (!peerFirebaseUid) {
      // Try localStorage map
      try {
        const mapRaw = localStorage.getItem('cc_peerUidMap');
        if (mapRaw) {
          const map = JSON.parse(mapRaw);
          if (map && map[peerAppUserId]) peerFirebaseUid = map[peerAppUserId];
        }
      } catch {}
    }
    if (!peerFirebaseUid) {
      // Try messages
      const msg = get().activeMessages.find(m => m.senderId === peerAppUserId && m.senderFirebaseUid);
      if (msg?.senderFirebaseUid) peerFirebaseUid = msg.senderFirebaseUid;
    }
    if (!peerFirebaseUid) {
      // Fetch user profile as last resort
      try {
        const res = await api.get(`/auth/user/${peerAppUserId}`);
        if (res.data?.user?.firebaseUid) peerFirebaseUid = res.data.user.firebaseUid;
      } catch {/* ignore */}
    }
    if (!peerFirebaseUid) { set({ error: 'Peer not chat-enabled.' }); return; }
    if (get().blockedFirebaseUids.includes(peerFirebaseUid)) return;
    // Optimistic
  set({ blockedFirebaseUids: [...get().blockedFirebaseUids, peerFirebaseUid] });
    try {
      // Flat collection doc (auto-id) per block pair
      await addDoc(collection(db, 'userBlocks'), {
        ownerUid: auth.currentUser.uid,
        peerUid: peerFirebaseUid,
        createdAt: serverTimestamp(),
      });
      get().persistBlockLists();
    } catch (e) {
      const msg = e.code === 'permission-denied' ? 'Permission denied (userBlocks flat collection).' : e.message;
      set({ blockedFirebaseUids: get().blockedFirebaseUids.filter(f => f !== peerFirebaseUid), error: 'Failed to block user: ' + msg });
    }
  },
  unblockUser: async (peerAppUserId) => {
    if (!peerAppUserId) return;
    if (!auth.currentUser) { set({ error: 'Not authenticated.' }); return; }
    const convo = get().conversations.find(c => c.otherUserId === peerAppUserId);
    const peerFirebaseUid = convo?.otherFirebaseUid;
    if (!peerFirebaseUid) return;
    if (!get().blockedFirebaseUids.includes(peerFirebaseUid)) return;
    // Optimistic
  set({ blockedFirebaseUids: get().blockedFirebaseUids.filter(f => f !== peerFirebaseUid) });
    try {
      // Delete all matching (usually one) documents for this pair
      const blocksCol = collection(db, 'userBlocks');
      const qBlocks = query(blocksCol, where('ownerUid', '==', auth.currentUser.uid), where('peerUid', '==', peerFirebaseUid));
      const snap = await import('firebase/firestore').then(m => m.getDocs(qBlocks));
      for (const d of snap.docs) {
        try { await deleteDoc(d.ref); } catch {/* ignore individual failures */}
      }
      get().persistBlockLists();
    } catch (e) {
      const msg = e.code === 'permission-denied' ? 'Permission denied (flat delete).' : e.message;
      set({ blockedFirebaseUids: [...get().blockedFirebaseUids, peerFirebaseUid], error: 'Failed to unblock user: ' + msg });
    }
  },
  isBlocked: (peerId) => {
    if (!peerId) return false;
    const state = get();
    let convo = state.conversations.find(c => c.otherUserId === peerId);
    let peerFirebaseUid = convo?.otherFirebaseUid;
    if (!peerFirebaseUid) {
      // Fallback from messages
      const msg = state.activeMessages.find(m => m.senderId === peerId && m.senderFirebaseUid);
      if (msg?.senderFirebaseUid) peerFirebaseUid = msg.senderFirebaseUid;
    }
    if (!peerFirebaseUid) {
      // Fallback from persisted map
      try {
        const mapRaw = localStorage.getItem('cc_peerUidMap');
        if (mapRaw) {
          const map = JSON.parse(mapRaw);
          if (map && map[peerId]) peerFirebaseUid = map[peerId];
        }
      } catch {/* ignore */}
    }
    return !!(peerFirebaseUid && state.blockedFirebaseUids.includes(peerFirebaseUid));
  },
  isBlockedByPeer: (peerId) => {
    if (!peerId) return false;
    const state = get();
    let convo = state.conversations.find(c => c.otherUserId === peerId);
    let peerFirebaseUid = convo?.otherFirebaseUid;
    if (!peerFirebaseUid) {
      const msg = state.activeMessages.find(m => m.senderId === peerId && m.senderFirebaseUid);
      if (msg?.senderFirebaseUid) peerFirebaseUid = msg.senderFirebaseUid;
    }
    if (!peerFirebaseUid) {
      try {
        const mapRaw = localStorage.getItem('cc_peerUidMap');
        if (mapRaw) {
          const map = JSON.parse(mapRaw);
          if (map && map[peerId]) peerFirebaseUid = map[peerId];
        }
      } catch {/* ignore */}
    }
    return !!(peerFirebaseUid && state.blockedByFirebaseUids.includes(peerFirebaseUid));
  },
}));
