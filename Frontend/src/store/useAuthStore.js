/** Auth Store (Zustand)
 * Bridges backend session auth (JWT) with Firebase Auth to enable chat &
 * notifications. Normalizes user identifiers and maintains firebaseUid.
 * Exposes register, login, logout, fetchUser, forceSyncFirebaseUid, and
 * updateProfilePicture. 
 * Added eagerFirebaseLink() to verify & link backend user to Firebase for chat.
 * Added subscription listeners for notifications after Firebase linkage.
 * Purpose now: connect backend JWT auth + Firebase identity for real‑time features.
 * 
 * CoPilot usage methods:
 *  * - Added reconciliation timers (300ms..1200ms) to fix stale firebaseUid.
 *  * - Added normalizeUser() to unify id fields (id/_id/userId/uuid/uid).
 *  * - Added forceSyncFirebaseUid() helper for manual repair.
 *  These methods were added because backend connection with Firebase console was showing errors, 
 * firebaseUids were not syncing properly.

 * 
  Prompt:
    How to ensure firebaseUid is synced properly with Firebase database after login/register?
 */

// Authentication + linkage store
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/utils/axios';
import { USER_API_ENDPOINT } from '@/utils/data';
import { auth } from '../../firebase';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { db } from '../../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';


function normalizeUser(raw, authUid) {
  if (!raw || typeof raw !== 'object') return raw;
  const possibleIds = ['id','_id','userId','uuid','uid'];
  let canonicalId = raw.id;
  for (const k of possibleIds) if (!canonicalId && raw[k]) canonicalId = raw[k];
  const user = { ...raw };
  if (canonicalId) user.id = canonicalId;
  if (!user.firebaseUid && authUid) user.firebaseUid = authUid;
  return user;
}

async function firebasePasswordSignInOrCreate(authInstance, email, password) {
  const { signInWithEmailAndPassword, createUserWithEmailAndPassword } = await import('firebase/auth');
  try {
    await signInWithEmailAndPassword(authInstance, email, password);
  } catch (err) {
    if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
      await createUserWithEmailAndPassword(authInstance, email, password);
    } else throw err;
  }
}

async function eagerFirebaseLink({ user, email, password, authInstance, apiInstance, updateUser }) {
  if (user.firebaseUid && authInstance.currentUser) return;
  try {
    await firebasePasswordSignInOrCreate(authInstance, email, password);
    const idToken = await authInstance.currentUser.getIdToken();
    console.log('[eagerFirebaseLink] Got Firebase ID token, attempting link...');
    try { await apiInstance.post('/auth/firebase/verify', { token: idToken }); } catch {/* ignore */}
    if (!user.firebaseUid) {
      console.log('[eagerFirebaseLink] Calling /auth/firebase/link...');
      const linkRes = await apiInstance.post('/auth/firebase/link', { token: idToken });
      console.log('[eagerFirebaseLink] Link response:', linkRes.data);
      if (linkRes.data?.user) updateUser(linkRes.data.user);
    } else {
      console.log('[eagerFirebaseLink] User already has firebaseUid, skipping link');
    }
  } catch (err) {
    console.error('[eagerFirebaseLink] Error:', err);
  }
}

