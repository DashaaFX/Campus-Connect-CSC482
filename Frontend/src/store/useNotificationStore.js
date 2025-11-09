// Zustand store for in-app notifications
// Data model (Firestore recommended): users/{userId}/notifications/{notificationId}
// Doc shape:
// {
//   type: 'order.requested' | 'order.status.changed' | 'chat.message.new' | 'chat.meeting.location.finalized' | ...,
//   userId: 'abc',                 // receiver
//   actorId: 'def',                // who triggered (optional)
//   relatedIds: { orderId, chatId, productId }, // optional foreign keys
//   title: 'Order requested',      // pre-rendered short string
//   body: 'User X requested Product Y', // optional longer text
//   payload: { status: 'PENDING', ... }, // machine-friendly extras
//   createdAt: serverTimestamp(),
//   readAt: null,
//   isSystem: false,
//   severity: 'info' | 'success' | 'warning' | 'error',
// }

import { create } from 'zustand';
import { db, auth } from '@/../firebase';
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc, serverTimestamp, getDocs, startAfter, getDoc, setDoc } from 'firebase/firestore';
import { useAuthStore } from './useAuthStore';

export const useNotificationStore = create((set, get) => ({
  notifications: [], // newest first
  unreadCount: 0,
  loading: false,
  error: null,
  _unsubscribe: null,
  _lastCursor: null,

  // Subscribe to realtime notifications for current user (first page)
  subscribe: () => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    // Require firebase linkage to reduce permission errors
    if (!auth.currentUser || !user.firebaseUid || auth.currentUser.uid !== user.firebaseUid) {
      // Retry later; linkage might still be occurring
      setTimeout(() => { try { get().subscribe(); } catch {} }, 1200);
      return;
    }
    // Avoid duplicate subscription
    const prev = get()._unsubscribe; if (prev) prev();
    // Ensure parent user doc exists so rules referencing it succeed
    const ensureUserDoc = async () => {
      try {
        const userRef = doc(db, 'users', user.id);
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          await setDoc(userRef, { firebaseUid: user.firebaseUid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
        } else if (snap.data()?.firebaseUid !== user.firebaseUid) {
          await updateDoc(userRef, { firebaseUid: user.firebaseUid, updatedAt: serverTimestamp() });
        }
      } catch (e) {
        // If missing rules for /users/{userId}, this will be permission-denied repeatedly.
        // Surface a single friendly error and suppress spam.
        if (e.code === 'permission-denied') {
          set(state => ({ error: state.error || 'Notifications unavailable (permission-denied on user doc). Configure Firestore rules for /users.' }));
          return; // don't retry inside this cycle
        }
        if (import.meta.env.DEV) console.warn('[notifications] ensureUserDoc failed', e.message);
      }
    };
    ensureUserDoc();
    const baseCol = collection(db, 'users', user.id, 'notifications');
    const q = query(baseCol, orderBy('createdAt', 'desc'), limit(25));
    const unsub = onSnapshot(q, (snap) => {
      const rows = [];
      let unread = 0;
      snap.forEach(d => {
        const data = d.data();
        const item = { id: d.id, ...data };
        if (!item.readAt) unread++;
        rows.push(item);
      });
      set({ notifications: rows, unreadCount: unread });
      // track cursor for pagination
      const last = snap.docs[snap.docs.length - 1];
      set({ _lastCursor: last || null });
    }, (e) => set({ error: e.message }));
    set({ _unsubscribe: unsub });
  },

  // Fetch older notifications (pagination) - append at end (older)
  loadOlder: async () => {
    const user = useAuthStore.getState().user; if (!user) return [];
    const cursor = get()._lastCursor; if (!cursor) return [];
    const baseCol = collection(db, 'users', user.id, 'notifications');
    const q = query(baseCol, orderBy('createdAt', 'desc'), startAfter(cursor), limit(25));
    try {
      const snap = await getDocs(q);
      const older = []; let unreadAdd = 0;
      snap.forEach(d => { const data = d.data(); if (!data.readAt) unreadAdd++; older.push({ id: d.id, ...data }); });
      if (!older.length) return [];
      set({ notifications: [...get().notifications, ...older], _lastCursor: snap.docs[snap.docs.length - 1] || null, unreadCount: get().unreadCount + unreadAdd });
      return older;
    } catch (e) {
      set({ error: e.message });
      return [];
    }
  },

  // Mark single notification read (optimistic)
  markRead: async (id) => {
    const user = useAuthStore.getState().user; if (!user || !id) return;
    set({ notifications: get().notifications.map(n => n.id === id ? { ...n, readAt: n.readAt || new Date().toISOString() } : n), unreadCount: Math.max(0, get().unreadCount - 1) });
    try { await updateDoc(doc(db, 'users', user.id, 'notifications', id), { readAt: serverTimestamp() }); } catch (e) { /* rollback optional */ }
  },

  // Mark all currently loaded notifications as read
  markAllRead: async () => {
    const user = useAuthStore.getState().user; if (!user) return;
    const batchTargets = get().notifications.filter(n => !n.readAt);
    batchTargets.forEach(n => n.readAt = n.readAt || new Date().toISOString());
    set({ notifications: [...get().notifications], unreadCount: 0 });
    // Firestore lacks multi-document update without batch; we can import writeBatch lazily
    try {
      const { writeBatch } = await import('firebase/firestore');
      const batch = writeBatch(db);
      batchTargets.forEach(n => batch.update(doc(db, 'users', user.id, 'notifications', n.id), { readAt: serverTimestamp() }));
      await batch.commit();
    } catch (e) { console.warn('markAllRead batch failed', e.message); }
  },

  // Inject a local ephemeral notification (e.g., optimistic UI)
  addLocal: (partial) => {
    const n = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type: partial.type || 'system.info',
      title: partial.title || 'Info',
      body: partial.body || '', 
      payload: partial.payload || {},
      createdAt: new Date().toISOString(),
      readAt: null,
      isEphemeral: true,
    };
    set({ notifications: [n, ...get().notifications], unreadCount: get().unreadCount + 1 });
  },

  // Cleanup (e.g. logout)
  clear: () => {
    const prev = get()._unsubscribe; if (prev) prev();
    set({ notifications: [], unreadCount: 0, _unsubscribe: null, _lastCursor: null });
  }
}));

export default useNotificationStore;
