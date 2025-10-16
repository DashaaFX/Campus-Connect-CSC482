//Zustand store for authentication and related logics
//Dashnyam
// Try to integrate chat functionality with auth store
import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "@/utils/axios";
import { USER_API_ENDPOINT } from "@/utils/data";
import { auth } from "../../firebase";
import {  signOut as firebaseSignOut } from 'firebase/auth'; 

async function firebasePasswordSignInOrCreate(auth, email, password) {
  const { signInWithEmailAndPassword, createUserWithEmailAndPassword } = await import('firebase/auth');
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
      await createUserWithEmailAndPassword(auth, email, password);
    } else {
      throw err;
    }
  }
}

async function eagerFirebaseLink({ user, email, password, auth, api, featureFlagEnabled, updateUser }) {
  if (!featureFlagEnabled) return;
  // If already linked, skip
  if (user.firebaseUid && auth.currentUser) return;

  try {
    await firebasePasswordSignInOrCreate(auth, email, password);

    const idToken = await auth.currentUser.getIdToken();
    try {
      await api.post('/auth/firebase/verify', { token: idToken });
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[chat] verify skipped', e?.response?.data || e.message);
    }

    if (!user.firebaseUid) {
      const linkRes = await api.post('/auth/firebase/link', { token: idToken });
      if (linkRes.data?.user) {
        updateUser(linkRes.data.user); // update store
      }
    }
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[chat] eager link failed:', e.message);
  }
}

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      loading: false,
      error: null,

      clearError: () => set({ error: null }),

      setUser: (user) => set({ user }),

      register: async (userData) => {
        set({ loading: true, error: null });
        try {
          const res = await api.post(`${USER_API_ENDPOINT}/register`, userData, {
            headers: { "Content-Type": "application/json" },
          });
          set({ loading: false }); 
          if (!res.data.success) throw new Error(res.data.message);
          return res.data;
        } catch (err) {
          let errorMsg = err.response?.data?.message || err.message;
          if (errorMsg && errorMsg.toLowerCase().includes('user with this email already exists')) {
            errorMsg = 'Email already exists. Please use a different email.';
          }
          set({ loading: false, error: errorMsg });
          throw new Error(errorMsg);
        }
      },

      login: async ({ email, password }) => {
        set({ loading: true, error: null });
        try {
          const res = await api.post(
            `${USER_API_ENDPOINT}/login`,
            { email, password }
          );
          
          const user = res.data.user;
          if (!user.id && user._id) {
            user.id = user._id;
          }
          
          if (!user.profilePicture && user.profile?.profilePhoto) {
            user.profilePicture = user.profile.profilePhoto;
          }

          set({ user, token: res.data.token, loading: false });

          // Link firebase if feature flag enabled
          if (import.meta.env.VITE_ENABLE_FIREBASE_CHAT === 'true') {
            eagerFirebaseLink({
              user,
              email,
              password,
              auth,
              api,
              featureFlagEnabled: true,
              updateUser: (u) => set({ user: u })
            });
          }

          //Debug firebase linking - later
          setTimeout(async () => {
            try {
              if (auth.currentUser) {
                set((state) => {
                  if (state.user && state.user.firebaseUid !== auth.currentUser.uid) {
                    if (import.meta.env.DEV) {
                      console.warn('[auth] Reconciling stale firebaseUid. Stored=', state.user.firebaseUid, 'live=', auth.currentUser.uid);
                    }
                    return { user: { ...state.user, firebaseUid: auth.currentUser.uid } };
                  }
                  return {};
                });
              }
            } catch (e) {
              console.debug('[auth] reconciliation skipped', e.message);
            }
          }, 1200);
          return res.data;
        } catch (err) {
          set({ loading: false, error: err.response?.data?.message || err.message });
          throw err;
        }
      },

      logout: async () => {
        try {

          // Stop chat listeners when logging out
          const { useChatStore } = await import('./useChatStore');
          const chatState = useChatStore.getState();
          if (chatState._unsubscribeConversations) {
            try { chatState._unsubscribeConversations(); } catch {}
          }
          if (chatState._unsubscribeMessages) {
            try { chatState._unsubscribeMessages(); } catch {}
          }
          // Clear chat store state
          useChatStore.setState({
            _unsubscribeConversations: null,
            _unsubscribeMessages: null,
            conversations: [],
            activeConversationId: null,
            activeMessages: [],
          });
        } catch (e) {
          if (import.meta.env.DEV) console.debug('[auth] chat cleanup during logout skipped', e.message);
        }
        try { await firebaseSignOut(auth); } catch { /* ignore */ }

        set({ user: null, token: null, loading: false });
      },

      fetchUser: async () => {
        const { token } = get();
        if (!token) return null;
        
        set({ loading: true, error: null });
        try {
          const res = await api.get(`${USER_API_ENDPOINT}/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          // Ensure the user has consistent profile picture field
          const userData = res.data.user;
          if (!userData.profilePicture && userData.profile?.profilePhoto) {
            userData.profilePicture = userData.profile.profilePhoto;
          }
          // Also ensure profile.profilePhoto exists if we have profilePicture
          if (userData.profilePicture && !userData.profile?.profilePhoto) {
            userData.profile = userData.profile || {};
            userData.profile.profilePhoto = userData.profilePicture;
          }
 
          set({ loading: false, user: userData });

          // If Firebase session exists but user record missing or stale firebaseUid, reconcile locally
          if (auth.currentUser && userData.firebaseUid !== auth.currentUser.uid) {
            setTimeout(() => {
              set((state) => {
                if (state.user && state.user.id === userData.id && state.user.firebaseUid !== auth.currentUser.uid) {
                  if (import.meta.env.DEV) {
                    console.warn('[auth] fetchUser reconciliation: updating firebaseUid to live auth uid');
                  }
                  return { user: { ...state.user, firebaseUid: auth.currentUser.uid } };
                }
                return {};
              });
            }, 300);
          }
          return userData;
        } catch (err) {
          set({ loading: false, user: null, token: null });
          return null;
        }
      },

      forceSyncFirebaseUid: async () => {
        const { user } = get();
        if (!user) return;
        if (auth.currentUser && user.firebaseUid !== auth.currentUser.uid) {
          set({ user: { ...user, firebaseUid: auth.currentUser.uid } });
          if (import.meta.env.DEV) console.debug('[auth] forceSyncFirebaseUid applied');
        }
      },
      
      updateProfilePicture: async (imageUrl) => {
        const { token, user } = get();
        if (!token || !user) {
          throw new Error("Authentication required");
        }
        
        set({ loading: true, error: null });
        try {
          // Call the API to update profile picture
          const res = await api.put(
            `${USER_API_ENDPOINT}/profile/picture`,
            { profilePicture: imageUrl },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          const updatedUser = { 
            ...user, 
            profilePicture: imageUrl, 
            profile: { 
              ...(user.profile || {}), 
              profilePhoto: imageUrl 
            } 
          };
          
          set({ loading: false, user: updatedUser });
          return updatedUser;
        } catch (err) {
          set({ loading: false, error: err.response?.data?.message || err.message });
          throw err;
        }
      },
    }),
    {
      name: "auth-storage", 
      partialize: (state) => ({ user: state.user, token: state.token }), 
    }
  )
);

