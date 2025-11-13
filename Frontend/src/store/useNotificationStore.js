/**
 * Notification Store (Zustand)
 * Purpose: Manages per-user in‑app notifications loaded from Firestore
 * under users/{userId}/notifications. Provides real‑time subscription,
 * pagination (loadOlder), unread count tracking,  read marking,
 * and immediate UX feedback.
 *
 * Recent Changes:
 * - Added resilient subscription that waits for Firebase auth linkage and
 *   retries several times for first‑time seller logins (see retry loop +
 *   auth state listener gating).
 * - Ensures parent user Firestore document exists before attaching the
 *   collection listener, handling cases where backend already wrote
 *   notifications pre‑login.
 * - Tracks pagination cursor (_lastCursor) to fetch older pages without
 *   duplicating documents; older items appended preserving newest‑first
 *   ordering for the primary slice.
 * - Performs optimistic read marking (markRead / markAllRead) to keep UI
 *   snappy, then persists via serverTimestamp to maintain consistency.
 * - Supports ephemeral notifications (isEphemeral flag) so transient UI
 *   states can reuse the same component tree without polluting Firestore.
 * - Defensive error handling: permission‑denied triggers delayed resubscribe
 *   if auth linkage was still racing.
 */
// Zustand store for in-app notifications
// Data model: users/{userId}/notifications/{notificationId}
// Doc shape (order.requested deprecated):
// {
//   type: 'order.status.changed' | 'chat.message.new' | ...,
//   userId: 'abc',
//   actorId: 'def',
//   relatedIds: { orderId, chatId, productId },
//   title: 'Status changed',
//   body: 'Your order status changed',
//   payload: { status: 'APPROVED', ... },
//   createdAt: serverTimestamp(),
//   readAt: null,
//   isSystem: false,
//   severity: 'info' | 'success' | 'warning' | 'error'
// }

import { create } from 'zustand';
import { toast } from 'sonner';
import { db, auth } from '@/../firebase';
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc, serverTimestamp, getDocs, startAfter, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useAuthStore } from './useAuthStore';

export const useNotificationStore = create((set, get) => ({
  notifications: [], // newest first
  unreadCount: 0,
  loading: false,
  error: null,
  _unsubscribe: null,
  _lastCursor: null,
  _authListenerAttached: false,

  // Subscribe to realtime notifications for current user (first page)
  subscribe: () => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    // Derive canonical user id
    const userId = user.id || user._id || user.userId;
    if (!userId) return;
  // Gate subscription until firebase linkage aligns (retry loop for first-time login)
    if (!auth.currentUser || !user.firebaseUid || user.firebaseUid !== auth.currentUser.uid) {
      if (!get()._authListenerAttached) {
        const detach = onAuthStateChanged(auth, (fbUser) => {
          if (fbUser && useAuthStore.getState().user?.firebaseUid === fbUser.uid) {
            get().subscribe();
          }
        });
        set({ _authListenerAttached: true });
      }
  // Retry loop to reconcile firebaseUid & subscribe
      const attempts = 6; // ~3s total
      for (let i = 0; i < attempts; i++) {
        setTimeout(() => {
          const latestUser = useAuthStore.getState().user;
          if (auth.currentUser && latestUser && latestUser.firebaseUid === auth.currentUser.uid) {
            get().subscribe();
          }
        }, 500 * (i + 1));
      }
      return;
    }
  // Linkage confirmed; avoid duplicate subscription
    const prev = get()._unsubscribe; if (prev) prev();
    // Ensure parent user doc exists (backend may have written before first login)
    const ensureParentDoc = async () => {
      try {
        const userRef = doc(db, 'users', userId);
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          await setDoc(userRef, { firebaseUid: user.firebaseUid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
        } else if (snap.data()?.firebaseUid !== user.firebaseUid) {
          await setDoc(userRef, { firebaseUid: user.firebaseUid, updatedAt: serverTimestamp() }, { merge: true });
        }
      } catch (e) {
        // silent
      }
    };
    ensureParentDoc();
  const baseCol = collection(db, 'users', userId, 'notifications');
    const q = query(baseCol, orderBy('createdAt', 'desc'), limit(25));
    const unsub = onSnapshot(q, async (snap) => {
      const docs = snap.docs;
      const rows = []; let unread = 0;
      docs.forEach(d => { const data = d.data(); const item = { id: d.id, ...data }; if (!item.readAt) unread++; rows.push(item); });
      set({ notifications: rows, unreadCount: unread });
      const last = docs[docs.length - 1];
      set({ _lastCursor: last || null });
    }, (e) => {
      set({ error: e.message });
      if (e.code === 'permission-denied') {
        // Retry after short delay if linkage might have just been fixed
        setTimeout(() => {
          const latest = useAuthStore.getState().user;
          if (latest && latest.firebaseUid === auth.currentUser?.uid) {
            get().subscribe();
          }
        }, 1200);
      }
    });
    set({ _unsubscribe: unsub });
  },

  // Fetch older notifications (pagination)
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
    const user = useAuthStore.getState().user; if (!user || !id) { console.warn('markRead: missing user or id', { user, id }); return; }
  // Canonical userId matches subscription path
    const userId = user.id || user._id || user.userId; if (!userId) { console.warn('markRead: missing userId', { user }); return; }
    set({ notifications: get().notifications.map(n => n.id === id ? { ...n, readAt: n.readAt || new Date().toISOString() } : n), unreadCount: Math.max(0, get().unreadCount - 1) });
    try {
      await updateDoc(doc(db, 'users', userId, 'notifications', id), { readAt: serverTimestamp() });
  toast.success('Notification marked as read');
    } catch (e) {
      toast.error(`Failed to mark notification read: ${e.message}`);
      console.error('markRead Firestore error', e);
    }
  },

  // Mark all loaded notifications as read
  markAllRead: async () => {
    const user = useAuthStore.getState().user; if (!user) return;
    const userId = user.id || user._id || user.userId; if (!userId) return;
    const batchTargets = get().notifications.filter(n => !n.readAt);
    batchTargets.forEach(n => n.readAt = n.readAt || new Date().toISOString());
    set({ notifications: [...get().notifications], unreadCount: 0 });
    try {
      const { writeBatch } = await import('firebase/firestore');
      const batch = writeBatch(db);
      batchTargets.forEach(n => batch.update(doc(db, 'users', userId, 'notifications', n.id), { readAt: serverTimestamp() }));
      await batch.commit();
    } catch (e) { console.warn('markAllRead batch failed', e.message); }
  },

  // Inject a local ephemeral notification (optimistic UI only; not persisted)
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


  // Cleanup on logout
  clear: () => {
    const prev = get()._unsubscribe; if (prev) prev();
    set({ notifications: [], unreadCount: 0, _unsubscribe: null, _lastCursor: null });
  }
}));

export default useNotificationStore;
