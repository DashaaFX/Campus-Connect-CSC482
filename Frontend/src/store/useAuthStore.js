// src/store/useAuthStore.js
import { create } from "zustand";
import { persist } from "zustand/middleware";
import axios from "axios";
import { USER_API_ENDPOINT } from "@/utils/data";

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
          const res = await axios.post(`${USER_API_ENDPOINT}/register`, userData, {
            headers: { "Content-Type": "application/json" },
          });
          set({ user: res.data.user, token: res.data.token, loading: false });
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
          const res = await axios.post(
            `${USER_API_ENDPOINT}/login`,
            { email, password }
          );
          
          // Make sure the user object has the id in a consistent format
          const user = res.data.user;
          if (!user.id && user._id) {
            user.id = user._id;
          }
          
          // Ensure profile picture is set consistently
          if (!user.profilePicture && user.profile?.profilePhoto) {
            user.profilePicture = user.profile.profilePhoto;
          }

          set({ user: user, token: res.data.token, loading: false });
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
          const res = await axios.get(`${USER_API_ENDPOINT}/me`, {
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
          const res = await axios.put(
            `${USER_API_ENDPOINT}/profile/picture`,
            { profilePicture: imageUrl },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          // Update the user in state with the new profile picture
          const updatedUser = { 
            ...user, 
            profilePicture: imageUrl, // Update the main profilePicture field
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
      name: "auth-storage", // persist key
      partialize: (state) => ({ user: state.user, token: state.token }), // persist user and token
    }
  )
);

