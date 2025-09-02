// src/store/useAuthStore.js
import { create } from "zustand";
import { persist } from "zustand/middleware";
import axios from "axios";
import { USER_API_ENDPOINT } from "@/utils/data";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      loading: false,
      error: null,

      clearError: () => set({ error: null }),

      register: async (formData) => {
        set({ loading: true, error: null });
        try {
          const res = await axios.post(`${USER_API_ENDPOINT}/register`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
            withCredentials: true,
          });
          set({ loading: false });
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
            { email, password },
            { withCredentials: true }
          );
          set({ loading: false, user: res.data.user });
          return res.data.user;
        } catch (err) {
          set({ loading: false, error: err.response?.data?.message || err.message });
          throw err;
        }
      },

      logout: async () => {
        set({ loading: true, error: null });
        try {
          await axios.post(`${USER_API_ENDPOINT}/logout`, {}, { withCredentials: true });
          set({ user: null, loading: false });
        } catch (err) {
          set({ loading: false, error: err.response?.data?.message || err.message });
          throw err;
        }
      },

      fetchUser: async () => {
        set({ loading: true, error: null });
        try {
          const res = await axios.get(`${USER_API_ENDPOINT}/me`, { withCredentials: true });
          set({ loading: false, user: res.data.user });
          return res.data.user;
        } catch (err) {
          set({ loading: false, user: null });
          return null;
        }
      },
    }),
    {
      name: "auth-storage", // persist key
      partialize: (state) => ({ user: state.user }), // only persist user
    }
  )
);
