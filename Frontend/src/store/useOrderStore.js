import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "@/utils/axios";
import { ORDER_API_ENDPOINT } from "@/utils/data";
import { useAuthStore } from "@/store/useAuthStore";

// Order store to manage user orders and sales
export const useOrderStore = create((set) => ({
  orders: [],
  loading: false,
  error: null,
  redirecting: false,

  clearError: () => set({ error: null }),

  fetchOrders: async () => {
    set({ loading: true, error: null });
    const token = useAuthStore.getState().token;
    try {
      const res = await api.get(`${ORDER_API_ENDPOINT}/my-orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ orders: res.data.orders || [], loading: false });
      return res.data.orders || [];
    } catch (err) {
      set({ loading: false, error: err.response?.data?.message || err.message });
      return [];
    }
  },

  fetchSales: async () => {
    set({ loading: true, error: null });
    const token = useAuthStore.getState().token;
    try {
      const res = await api.get(`${ORDER_API_ENDPOINT}/seller-orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ orders: res.data.orders || [], loading: false });
      return res.data.orders || [];
    } catch (err) {
      set({ loading: false, error: err.response?.data?.message || err.message });
      return [];
    }
  },

  placeOrder: async (orderData) => {
    set({ loading: true, error: null });
    const token = useAuthStore.getState().token;
    try {
      const res = await api.post(`${ORDER_API_ENDPOINT}/create`, orderData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ loading: false });
      return res.data;
    } catch (err) {
      set({ loading: false, error: err.response?.data?.message || err.message });
      throw err;
    }
  },

  updateOrderStatus: async (orderId, status) => {
    set({ loading: true, error: null });
    const token = useAuthStore.getState().token;
    try {
      const res = await api.put(
        `${ORDER_API_ENDPOINT}/${orderId}/status`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      set((state) => ({
        orders: state.orders.map((o) =>
          o._id === orderId || o.id === orderId ? { ...o, status } : o
        ),
        loading: false,
      }));
      return res.data;
    } catch (err) {
      set({ loading: false, error: err.response?.data?.message || err.message });
      throw err;
    }
  },

  cancelOrder: async (orderId) => {
    // Buyer cancellation convenience wrapper
    return await useOrderStore.getState().updateOrderStatus(orderId, 'cancelled');
  },

  createCheckoutSession: async (orderId) => {
    if (!orderId) return;
    set({ error: null, redirecting: true });
    const token = useAuthStore.getState().token;
    try {
      const res = await api.post(`${ORDER_API_ENDPOINT}/${orderId}/checkout-session`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const sessionUrl = res.data?.sessionUrl || res.data?.data?.sessionUrl;
      if (sessionUrl) {
        window.location.assign(sessionUrl);
      } else {
        set({ redirecting: false, error: 'Failed to obtain checkout session.' });
      }
    } catch (err) {
      set({ redirecting: false, error: err.response?.data?.message || err.message });
    }
  }
  ,
  refundOrder: async (orderId, amount) => {
    if (!orderId) return;
    const token = useAuthStore.getState().token;
    try {
      const res = await api.post(`${ORDER_API_ENDPOINT}/${orderId}/refund`, { amount }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // optimistic: paymentStatus changes via webhook; add initiated event local marker if needed
      return res.data;
    } catch (err) {
      throw err;
    }
  }
}),
{
  name: "order-storage",
  partialize: (state) => ({ orders: state.orders }),
});

export default useOrderStore;