export const useAuthStore = create(persist((set, get) => ({
  user: null,
  token: null,
  loading: false,
  error: null,
  _notificationsSubscribed: false,

  clearError: () => set({ error: null }),
  setUser: (user) => set({ user }),

  register: async (userData) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post(`${USER_API_ENDPOINT}/register`, userData, { headers: { 'Content-Type': 'application/json' } });
      set({ loading: false });
      if (!res.data.success) throw new Error(res.data.message);
      return res.data;
    } catch (err) {
      let msg = err.response?.data?.message || err.message;
      if (msg?.toLowerCase().includes('email') && msg?.toLowerCase().includes('exists')) msg = 'Email already exists. Please use a different email.';
      set({ loading: false, error: msg });
      throw new Error(msg);
    }
  },

  login: async ({ email, password }) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post(`${USER_API_ENDPOINT}/login`, { email, password });
  try { await firebasePasswordSignInOrCreate(auth, email, password); } catch {/* ignore */}
      let user = normalizeUser(res.data.user, auth.currentUser?.uid);
      if (user && !user.profilePicture && user.profile?.profilePhoto) user.profilePicture = user.profile.profilePhoto;
    // canonical id ensured
      set({ user, token: res.data.token, loading: false });
    // CHANGE: ensure users/{id} doc exists & firebaseUid stored
      const ensureFirestoreUserDoc = async (u) => { 
        if (!u?.id) return;
        try {
          if (!auth.currentUser) return;
          if (!u.firebaseUid && auth.currentUser?.uid) { set({ user: { ...u, firebaseUid: auth.currentUser.uid } }); u = get().user; }
          if (!u.firebaseUid || u.firebaseUid !== auth.currentUser.uid) return;
          const userRef = doc(db, 'users', u.id);
          await setDoc(userRef, { firebaseUid: u.firebaseUid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
          if (!get()._notificationsSubscribed) {
            try { const { useNotificationStore } = await import('./useNotificationStore'); useNotificationStore.getState().subscribe(); set({ _notificationsSubscribed: true }); } catch {/* ignore */}
          }
        } catch (e) {
          // silent
        }
      };
      //retries to avoid race conditions
    [300,1000,2500,6000].forEach(ms => setTimeout(() => ensureFirestoreUserDoc(get().user), ms)); 

      if (import.meta.env.VITE_ENABLE_FIREBASE_CHAT === 'true') {
        eagerFirebaseLink({ user, email, password, authInstance: auth, apiInstance: api, updateUser: (u) => set({ user: u }) });
        try { const { useChatStore } = await import('./useChatStore'); setTimeout(() => { try { useChatStore.getState().subscribeBlockedUsers(); } catch {/* ignore */} }, 800); } catch {/* ignore */}
      }

  setTimeout(() => { try { if (auth.currentUser) { set((state) => { if (state.user && state.user.firebaseUid !== auth.currentUser.uid) { return { user: { ...state.user, firebaseUid: auth.currentUser.uid } }; } return {}; }); } } catch {/* ignore */} }, 1200); // CHANGE: final reconciliation pass
      return res.data;
    } catch (err) {
      set({ loading: false, error: err.response?.data?.message || err.message });
      throw err;
    }
  },

  logout: async () => {
    try { const { useChatStore } = await import('./useChatStore'); useChatStore.getState().clearChat(); } catch {/* ignore */}
    try { await firebaseSignOut(auth); } catch {/* ignore */}
    set({ user: null, token: null, loading: false });
  },

  fetchUser: async () => {
    const { token } = get(); if (!token) return null;
    set({ loading: true, error: null });
    try {
      const res = await api.get(`${USER_API_ENDPOINT}/me`, { headers: { Authorization: `Bearer ${token}` } });
      let userData = normalizeUser(res.data.user, auth.currentUser?.uid);
      if (userData && !userData.profilePicture && userData.profile?.profilePhoto) userData.profilePicture = userData.profile.profilePhoto;
      if (userData?.profilePicture && !userData.profile?.profilePhoto) { userData.profile = userData.profile || {}; userData.profile.profilePhoto = userData.profilePicture; }
    // canonical id ensured
      set({ loading: false, user: userData });
      if (auth.currentUser && userData.firebaseUid !== auth.currentUser.uid) {
        setTimeout(() => {
          set((state) => {
            if (state.user && state.user.id === userData.id && state.user.firebaseUid !== auth.currentUser.uid) {
              return { user: { ...state.user, firebaseUid: auth.currentUser.uid } };
            }
            return {};
          });
          try {
            const u = get().user; if (u?.firebaseUid === auth.currentUser.uid) {
              const userRef = doc(db, 'users', u.id);
              getDoc(userRef).then(s => {
                if (!s.exists()) setDoc(userRef, { firebaseUid: u.firebaseUid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
                else if (s.data()?.firebaseUid !== u.firebaseUid) setDoc(userRef, { firebaseUid: u.firebaseUid, updatedAt: serverTimestamp() }, { merge: true });
              }).catch(() => { /* ignore */ });
            }
          } catch {/* ignore */}
        }, 300);
      }
      return userData;
    } catch (err) {
      set({ loading: false, user: null, token: null });
      return null;
    }
  },

  forceSyncFirebaseUid: async () => {
    const { user } = get(); if (!user) return;
    if (auth.currentUser && user.firebaseUid !== auth.currentUser.uid) set({ user: { ...user, firebaseUid: auth.currentUser.uid } });
  },

  updateProfilePicture: async (imageUrl) => {
    const { token, user } = get(); if (!token || !user) throw new Error('Authentication required');
    set({ loading: true, error: null });
    try {
      await api.put(`${USER_API_ENDPOINT}/profile/picture`, { profilePicture: imageUrl }, { headers: { Authorization: `Bearer ${token}` } });
      const updatedUser = { ...user, profilePicture: imageUrl, profile: { ...(user.profile || {}), profilePhoto: imageUrl } };
      set({ loading: false, user: updatedUser });
      return updatedUser;
    } catch (err) {
      set({ loading: false, error: err.response?.data?.message || err.message });
      throw err;
    }
  }
}), {
  name: 'auth-storage',
  partialize: (state) => ({ user: state.user, token: state.token })
}));

