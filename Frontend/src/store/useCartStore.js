import { create } from "zustand";
import { persist } from "zustand/middleware";
import axios from "axios";
import { CART_API_ENDPOINT } from "@/utils/data";

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      loading: false,
      error: null,

      fetchCart: async () => {
        set({ loading: true, error: null });
        try {
          const res = await axios.get(CART_API_ENDPOINT, { withCredentials: true });
          set({ items: res.data.items || [], loading: false });
        } catch (err) {
          set({ error: err.response?.data?.message || "Failed to load cart", loading: false });
        }
      },

      addToCart: async ({ productId, quantity = 1 }) => {
        set({ loading: true, error: null });
        try {
          const res = await axios.post(
            `${CART_API_ENDPOINT}/add`,
            { productId, quantity },
            { withCredentials: true }
          );
          set({ items: res.data.items || [], loading: false });
        } catch (err) {
          set({ error: err.response?.data?.message || "Failed to add to cart", loading: false });
        }
      },

      removeFromCart: async (productId) => {
        set({ loading: true, error: null });
        try {
          const res = await axios.delete(`${CART_API_ENDPOINT}/remove/${productId}`, { withCredentials: true });
          set({ items: res.data.items || [], loading: false });
        } catch (err) {
          set({ error: err.response?.data?.message || "Failed to remove from cart", loading: false });
        }
      },

      decreaseQuantity: async (productId) => {
        set({ loading: true, error: null });
        try {
          const res = await axios.patch(`${CART_API_ENDPOINT}/decrease/${productId}`, {}, { withCredentials: true });
          set({ items: res.data.items || [], loading: false });
        } catch (err) {
          set({ error: err.response?.data?.message || "Failed to update cart", loading: false });
        }
      },

      clearCart: async () => {
        set({ loading: true, error: null });
        try {
          const res = await axios.delete(`${CART_API_ENDPOINT}/clear`, { withCredentials: true });
          set({ items: res.data.items || [], loading: false });
        } catch (err) {
          set({ error: err.response?.data?.message || "Failed to clear cart", loading: false });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "cart-storage",
      partialize: (state) => ({ items: state.items }),
    }
  )
);
