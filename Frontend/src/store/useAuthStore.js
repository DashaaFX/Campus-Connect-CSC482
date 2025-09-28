//Zustand store for authentication and related logics
//Dashnyam

import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "@/utils/axios";
import { USER_API_ENDPOINT } from "@/utils/data";
import { auth } from "@/../firebase"; // adjust path because firebase.js is at Frontend root
import { signInWithEmailAndPassword } from 'firebase/auth';

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
          console.error('Registration error:', err.response?.data || err.message);
          set({ loading: false, error: err.response?.data?.message || err.message });
          throw err;
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

          set({ user: user, token: res.data.token, loading: false });

          // Optional Firebase integration behind feature flag
          if (import.meta.env.VITE_ENABLE_FIREBASE_CHAT === 'true') {
            try {
              // Sign into Firebase (only if not already signed in or different user)
              if (!auth.currentUser || auth.currentUser.email !== email) {
                await signInWithEmailAndPassword(auth, email, password);
              }
              const idToken = await auth.currentUser.getIdToken();

              // Verify token with backend (non-blocking on failure)
              try {
                await api.post(`${USER_API_ENDPOINT}/firebase/verify`, { token: idToken });
              } catch (verifyErr) {
                console.warn('Firebase verify failed (continuing):', verifyErr.response?.data || verifyErr.message);
              }

              // Attempt linking if user not already linked (firebaseUid missing)
              if (!user.firebaseUid) {
                try {
                  const linkRes = await api.post(`${USER_API_ENDPOINT}/firebase/link`, { token: idToken });
                  if (linkRes.data?.user) {
                    set({ user: { ...linkRes.data.user } });
                  }
                } catch (linkErr) {
                  console.warn('Firebase link skipped:', linkErr.response?.data || linkErr.message);
                }
              }
            } catch (firebaseAuthErr) {
              console.warn('Firebase sign-in skipped:', firebaseAuthErr.message);
            }
          }
          return res.data;
        } catch (err) {
          set({ loading: false, error: err.response?.data?.message || err.message });
          throw err;
        }
      },

      logout: async () => {
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
          return userData;
        } catch (err) {
          set({ loading: false, user: null, token: null });
          return null;
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

