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
          
          console.log('Login successful - User data:', user);
          console.log('Token received:', res.data.token ? 'Yes' : 'No');
          
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
          set({ loading: false, user: res.data.user });
          return res.data.user;
        } catch (err) {
          set({ loading: false, user: null, token: null });
          return null;
        }
      },
    }),
    {
      name: "auth-storage", // persist key
      partialize: (state) => ({ user: state.user, token: state.token }), // persist user and token
    }
  )
);
